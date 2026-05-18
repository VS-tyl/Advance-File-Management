import asyncio

from src.database import Base, engine
from src.models.file_record import FileEmbedding, FileRecord, FileType


async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


if __name__ == "__main__":
    asyncio.run(init_models())
