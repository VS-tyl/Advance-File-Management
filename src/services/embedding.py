import json
import logging
import time
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted
from src.services.chunking_service import ChunkingService
import os

logger = logging.getLogger(__name__)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

EMBED_BATCH_SIZE = 100
MAX_RETRIES = 4
INITIAL_BACKOFF = 30


def chunk_text(text: str, technique: str):
    chunker = ChunkingService.get_chunker(technique, text)
    return chunker


def _embed_with_retry(batch: list[str]) -> list[list[float]]:
    """Call embed_content for a batch, retrying on 429 with exponential backoff."""
    backoff = INITIAL_BACKOFF
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = genai.embed_content(
                model="gemini-embedding-001",
                content=batch,
                output_dimensionality=768,
            )
            return resp["embedding"]
        except ResourceExhausted as exc:
            if attempt == MAX_RETRIES:
                raise
            wait = backoff
            retry_info = getattr(exc, "retry_delay", None)
            if retry_info and hasattr(retry_info, "seconds"):
                wait = max(retry_info.seconds, backoff)
            logger.warning(
                "Gemini 429 — waiting %ds before retry %d/%d",
                wait, attempt + 1, MAX_RETRIES,
            )
            time.sleep(wait)
            backoff = min(backoff * 2, 120)
    return []


def get_embeddings(chunks: list[str]) -> list[list[float]]:
    embeddings: list[list[float]] = []
    for i in range(0, len(chunks), EMBED_BATCH_SIZE):
        batch = chunks[i : i + EMBED_BATCH_SIZE]
        embeddings.extend(_embed_with_retry(batch))
    return embeddings