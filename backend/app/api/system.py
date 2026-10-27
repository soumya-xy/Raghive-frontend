from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.session import get_db
from app.deps import get_current_user
from app.db.models import UserRow
from app.models.schemas import AuthSessionBody, UserProfile
from app.db import crud
from app.services.embeddings import embedding_backend
from app.services.llm import llm_available
from app.services.reranker import reranker_backend
from app.services.vectorstore import collection_count

router = APIRouter()


@router.get("/health")
def health():
    settings = get_settings()
    return {
        "status": "ok",
        "mode": settings.raghive_mode,
        "llm": llm_available(),
        "embeddings": embedding_backend(),
        "reranker": reranker_backend(),
        "chromaChunks": collection_count(),
        "genModel": settings.gen_model_name,
        "inferenceUrl": settings.local_inference_url,
    }


@router.post("/auth/session", response_model=UserProfile)
def auth_session(
    body: AuthSessionBody,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = crud.ensure_user(
        db,
        user.id,
        email=body.email or user.email,
        display_name=body.displayName or user.display_name,
        avatar_url=body.avatarUrl or user.avatar_url,
    )
    return crud.user_to_profile(row)
