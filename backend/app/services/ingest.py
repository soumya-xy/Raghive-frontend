from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Optional

from app.config import get_settings
from app.services.vectorstore import chunk_id, upsert_chunks

logger = logging.getLogger(__name__)

_tokenizer = None
_tokenizer_model = None

MD_TABLE_REGEX = re.compile(
    r"(?:(?<=\n)|^)(?:\|[^\n]+\|\r?\n)(?:\|[-:\s|]+\|\r?\n)(?:\|[^\n]+\|\r?\n?)+",
    re.MULTILINE,
)
HTML_TABLE_REGEX = re.compile(r"<table[\s\S]*?</table>", re.IGNORECASE)


def get_tokenizer():
    """Module-level singleton HuggingFace tokenizer for BGE-M3 token-aware chunking."""
    global _tokenizer, _tokenizer_model
    settings = get_settings()
    target_model = settings.embedding_model or "BAAI/bge-m3"

    if _tokenizer is not None and _tokenizer_model == target_model:
        return _tokenizer

    try:
        from transformers import AutoTokenizer

        _tokenizer = AutoTokenizer.from_pretrained(target_model, use_fast=True)
        _tokenizer_model = target_model
        return _tokenizer
    except Exception as exc:
        logger.warning("Failed to load tokenizer for %s: %s. Using heuristic tokenizer fallback.", target_model, exc)
        return None


def _parse_markdown_table(raw_table: str) -> dict[str, Any]:
    lines = [line.strip() for line in raw_table.strip().splitlines() if line.strip()]
    if len(lines) < 2:
        return {"type": "table", "format": "markdown", "headers": [], "rows": [], "raw": raw_table}

    headers = [c.strip() for c in lines[0].strip("|").split("|")]
    # lines[1] is the delimiter row (|---|---|)
    rows: list[list[str]] = []
    for line in lines[2:]:
        if "|" in line:
            cells = [c.strip() for c in line.strip("|").split("|")]
            rows.append(cells)

    return {
        "type": "table",
        "format": "markdown",
        "headers": headers,
        "rows": rows,
        "raw": raw_table,
    }


def _parse_html_table(raw_table: str) -> dict[str, Any]:
    headers = [
        re.sub(r"<[^>]+>", "", th).strip()
        for th in re.findall(r"<th[^>]*>(.*?)</th>", raw_table, re.IGNORECASE | re.DOTALL)
    ]
    tr_matches = re.findall(r"<tr[^>]*>(.*?)</tr>", raw_table, re.IGNORECASE | re.DOTALL)
    rows: list[list[str]] = []
    for tr in tr_matches:
        tds = [
            re.sub(r"<[^>]+>", "", td).strip()
            for td in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.IGNORECASE | re.DOTALL)
        ]
        if tds:
            rows.append(tds)

    return {
        "type": "table",
        "format": "html",
        "headers": headers,
        "rows": rows,
        "raw": raw_table,
    }


def _table_to_embedding_text(parsed: dict[str, Any]) -> str:
    headers = parsed.get("headers") or []
    rows = parsed.get("rows") or []
    lines: list[str] = []

    if headers:
        lines.append(f"Table columns: {', '.join(headers)}.")

    for idx, row in enumerate(rows, start=1):
        if headers and len(headers) == len(row):
            row_repr = ", ".join(f"{h}: {val}" for h, val in zip(headers, row) if val)
        else:
            row_repr = ", ".join(val for val in row if val)
        if row_repr:
            lines.append(f"Row {idx}: {row_repr}")

    return "\n".join(lines) if lines else parsed.get("raw", "")


def _token_aware_split_text(
    text: str,
    tokenizer,
    chunk_tokens: int = 450,
    overlap_tokens: int = 50,
) -> list[str]:
    clean_text = text.strip()
    if not clean_text:
        return []

    if tokenizer is None:
        # Character-based approximation if HF tokenizer is unavailable (~4 chars/token)
        char_size = chunk_tokens * 4
        char_overlap = overlap_tokens * 4
        step = max(1, char_size - char_overlap)
        return [clean_text[i : i + char_size].strip() for i in range(0, len(clean_text), step) if clean_text[i : i + char_size].strip()]

    token_ids = tokenizer.encode(clean_text, add_special_tokens=False)
    if len(token_ids) <= chunk_tokens:
        return [clean_text]

    chunks: list[str] = []
    step = max(1, chunk_tokens - overlap_tokens)
    for start in range(0, len(token_ids), step):
        end = min(start + chunk_tokens, len(token_ids))
        window_tokens = token_ids[start:end]
        decoded = tokenizer.decode(window_tokens, skip_special_tokens=True).strip()
        if decoded:
            chunks.append(decoded)
        if end >= len(token_ids):
            break

    return chunks


def _extract_tables_and_text(text: str) -> list[tuple[str, Optional[dict[str, Any]]]]:
    """Segment document text into interleaved blocks of plain text and structural tables."""
    spans: list[tuple[int, int, str, dict[str, Any]]] = []

    # Detect HTML tables
    for m in HTML_TABLE_REGEX.finditer(text):
        raw = m.group(0)
        parsed = _parse_html_table(raw)
        spans.append((m.start(), m.end(), raw, parsed))

    # Detect Markdown tables
    for m in MD_TABLE_REGEX.finditer(text):
        # Ensure it does not overlap with already matched HTML tables
        start, end = m.start(), m.end()
        if any(s <= start < e or s < end <= e for s, e, _, _ in spans):
            continue
        raw = m.group(0)
        parsed = _parse_markdown_table(raw)
        spans.append((start, end, raw, parsed))

    # Sort table spans by occurrence
    spans.sort(key=lambda x: x[0])

    segments: list[tuple[str, Optional[dict[str, Any]]]] = []
    cursor = 0
    for start, end, raw, parsed in spans:
        if start > cursor:
            plain_part = text[cursor:start]
            if plain_part.strip():
                segments.append((plain_part, None))
        segments.append((raw, parsed))
        cursor = end

    if cursor < len(text):
        tail = text[cursor:]
        if tail.strip():
            segments.append((tail, None))

    return segments if segments else [(text, None)]


def chunk_text(
    text: str,
    *,
    source: str,
    page: Optional[int],
    chunk_tokens: int = 450,
    overlap_tokens: int = 50,
) -> list[dict[str, Any]]:
    """Token-aware chunking preserving structural Markdown/HTML tables in metadata."""
    if not text or not text.strip():
        return []

    tokenizer = get_tokenizer()
    segments = _extract_tables_and_text(text)
    chunks: list[dict[str, Any]] = []
    chunk_idx = 0

    for content, parsed_table in segments:
        if parsed_table is not None:
            # Structural table: map structured representation to raw_table_json metadata
            raw_table_json = json.dumps(parsed_table, ensure_ascii=False)
            embed_text = _table_to_embedding_text(parsed_table)
            chunk_idx += 1
            chunks.append(
                {
                    "id": chunk_id(source, page or chunk_idx, embed_text),
                    "source": source,
                    "page": page or chunk_idx,
                    "text": embed_text,
                    "raw_table_json": raw_table_json,
                    "metadata": {
                        "raw_table_json": raw_table_json,
                        "is_table": True,
                        "table_format": parsed_table.get("format", "unknown"),
                    },
                }
            )
        else:
            # Standard text: apply token-aware splitting (450 target tokens, 50 overlap)
            sub_chunks = _token_aware_split_text(
                content,
                tokenizer=tokenizer,
                chunk_tokens=chunk_tokens,
                overlap_tokens=overlap_tokens,
            )
            for piece in sub_chunks:
                if len(piece.strip()) < 10:
                    continue
                chunk_idx += 1
                chunks.append(
                    {
                        "id": chunk_id(source, page or chunk_idx, piece),
                        "source": source,
                        "page": page or chunk_idx,
                        "text": piece,
                        "raw_table_json": None,
                        "metadata": {
                            "raw_table_json": None,
                            "is_table": False,
                        },
                    }
                )

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
