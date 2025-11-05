from fastapi import APIRouter, File, HTTPException, Path, Query, UploadFile, Form, Depends
# from fastapi.responses import HTMLResponse
from typing import Dict, Any
from fastapi.responses import JSONResponse, RedirectResponse
from datetime import datetime
import json
from src.services.validation_service import ValidationService
from src.services.embedding import extract_text, chunk_text, get_embeddings
from src.interface.types import ALLOWED_TYPES, DEFAULT_FILE_TYPES
from src.schemas.invoice import Invoice
from src.schemas.hr import HR
from cryptography.fernet import Fernet
from src.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.file_record import FileRecord, FileType, FileEmbedding
from sqlalchemy.future import select

SECRET_KEY = Fernet.generate_key()
fernet = Fernet(SECRET_KEY)

def encrypt_file(data: bytes) -> bytes:
    return fernet.encrypt(data)

def decrypt_file(data: bytes) -> bytes:
    return fernet.decrypt(data)

router = APIRouter()
CUSTOM_SCHEMAS: Dict[str, Dict[str, str]] = {}

DEFAULT_SCHEMAS = { 
    "hr": HR,
    "invoice": Invoice
}

@router.post("/register-file-type/")
async def register_file_type(
    file_type: str = Form(...), 
    metadata_schema: str = Form(...), 
    db: AsyncSession = Depends(get_db)):

    result = await db.execute(select(FileType).where(FileType.file_type == file_type))
    existing = result.scalars().first()
    if existing:
        return JSONResponse(
            status_code=409,
            content={
                "description": f"File type '{file_type}' is already registered.",
                "schema": existing.metadata_schema,
                "next_endpoint": f"/metadata/{file_type}"
            }
        )
    
    try:
        schema_dict: Dict[str, str] = json.loads(metadata_schema)
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={
                "description": "Invalid JSON schema",
                "next_endpoint": "/register-file-type/"
            }
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
            metadata_schema=schema_dict
        )

        db.add(create_file_type)
        await db.commit()
        await db.refresh(create_file_type)
        return {
            "message": "File type registered successfully.",
            "schema": schema_dict,
            "next_endpoint": f"/metadata/{file_type}"
        }
    else:
        raise HTTPException(
            status_code=400,
            detail="Schema cannot be empty"
        )


def save_metadata(file_path: str, metadata: Dict):
    metadata_path = file_type + ".json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=4)


@router.post("/metadata/{file_type}/")
async def upload_file(
    file_type: str = Path(...),
    metadata_value: str = Form(...),
    file: UploadFile = File(...), 
    folder_path: str = Form(""),
    session: AsyncSession = Depends(get_db)):

    result = await session.execute(select(FileType).where(FileType.file_type == file_type))
    schema_record = result.scalars().first()
    if not schema_record:
        return JSONResponse(
            status_code=404,
            content={
                "description": f"File type '{file_type}' is not registered.",
                "next_endpoint": "/register-file-type/"
            }
        )

    try:
        value: Dict[str, Any] = json.loads(metadata_value)
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=400,
            content={
                "description": "Invalid JSON",
                "next_endpoint": f"/metadata/{file_type}/"
            }
        )
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
                "next_endpoint": f"/metadata/{file_type}/"
            }
        )


    raw_data = await file.read()
    encrypted_data = encrypt_file(raw_data)

    new_file = FileRecord(
        file_name=file.filename,
        file_type=schema_record,
        file_data=encrypted_data,
        file_metadata=validated_metadata,
        folder_path=folder_path if folder_path else "/"
    )

    session.add(new_file)
    await session.commit()
    await session.refresh(new_file)

    raw_text = extract_text(file.filename, raw_data)
    if raw_text:
        combined = raw_text+" "+json.dumps(validated_metadata)
        chunks = chunk_text(combined)
        embeddings = get_embeddings(chunks)
        for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            session.add(FileEmbedding(
                file_id=new_file.id,
                chunk_index=idx,
                chunk_text=chunk,
                embedding=emb
            ))
        await session.commit()

    return {
        "file_id": str(new_file.id),
        "file_type": file_type,
        "metadata": validated_metadata,
        "timestamp": new_file.uploaded_at.isoformat(),
        "file_name": file.filename,
        "folder_path": new_file.folder_path
    }


from sqlalchemy import text
from pgvector import Vector as PgVector
from sqlalchemy import select
from google.generativeai import embed_content

@router.get("/search/")
async def search_files(query: str, file_type: str | None=Query(default=None), session: AsyncSession = Depends(get_db)):
    q_emb = embed_content(
        model="gemini-embedding-001",
        content=query,
        output_dimensionality=768
    )["embedding"]

    if file_type:
        file_ids_subq = (
            select(FileRecord.id)
            .join(FileType, FileRecord.file_type_id == FileType.id)
            .where(FileType.file_type == file_type)
        )

        stmt = (
            select(
                FileEmbedding.file_id,
                FileEmbedding.chunk_text,
                (1 - FileEmbedding.embedding.l2_distance(q_emb)).label("similarity")
            )
            .where(FileEmbedding.file_id.in_(file_ids_subq))
            .order_by(FileEmbedding.embedding.l2_distance(q_emb))
            .limit(5)
        )
    else:
        stmt = (
            select(
                FileEmbedding.file_id,
                FileEmbedding.chunk_text,
                (1 - FileEmbedding.embedding.l2_distance(q_emb)).label("similarity")
            )
            .order_by(FileEmbedding.embedding.l2_distance(q_emb))
            .limit(5)
        )
    result = await session.execute(stmt)
    rows = result.mappings().all()
    return [dict(r) for r in rows]
    
