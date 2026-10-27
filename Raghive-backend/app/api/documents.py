from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db import crud
from app.db.models import UserRow
from app.db.session import get_db
from app.deps import get_current_user
from app.services.ingest import ingest_file, save_upload
from app.services.vectorstore import collection_count

router = APIRouter()


@router.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    filename = file.filename or "upload.txt"
    save_upload(filename, data)
    try:
        n = ingest_file(filename, data)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    crud.record_document(db, user.id, filename, n)
    return {
        "filename": filename,
        "chunkCount": n,
        "collectionSize": collection_count(),
    }
