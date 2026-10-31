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


def clean_document_text(text: str) -> str:
    """Normalize raw document/PDF text, fixing separated numbering, isolated bullets, and spurious whitespace."""
    if not text:
        return ""
    # Normalize list numbers and bullet prefixes followed by newlines (common PyMuPDF artifact: "1.\nTransaction")
    normalized = re.sub(r"(?m)^([0-9]+\.|\([a-z0-9]+\)|[•\-\*])\s*\n+", r"\1 ", text)
    # Collapse horizontal whitespace
    normalized = re.sub(r"[ \t]+", " ", normalized)
    # Collapse multiple blank lines
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def _split_into_parent_chunks(
    text: str,
    tokenizer=None,
    parent_tokens: int = 280,
    parent_overlap_tokens: int = 40,
) -> list[str]:
    """Segment document text into larger, coherent parent paragraphs (800-1200 characters / ~250-300 tokens)."""
    cleaned = clean_document_text(text)
    if not cleaned:
        return []

    parent_max_chars = parent_tokens * 4
    parent_overlap_chars = parent_overlap_tokens * 4

    if len(cleaned) <= parent_max_chars:
        return [cleaned]

    # Split on natural boundaries: double newlines, list items, or major headings
    raw_blocks = [
        b.strip()
        for b in re.split(r"\n\s*\n|\n(?=[0-9]+\.|\bLEC-\b|[A-Z][a-z]+:)", cleaned)
        if b.strip()
    ]
    if not raw_blocks:
        raw_blocks = [cleaned]

    parents: list[str] = []
    current_chunk: list[str] = []
    current_len = 0

    for b in raw_blocks:
        b_len = len(b)
        if current_len + b_len > parent_max_chars and current_chunk:
            parent_text = "\n".join(current_chunk).strip()
            parents.append(parent_text)

            # Preserve overlap context
            overlap_items = []
            acc_len = 0
            for item in reversed(current_chunk):
                if acc_len + len(item) <= parent_overlap_chars:
                    overlap_items.insert(0, item)
                    acc_len += len(item)
                else:
                    break
            current_chunk = overlap_items
            current_len = acc_len

        if b_len > parent_max_chars:
            # Single giant block: split with sliding window
            step = max(1, parent_max_chars - parent_overlap_chars)
            for i in range(0, b_len, step):
                part = b[i : i + parent_max_chars].strip()
                if part:
                    parents.append(part)
                if i + parent_max_chars >= b_len:
                    break
        else:
            current_chunk.append(b)
            current_len += b_len

    if current_chunk:
        parent_text = "\n".join(current_chunk).strip()
        if not parents or parent_text != parents[-1]:
            parents.append(parent_text)

    return parents or [cleaned]


def _split_parent_into_children(
    parent_text: str,
    tokenizer=None,
    child_tokens: int = 70,
    child_overlap_tokens: int = 15,
) -> list[str]:
    """Subdivide a parent chunk into pinpoint semantic child chunks (150-300 characters / 1-3 dense sentences)."""
    cleaned = parent_text.strip()
    child_max_chars = child_tokens * 4
    child_overlap_chars = child_overlap_tokens * 4

    if len(cleaned) <= child_max_chars:
        return [cleaned]

    # Split along sentence boundaries or list items
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", cleaned) if s.strip()]
    if not sentences:
        return [cleaned]

    children: list[str] = []
    current_chunk: list[str] = []
    current_len = 0

    for s in sentences:
        s_len = len(s)
        if current_len + s_len > child_max_chars and current_chunk:
            child_text = " ".join(current_chunk).strip()
            children.append(child_text)
            current_chunk = []
            current_len = 0

        if s_len > child_max_chars:
            step = max(1, child_max_chars - child_overlap_chars)
            for i in range(0, s_len, step):
                part = s[i : i + child_max_chars].strip()
                if part:
                    children.append(part)
                if i + child_max_chars >= s_len:
                    break
        else:
            current_chunk.append(s)
            current_len += s_len

    if current_chunk:
        child_text = " ".join(current_chunk).strip()
        if not children or child_text != children[-1]:
            children.append(child_text)

    return children or [cleaned]


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
    chunk_tokens: int = 280,
    overlap_tokens: int = 40,
) -> list[dict[str, Any]]:
    """Small-to-Big (Parent-Child) chunking preserving structural Markdown/HTML tables.
    
    Creates:
      1. Parent Chunks: Logical paragraphs (800-1200 characters / ~250-300 tokens)
      2. Child Chunks: Pinpoint semantic units (150-300 characters / ~50-70 tokens)
    Child chunks are indexed for high-precision retrieval and resolve back to their parent context.
    """
    if not text or not text.strip():
        return []

    tokenizer = get_tokenizer()
    segments = _extract_tables_and_text(text)
    chunks: list[dict[str, Any]] = []
    chunk_counter = 0

    for seg_idx, (content, parsed_table) in enumerate(segments):
        if parsed_table is not None:
            # Structural table: preserved as a single self-contained parent/child entity
            raw_table_json = json.dumps(parsed_table, ensure_ascii=False)
            embed_text = _table_to_embedding_text(parsed_table)
            chunk_counter += 1
            tbl_id = chunk_id(source, page or chunk_counter, embed_text)
            chunks.append(
                {
                    "id": tbl_id,
                    "source": source,
                    "page": page or chunk_counter,
                    "text": embed_text,
                    "parent_id": tbl_id,
                    "parent_text": embed_text,
                    "child_index": 0,
                    "is_child": False,
                    "raw_table_json": raw_table_json,
                    "metadata": {
                        "source": str(source),
                        "page": int(page or chunk_counter),
                        "parent_id": tbl_id,
                        "parent_text": embed_text,
                        "child_index": 0,
                        "is_child": False,
                        "raw_table_json": raw_table_json,
                        "is_table": True,
                        "table_format": parsed_table.get("format", "unknown"),
                    },
                }
            )
        else:
            # Standard text: build Small-to-Big hierarchy
            parent_blocks = _split_into_parent_chunks(
                content,
                tokenizer=tokenizer,
                parent_tokens=chunk_tokens,
                parent_overlap_tokens=overlap_tokens,
            )
            for p_idx, parent_text in enumerate(parent_blocks):
                if len(parent_text.strip()) < 10:
                    continue
                chunk_counter += 1
                p_id = f"pchk-{chunk_id(source, page or chunk_counter, parent_text)}"
                
                child_blocks = _split_parent_into_children(
                    parent_text,
                    tokenizer=tokenizer,
                    child_tokens=70,
                    child_overlap_tokens=15,
                )
                for c_idx, child_text in enumerate(child_blocks):
                    if len(child_text.strip()) < 10:
                        continue
                    c_id = f"{p_id}_c{c_idx}"
                    chunks.append(
                        {
                            "id": c_id,
                            "source": source,
                            "page": page or chunk_counter,
                            "text": child_text,  # Indexed in vector store & BM25
                            "parent_id": p_id,
                            "parent_text": parent_text,  # Enclosing contextual paragraph
                            "child_index": c_idx,
                            "is_child": True,
                            "raw_table_json": None,
                            "metadata": {
                                "source": str(source),
                                "page": int(page or chunk_counter),
                                "parent_id": p_id,
                                "parent_text": parent_text,
                                "child_index": c_idx,
                                "is_child": True,
                                "is_table": False,
                                "raw_table_json": None,
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
