from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.crud import ensure_user
from app.db.models import UserRow
from app.db.session import get_db
from app.utils.firebase_auth import verify_id_token

DEMO_USER_ID = "usr_raghive_demo_101"


@dataclass
class AuthUser:
    id: str
    email: str = ""
    display_name: str = "Researcher"
    avatar_url: Optional[str] = None


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> UserRow:
    settings = get_settings()
    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()

    if settings.auth_disabled:
        claims = verify_id_token(token) if token else {
            "uid": DEMO_USER_ID,
            "email": "researcher@lnmiit.ac.in",
            "name": "Dr. Soumya Jain",
        }
        if not claims:
            claims = {
                "uid": DEMO_USER_ID,
                "email": "researcher@lnmiit.ac.in",
                "name": "Dr. Soumya Jain",
            }
        return ensure_user(
            db,
            user_id=str(claims.get("uid") or DEMO_USER_ID),
            email=str(claims.get("email") or ""),
            display_name=str(claims.get("name") or "Researcher"),
            avatar_url=claims.get("picture"),
        )

    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    claims = verify_id_token(token)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")
    return ensure_user(
        db,
        user_id=str(claims.get("uid")),
        email=str(claims.get("email") or ""),
        display_name=str(claims.get("name") or "Researcher"),
        avatar_url=claims.get("picture"),
    )
