from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import crud
from app.db.models import UserRow
from app.db.session import get_db
from app.deps import get_current_user
from app.models.schemas import UserPreferences, UserProfile

router = APIRouter()


@router.get("/users/me", response_model=UserProfile)
def me(user: UserRow = Depends(get_current_user)):
    return crud.user_to_profile(user)


@router.get("/users/me/preferences", response_model=UserPreferences)
def get_prefs(user: UserRow = Depends(get_current_user)):
    return crud.get_preferences(user)


@router.patch("/users/me/preferences", response_model=UserPreferences)
def patch_prefs(
    body: UserPreferences,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud.patch_preferences(db, user, body)
