from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chats import router as chats_router
from app.api.documents import router as documents_router
from app.api.system import router as system_router
from app.api.users import router as users_router
from app.config import get_settings
from app.db.session import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_path).mkdir(parents=True, exist_ok=True)
    init_db()
    if settings.seed_on_startup:
        from app.services.seed_corpus import seed_if_empty

        seed_if_empty()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="RAGHive API",
        version="1.0.0",
        description="Glass-box Planner → Extractor → QA backend for the RAGHive frontend.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_api_route("/", lambda: {"service": "raghive", "docs": "/docs", "health": "/api/v1/health"}, methods=["GET"])
    app.include_router(system_router, prefix="/api/v1")
    app.include_router(users_router, prefix="/api/v1")
    app.include_router(chats_router, prefix="/api/v1")
    app.include_router(documents_router, prefix="/api/v1")
    return app


app = create_app()
