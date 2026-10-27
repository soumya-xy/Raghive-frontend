from __future__ import annotations

import hashlib
import math
import re
from typing import Optional, Sequence

import numpy as np

from app.config import get_settings

_embedder = None
_embedder_name = "hashing"
_dim = 384


def embedding_backend() -> str:
    _ensure_embedder()
    return _embedder_name


def _ensure_embedder() -> None:
    global _embedder, _embedder_name, _dim
    if _embedder is not None:
        return
    settings = get_settings()
    for model_name in (settings.embedding_model, "BAAI/bge-small-en-v1.5", "all-MiniLM-L6-v2"):
        try:
            from sentence_transformers import SentenceTransformer

            _embedder = SentenceTransformer(model_name)
            _embedder_name = model_name
            _dim = int(_embedder.get_sentence_embedding_dimension())
            return
        except Exception:
            continue
    _embedder = "hash"
    _embedder_name = "hashing-fallback"
    _dim = 384


def _hash_embed(text: str) -> np.ndarray:
    vec = np.zeros(_dim, dtype=np.float32)
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    if not tokens:
        tokens = ["empty"]
    for tok in tokens:
        digest = hashlib.sha256(tok.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "little") % _dim
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vec[idx] += sign
    n = float(np.linalg.norm(vec))
    return vec / n if n else vec


def embed_texts(texts: Sequence[str]) -> np.ndarray:
    _ensure_embedder()
    if not texts:
        return np.zeros((0, _dim), dtype=np.float32)
    if _embedder == "hash":
        return np.stack([_hash_embed(t) for t in texts], axis=0)
    vectors = _embedder.encode(list(texts), normalize_embeddings=True, show_progress_bar=False)
    return np.asarray(vectors, dtype=np.float32)


def embed_query(text: str) -> np.ndarray:
    return embed_texts([text])[0]


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.clip(np.dot(a, b) / denom, -1.0, 1.0))


def cosine01(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.clip((cosine(a, b) + 1.0) / 2.0, 0.0, 1.0))
