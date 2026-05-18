import os
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

from src.database import engine, Base

# Model imports trigger SQLAlchemy model registration so create_all picks them up.
from src.models.file_record import FileEmbedding, FileRecord, FileType  # noqa: F401

from src.api.upload import router as upload_router
from src.api.ai_fill import router as ai_fill_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(lifespan=lifespan)


def _split_csv_env(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


cors_origins = _split_csv_env(os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"))
trusted_hosts = _split_csv_env(os.getenv("TRUSTED_HOSTS", "localhost,127.0.0.1"))
allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=trusted_hosts or ["localhost", "127.0.0.1"],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthcheck() -> dict:
    return {"status": "ok"}


app.include_router(upload_router)
app.include_router(ai_fill_router)
