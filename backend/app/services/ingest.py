from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Optional

from app.config import get_settings
from app.services.vectorstore import chunk_id, upsert_chunks


def chunk_text(text: str, *, source: str, page: Optional[int], size: int = 700, overlap: int = 120) -> list[dict[str, Any]]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    chunks = []
    start = 0
    idx = 0
    while start < len(text):
        end = min(len(text), start + size)
        piece = text[start:end].strip()
        if piece:
            idx += 1
            chunks.append(
                {
                    "id": chunk_id(source, page or idx, piece),
                    "source": source,
                    "page": page or idx,
                    "text": piece,
                }
            )
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return chunks


def ingest_plaintext(text: str, filename: str, page: Optional[int] = None) -> int:
    chunks = chunk_text(text, source=filename, page=page)
    return upsert_chunks(chunks)


def ingest_pdf_bytes(data: bytes, filename: str) -> int:
    try:
        import fitz  # PyMuPDF
    except ImportError as exc:
        raise RuntimeError("PyMuPDF is required for PDF ingestion") from exc
    doc = fitz.open(stream=data, filetype="pdf")
    chunks: list[dict[str, Any]] = []
    for i, page in enumerate(doc, start=1):
        text = page.get_text("text") or ""
        chunks.extend(chunk_text(text, source=filename, page=i))
    return upsert_chunks(chunks)


def save_upload(filename: str, data: bytes) -> Path:
    settings = get_settings()
    folder = Path(settings.upload_dir)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / filename
    path.write_bytes(data)
    return path


def ingest_file(filename: str, data: bytes) -> int:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return ingest_pdf_bytes(data, filename)
    text = data.decode("utf-8", errors="ignore")
    return ingest_plaintext(text, filename)
