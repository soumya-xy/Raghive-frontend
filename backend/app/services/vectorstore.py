from __future__ import annotations

import hashlib
import json
import logging
import os
from typing import Any, Optional

import numpy as np

os.environ.setdefault("ANONYMIZED_TELEMETRY", "false")
os.environ.setdefault("CHROMA_ANONYMIZED_TELEMETRY", "false")

from app.config import get_settings
from app.services.embeddings import embed_texts

logger = logging.getLogger(__name__)

_collection = None
_chroma_client = None


def _invalidate_downstream_caches() -> None:
    """Invalidate in-memory BM25 index and semantic pipeline cache after corpus changes."""
    try:
        from app.services.hybrid_retriever import get_bm25_index
        get_bm25_index().invalidate()
    except Exception:
        pass

    try:
        from app.services.semantic_cache import get_pipeline_cache
        get_pipeline_cache().clear()
    except Exception:
        pass


def get_collection(force_reload: bool = False):
    global _collection, _chroma_client
    import chromadb

    settings = get_settings()

    if not force_reload and _collection is not None:
        try:
            # Probe that the cached collection UUID is valid in the underlying persistent store
            _ = _collection.count()
            return _collection
        except Exception as exc:
            logger.warning("Cached Chroma collection invalidated (%s). Refreshing handle...", exc)
            _collection = None
            _chroma_client = None

    try:
        if _chroma_client is None:
            _chroma_client = chromadb.PersistentClient(path=settings.chroma_path)
        _collection = _chroma_client.get_or_create_collection(
            name=settings.chroma_collection,
            metadata={"hnsw:space": "cosine"},
            embedding_function=None,
        )
    except Exception as exc:
        logger.warning("Error fetching collection (%s). Forcing clean client reconnect...", exc)
        _chroma_client = chromadb.PersistentClient(path=settings.chroma_path)
        _collection = _chroma_client.get_or_create_collection(
            name=settings.chroma_collection,
            metadata={"hnsw:space": "cosine"},
            embedding_function=None,
        )

    return _collection


def reset_collection():
    """Reset and re-create collection if dimensionality changes (e.g. 384 -> 1024)."""
    global _collection, _chroma_client
    import chromadb

    settings = get_settings()
    _chroma_client = chromadb.PersistentClient(path=settings.chroma_path)
    try:
        _chroma_client.delete_collection(settings.chroma_collection)
        logger.info("Deleted outdated Chroma collection %s", settings.chroma_collection)
    except Exception as exc:
        logger.debug("Notice while deleting collection: %s", exc)

    _collection = _chroma_client.get_or_create_collection(
        name=settings.chroma_collection,
        metadata={"hnsw:space": "cosine"},
        embedding_function=None,
    )
    _invalidate_downstream_caches()
    logger.info("Initialized fresh Chroma collection %s", settings.chroma_collection)
    return _collection


def collection_count() -> int:
    try:
        return int(get_collection().count())
    except Exception:
        try:
            return int(get_collection(force_reload=True).count())
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

    metadatas: list[dict[str, Any]] = []
    for c in chunks:
        meta: dict[str, Any] = {
            "source": str(c.get("source") or "unknown"),
            "page": int(c.get("page") or 0),
            "parent_id": str(c.get("parent_id") or c.get("id") or ""),
            "parent_text": str(c.get("parent_text") or c.get("text") or ""),
            "child_index": int(c.get("child_index") or 0),
            "is_child": bool(c.get("is_child", False)),
        }
        raw_tbl = c.get("raw_table_json")
        if raw_tbl is None and isinstance(c.get("metadata"), dict):
            raw_tbl = c["metadata"].get("raw_table_json")

        if raw_tbl:
            meta["raw_table_json"] = str(raw_tbl) if not isinstance(raw_tbl, str) else raw_tbl
            meta["is_table"] = True
        else:
            meta["is_table"] = False

        metadatas.append(meta)

    try:
        col.upsert(
            ids=[c["id"] for c in chunks],
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )
    except Exception as exc:
        err_str = str(exc).lower()
        if "dimension" in err_str:
            logger.warning("Dimension mismatch during upsert (%s). Auto-resetting Chroma collection...", exc)
            col = reset_collection()
            col.upsert(
                ids=[c["id"] for c in chunks],
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
            )
        elif "does not exist" in err_str or "invalid" in err_str:
            logger.warning("Collection was deleted or invalidated (%s). Reloading fresh handle...", exc)
            col = get_collection(force_reload=True)
            col.upsert(
                ids=[c["id"] for c in chunks],
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
            )
        else:
            raise exc

    _invalidate_downstream_caches()
    return len(chunks)


def query_chunks(query: str, top_k: int = 12) -> list[dict[str, Any]]:
    col = get_collection()
    try:
        total = col.count()
    except Exception as exc:
        logger.warning("Stale collection in query_chunks (%s). Forcing reload...", exc)
        col = get_collection(force_reload=True)
        total = col.count()

    if total == 0:
        return []

    settings = get_settings()
    q_emb = embed_texts([query])[0].tolist()

    try:
        result = col.query(
            query_embeddings=[q_emb],
            n_results=min(top_k, max(1, total)),
            include=["documents", "metadatas", "distances"],
        )
    except Exception as exc:
        err_str = str(exc).lower()
        if "does not exist" in err_str or "invalid" in err_str:
            logger.warning("Collection does not exist during query (%s). Reloading...", exc)
            col = get_collection(force_reload=True)
            result = col.query(
                query_embeddings=[q_emb],
                n_results=min(top_k, max(1, col.count())),
                include=["documents", "metadatas", "distances"],
            )
        elif "dimension" in err_str:
            logger.warning("Chroma dimension mismatch during query (%s). Resetting collection to align with active model...", exc)
            col = reset_collection()
            if settings.seed_on_startup:
                try:
                    from app.services.seed_corpus import seed_if_empty

                    seed_if_empty()
                except Exception as seed_exc:
                    logger.debug("Auto re-seed failed: %s", seed_exc)
            if col.count() == 0:
                return []
            result = col.query(
                query_embeddings=[q_emb],
                n_results=min(top_k, max(1, col.count())),
                include=["documents", "metadatas", "distances"],
            )
        else:
            raise exc

    docs = (result.get("documents") or [[]])[0]
    metas = (result.get("metadatas") or [[]])[0]
    ids = (result.get("ids") or [[]])[0]
    dists = (result.get("distances") or [[]])[0]
    out: list[dict[str, Any]] = []

    for i, text in enumerate(docs):
        dist = float(dists[i]) if i < len(dists) else 1.0
        sim = float(np.clip(1.0 - dist, 0.0, 1.0))
        meta = metas[i] if i < len(metas) else {}
        page = meta.get("page") or 0
        raw_table_json = meta.get("raw_table_json")
        cid = ids[i] if i < len(ids) else chunk_id(str(meta.get("source")), page, text)
        parent_id = meta.get("parent_id") or cid
        parent_text = meta.get("parent_text") or text
        child_index = int(meta.get("child_index") or 0)
        is_child = bool(meta.get("is_child", False))

        out.append(
            {
                "id": cid,
                "source": meta.get("source") or "unknown",
                "page": int(page) if page else None,
                "text": text,
                "parent_id": parent_id,
                "parent_text": parent_text,
                "child_index": child_index,
                "is_child": is_child,
                "similarity_score": sim,
                "raw_table_json": raw_table_json,
                "metadata": meta,
            }
        )
    return out
