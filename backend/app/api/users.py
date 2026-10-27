from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import crud
from app.db.models import UserRow
from app.db.session import get_db
from app.deps import get_current_user
from app.models.schemas import UpdateProfileBody, UserPreferences, UserProfile

router = APIRouter()


@router.get("/users/me", response_model=UserProfile)
def me(user: UserRow = Depends(get_current_user)):
    return crud.user_to_profile(user)


@router.patch("/users/me", response_model=UserProfile)
def patch_me(
    body: UpdateProfileBody,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = (body.displayName or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="displayName cannot be empty")
    row = crud.update_profile(db, user, display_name=name[:256])
    return crud.user_to_profile(row)


@router.delete("/users/me")
def delete_me(
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    crud.delete_user_data(db, user)
    return {"ok": True}


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
