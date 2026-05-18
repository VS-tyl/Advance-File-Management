import json
import logging
import mimetypes
import os
import uuid
from pathlib import Path as FilePath
from typing import Dict, Any

from cryptography.fernet import Fernet
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Path,
    Query,
    Response,
    UploadFile,
)
from fastapi.responses import JSONResponse
from sqlalchemy import delete as sa_delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import google.generativeai as genai

from src.database import get_db, AsyncSessionLocal
from src.interface.types import ALLOWED_TYPES
from src.models.file_record import FileEmbedding, FileRecord, FileType
from src.schemas.hr import HR
from src.schemas.invoice import Invoice
from src.services.adapter_parsing_service import AdapterParsingService
from src.services.chunking_service import ChunkingService
from src.services.embedding import chunk_text, get_embeddings

# Load .env from project root for host-based development.
# In Docker the env vars are injected by Compose, so this is a no-op.
load_dotenv(FilePath(__file__).resolve().parent.parent.parent / ".env")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Fernet encryption
# ---------------------------------------------------------------------------
_key = os.getenv("FERNET_SECRET_KEY")
if not _key:
    raise RuntimeError("FERNET_SECRET_KEY is not set. Add it to .env")
fernet = Fernet(_key.encode())

# ---------------------------------------------------------------------------
# Gemini (embeddings) config
# ---------------------------------------------------------------------------
_gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not _gemini_key:
    raise RuntimeError("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set. Add it to .env")
genai.configure(api_key=_gemini_key)


def encrypt_file(data: bytes) -> bytes:
    return fernet.encrypt(data)


def decrypt_file(data: bytes) -> bytes:
    return fernet.decrypt(data)


router = APIRouter()

DEFAULT_SCHEMAS = {
    "hr": HR,
    "invoice": Invoice,
}
CUSTOM_SCHEMAS: Dict[str, Dict[str, str]] = {}


# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------
async def _process_embeddings(
    file_id,
    raw_data: bytes,
    filename: str,
    validated_metadata: dict,
    technique: str,
):
    """Runs after the upload response is sent. Uses raw (unencrypted) bytes."""
    try:
        raw_text = AdapterParsingService.get_adapter(FilePath(filename).suffix, raw_data)
        if not raw_text:
            return
        combined = raw_text + " " + json.dumps(validated_metadata)
        chunks = chunk_text(combined, technique)
        embeddings = get_embeddings(chunks)
        async with AsyncSessionLocal() as session:
            for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                session.add(FileEmbedding(
                    file_id=file_id,
                    chunk_index=idx,
                    chunk_text=chunk,
                    embedding=emb,
                ))
            await session.commit()
    except Exception:
        logger.exception("Background embedding failed for file %s", file_id)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/register-file-type/")
async def register_file_type(
    file_type: str = Form(...),
    metadata_schema: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(FileType).where(FileType.file_type == file_type))
    existing = result.scalars().first()
    if existing:
        return JSONResponse(
            status_code=409,
            content={
                "description": f"File type '{file_type}' is already registered.",
                "schema": existing.metadata_schema,
                "next_endpoint": f"/metadata/{file_type}",
            },
        )

    try:
        schema_dict: Dict[str, str] = json.loads(metadata_schema)
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={
                "description": "Invalid JSON schema",
                "next_endpoint": "/register-file-type/",
            },
        )

    if schema_dict:
        for field, spec in schema_dict.items():
            if isinstance(spec, str):
                dtype = spec.strip().lower()
                spec = {"type": dtype, "required": False}
                schema_dict[field] = spec
            elif isinstance(spec, dict):
                dtype = spec.get("type", "").strip().lower()
                if not dtype:
                    raise HTTPException(status_code=400, detail=f"Field '{field}' missing 'type'")
            else:
                raise HTTPException(status_code=400, detail=f"Field '{field}' spec must be string or object")

        if dtype not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported type '{dtype}' for field '{field}'.")

        create_file_type = FileType(
            file_type=file_type,
            metadata_schema=schema_dict,
        )

        db.add(create_file_type)
        await db.commit()
        await db.refresh(create_file_type)
        return {
            "message": "File type registered successfully.",
            "schema": schema_dict,
            "next_endpoint": f"/metadata/{file_type}",
        }
    else:
        raise HTTPException(
            status_code=400,
            detail="Schema cannot be empty",
        )


def save_metadata(file_path: str, metadata: Dict):
    metadata_path = file_path + ".json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=4)


@router.post("/metadata/{file_type}/")
async def upload_file(
    background_tasks: BackgroundTasks,
    file_type: str = Path(...),
    metadata_value: str = Form(...),
    file: UploadFile = File(...),
    folder_path: str = Form(""),
    session: AsyncSession = Depends(get_db),
    technique: str = Form(..., description=f"Available chunking techniques: {list(ChunkingService.chunkers.keys())}"),
):
    result = await session.execute(select(FileType).where(FileType.file_type == file_type))
    schema_record = result.scalars().first()
    if not schema_record:
        return JSONResponse(
            status_code=404,
            content={
                "description": f"File type '{file_type}' is not registered.",
                "next_endpoint": "/register-file-type/",
            },
        )

    try:
        value: Dict[str, Any] = json.loads(metadata_value)
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={
                "description": "Invalid JSON",
                "next_endpoint": f"/metadata/{file_type}/",
            },
        )

    from src.services.validation_service import ValidationService

    errors = {}
    validated_metadata = {}
    validation_service = ValidationService()
    for field, spec in schema_record.metadata_schema.items():
        dtype = (spec["type"] if isinstance(spec, dict) else spec).strip().lower()
        required = bool(spec.get("required", False)) if isinstance(spec, dict) else False
        default = spec.get("default") if isinstance(spec, dict) else None
        value_field = value.get(field)
        if value_field is None:
            if required and default is None:
                errors[field] = "This field is required but missing"
                continue
            if default is not None:
                validated_metadata[field] = default
                continue
            validated_metadata[field] = None
            continue
        try:
            validated_metadata[field] = validation_service.check_type(dtype, value_field)
        except Exception:
            errors[field] = f"Invalid value '{value_field}' for field '{field}' of type '{dtype}'."

    if errors:
        return JSONResponse(
            status_code=422,
            content={
                "errors": errors,
                "next_endpoint": f"/metadata/{file_type}/",
            },
        )

    raw_data = await file.read()
    encrypted_data = encrypt_file(raw_data)

    new_file = FileRecord(
        file_name=file.filename,
        file_type=schema_record,
        file_data=encrypted_data,
        file_metadata=validated_metadata,
        folder_path=folder_path if folder_path else "/",
    )

    session.add(new_file)
    await session.commit()
    await session.refresh(new_file)

    background_tasks.add_task(
        _process_embeddings,
        new_file.id,
        raw_data,
        file.filename,
        validated_metadata,
        technique,
    )

    return {
        "file_id": str(new_file.id),
        "file_type": file_type,
        "metadata": validated_metadata,
        "timestamp": new_file.uploaded_at.isoformat(),
        "file_name": file.filename,
        "folder_path": new_file.folder_path,
    }


@router.get("/files/")
async def list_files(session: AsyncSession = Depends(get_db)):
    """Return files and folders for the frontend file manager."""
    stmt = select(FileRecord).options(selectinload(FileRecord.file_type)).order_by(FileRecord.uploaded_at.desc())
    result = await session.execute(stmt)
    records = result.scalars().all()

    files_out = []
    for r in records:
        files_out.append({
            "id": str(r.id),
            "name": r.file_name,
            "file_type": r.file_type.file_type if r.file_type else None,
            "folder_path": r.folder_path or "/",
            "file_url": f"/files/{r.id}/download",
            "metadata_value": r.file_metadata or {},
            "file_size": len(r.file_data) if r.file_data else 0,
            "mime_type": None,
            "created_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
        })

    folders_out = []
    return {"files": files_out, "folders": folders_out}


@router.get("/files/{file_id}/download")
async def download_file(
    file_id: str,
    inline: bool = Query(False),
    session: AsyncSession = Depends(get_db),
):
    try:
        file_uuid = uuid.UUID(file_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file id")

    result = await session.execute(select(FileRecord).where(FileRecord.id == file_uuid))
    rec = result.scalars().first()
    if not rec:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        data = decrypt_file(rec.file_data)
    except Exception:
        data = rec.file_data

    guessed_type, _ = mimetypes.guess_type(rec.file_name or "")
    media = guessed_type or "application/octet-stream"

    disposition = "inline" if inline else "attachment"
    headers = {"Content-Disposition": f'{disposition}; filename="{rec.file_name}"'}

    return Response(content=data, media_type=media, headers=headers)


@router.delete("/files/{file_id}")
async def delete_file(file_id: str, session: AsyncSession = Depends(get_db)):
    try:
        file_uuid = uuid.UUID(file_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file id")

    result = await session.execute(select(FileRecord).where(FileRecord.id == file_uuid))
    rec = result.scalars().first()
    if not rec:
        raise HTTPException(status_code=404, detail="File not found")

    await session.execute(sa_delete(FileEmbedding).where(FileEmbedding.file_id == file_uuid))
    await session.delete(rec)
    await session.commit()

    return {"message": "File deleted", "file_id": file_id}


@router.get("/search/")
async def search_files(
    query: str,
    file_type: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
):
    q_emb = genai.embed_content(
        model="gemini-embedding-001",
        content=query,
        output_dimensionality=768,
    )["embedding"]

    distance = FileEmbedding.embedding.l2_distance(q_emb)

    base = (
        select(
            FileEmbedding.file_id.label("file_id"),
            FileRecord.file_name.label("file_name"),
            FileType.file_type.label("file_type"),
            FileEmbedding.chunk_text.label("chunk_text"),
            (1 - distance).label("similarity"),
            func.row_number()
            .over(partition_by=FileEmbedding.file_id, order_by=distance.asc())
            .label("rn"),
        )
        .select_from(FileEmbedding)
        .join(FileRecord, FileRecord.id == FileEmbedding.file_id)
        .join(FileType, FileType.id == FileRecord.file_type_id)
    )

    if file_type:
        base = base.where(FileType.file_type == file_type)

    # Keep only the best chunk per file (rn == 1), then rank files by similarity.
    best_per_file = base.subquery()
    stmt = (
        select(
            best_per_file.c.file_id,
            best_per_file.c.file_name,
            best_per_file.c.file_type,
            best_per_file.c.chunk_text,
            best_per_file.c.similarity,
        )
        .where(best_per_file.c.rn == 1)
        .order_by(best_per_file.c.similarity.desc())
        .limit(5)
    )

    result = await session.execute(stmt)
    rows = result.mappings().all()
    return [dict(r) for r in rows]


@router.get("/file-types/")
async def list_file_types(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(FileType))
    records = result.scalars().all()
    rows = []
    for r in records:
        rows.append({
            "id": str(r.id),
            "file_type": r.file_type,
            "metadata_schema": r.metadata_schema,
        })
    return rows