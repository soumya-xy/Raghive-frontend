from __future__ import annotations

from typing import Any, Optional

from app.config import get_settings

_firebase_app = None


def _init_firebase() -> None:
    global _firebase_app
    if _firebase_app is not None:
        return
    settings = get_settings()
    if settings.auth_disabled and not settings.firebase_credentials_file:
        return
    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError:
        return
    if firebase_admin._apps:
        _firebase_app = firebase_admin.get_app()
        return
    kwargs: dict[str, Any] = {}
    if settings.firebase_credentials_file:
        kwargs["credential"] = credentials.Certificate(settings.firebase_credentials_file)
    if settings.firebase_project_id:
        kwargs["options"] = {"projectId": settings.firebase_project_id}
    try:
        _firebase_app = firebase_admin.initialize_app(**kwargs) if kwargs else firebase_admin.initialize_app()
    except Exception:
        _firebase_app = None


def verify_id_token(token: str) -> Optional[dict[str, Any]]:
    settings = get_settings()
    if not token:
        return None
    if token == settings.mock_bearer_token:
        return {
            "uid": "usr_raghive_demo_101",
            "email": "researcher@lnmiit.ac.in",
            "name": "Dr. Soumya Jain",
            "picture": "https://api.dicebear.com/7.x/avataaars/svg?seed=RAGHive",
        }
    _init_firebase()
    try:
        from firebase_admin import auth as fb_auth

        return fb_auth.verify_id_token(token)
    except Exception:
        if settings.auth_disabled:
            return {
                "uid": "usr_raghive_demo_101",
                "email": "researcher@lnmiit.ac.in",
                "name": "Dr. Soumya Jain",
            }
        return None
