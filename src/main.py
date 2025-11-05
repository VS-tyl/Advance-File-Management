from fastapi import FastAPI
from src.api.upload import router
from fastapi.middleware.cors import CORSMiddleware
from src.database import engine, Base
import asyncio

app = FastAPI()
app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#cannot call Base.metadata.create_all(engine) directly on the async engine. Use run_sync

#asyncio.run() creates a brand-new event loop and runs your coroutine in it.

#But if you’re already inside a running loop (e.g. FastAPI with Uvicorn)
# asyncio.run() cannot nest another loop.


# async def init_models():
#     async with engine.begin() as conn:
#         await conn.run_sync(Base.metadata.create_all)

# asyncio.run(init_models())

app.include_router(router)
