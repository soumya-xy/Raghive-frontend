from __future__ import annotations

import hashlib
import os
from typing import Any, Optional

import numpy as np

os.environ.setdefault("ANONYMIZED_TELEMETRY", "false")
os.environ.setdefault("CHROMA_ANONYMIZED_TELEMETRY", "false")

from app.config import get_settings
from app.services.embeddings import embed_texts

_collection = None
_chroma_client = None


def get_collection():
    global _collection, _chroma_client
    if _collection is not None:
        return _collection
    import chromadb

    settings = get_settings()
    _chroma_client = chromadb.PersistentClient(path=settings.chroma_path)
    _collection = _chroma_client.get_or_create_collection(
        name=settings.chroma_collection,
        metadata={"hnsw:space": "cosine"},
        embedding_function=None,
    )
    return _collection


def collection_count() -> int:
    try:
        return int(get_collection().count())
    except Exception:
        return 0


def chunk_id(source: str, page: Optional[int], text: str) -> str:
    key = f"{source}|{page}|{text[:160]}"
    return "chk-" + hashlib.sha1(key.encode("utf-8")).hexdigest()[:10]


def upsert_chunks(chunks: list[dict[str, Any]]) -> int:
    if not chunks:
        return 0
    col = get_collection()
    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts).tolist()
    col.upsert(
        ids=[c["id"] for c in chunks],
        embeddings=embeddings,
        documents=texts,
        metadatas=[
            {
                "source": c.get("source") or "unknown",
                "page": int(c.get("page") or 0),
            }
            for c in chunks
        ],
    )
    return len(chunks)


def query_chunks(query: str, top_k: int = 12) -> list[dict[str, Any]]:
    col = get_collection()
    if col.count() == 0:
        return []
    q_emb = embed_texts([query])[0].tolist()
    result = col.query(
        query_embeddings=[q_emb],
        n_results=min(top_k, max(1, col.count())),
        include=["documents", "metadatas", "distances"],
    )
    docs = (result.get("documents") or [[]])[0]
    metas = (result.get("metadatas") or [[]])[0]
    ids = (result.get("ids") or [[]])[0]
    dists = (result.get("distances") or [[]])[0]
    out = []
    for i, text in enumerate(docs):
        dist = float(dists[i]) if i < len(dists) else 1.0
        # Chroma cosine distance is 1 - cosine similarity for some configs; clamp to 0..1 sim.
        sim = float(np.clip(1.0 - dist, 0.0, 1.0))
        meta = metas[i] if i < len(metas) else {}
        page = meta.get("page") or 0
        out.append(
            {
                "id": ids[i] if i < len(ids) else chunk_id(str(meta.get("source")), page, text),
                "source": meta.get("source") or "unknown",
                "page": int(page) if page else None,
                "text": text,
                "similarity_score": sim,
            }
        )
    return out
