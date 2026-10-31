from __future__ import annotations

import asyncio
import logging
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

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# PHASE 0 — B3: Model warmup on startup
# ---------------------------------------------------------------------------
# All three heavy models (BGE-M3 embedder, BGE-reranker-v2-gemma, Qwen XAI
# proxy) are loaded lazily on first use. Without warmup the *first* query after
# server start pays the full cold-load cost (30-60 s on CPU).
#
# _warmup_models() runs each model's load path once in background threads so
# that by the time the first real request arrives all weights are resident.
# Failures are logged as warnings — the server still starts and the models will
# lazy-load on demand as before.

async def _warmup_models() -> None:
    """Pre-load all inference models in background executor threads."""

    async def _try(label: str, fn):
        try:
            await asyncio.to_thread(fn)
            logger.info("[warmup] %s — ready.", label)
        except Exception as exc:
            logger.warning("[warmup] %s — failed to pre-load: %s", label, exc)

    # 1. BGE-M3 embedder
    def _load_embedder():
        from app.services.embeddings import embed_texts
        embed_texts(["warmup"])

    # 2. BGE-reranker-v2-gemma
    def _load_reranker():
        from app.services.reranker import rerank
        rerank("warmup", [{"id": "w0", "text": "warmup text", "similarity_score": 1.0}], top_n=1)

    # 3. Qwen2.5-0.5B XAI proxy (persistent singleton — A1)
    def _load_xai_proxy():
        from app.services.attention import _get_proxy_model
        _get_proxy_model()

    logger.info("[warmup] Starting background model pre-load...")
    await asyncio.gather(
        _try("BGE-M3 embedder", _load_embedder),
        _try("BGE-reranker-v2-gemma", _load_reranker),
        _try("Qwen XAI proxy", _load_xai_proxy),
    )
    logger.info("[warmup] All models pre-loaded. Server is ready for requests.")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_path).mkdir(parents=True, exist_ok=True)
    init_db()
    if settings.seed_on_startup:
        from app.services.seed_corpus import seed_if_empty

        seed_if_empty()

    # Kick off model warmup as a fire-and-forget background task.
    # Using create_task() (not await) so the server starts accepting requests
    # immediately while models load in the background.
    asyncio.create_task(_warmup_models())

    yield

    # Graceful shutdown: release the persistent Qwen XAI proxy singleton
    try:
        from app.services.attention import unload_proxy_model
        unload_proxy_model()
    except Exception:
        pass


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="RAGHive API",
        version="1.0.0",
        description="Glass-box Planner -> Extractor -> QA backend for the RAGHive frontend.",
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
