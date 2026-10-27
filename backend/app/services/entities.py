"""
Reference entity extraction — GLiNER + LLM ensemble.

Terminology is binding: these are *reference entities*, never "ground truth".
GLiNER is an independently-run extractor, not a hand-labeled set.
Adapted from MA_RAG_BTP/utils/ground_truth_extractor.py.
"""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from app.config import get_settings
from app.services.llm import get_raw_openai, llm_available, parse_json_list

_gliner_model = None
_gliner_attempted = False


def get_gliner():
    """Module-level GLiNER singleton. Raises in full mode on load failure."""
    global _gliner_model, _gliner_attempted
    if _gliner_attempted:
        return _gliner_model
    _gliner_attempted = True
    settings = get_settings()
    try:
        from gliner import GLiNER

        _gliner_model = GLiNER.from_pretrained("urchade/gliner_medium-v2.1")
        return _gliner_model
    except Exception as exc:
        if settings.is_full_mode:
            raise RuntimeError(
                "GLiNER failed to load and RAGHIVE_MODE=full - reference entities are load-bearing."
            ) from exc
        _gliner_model = None
        return None


def extract_dynamic_labels(query: str) -> list[str]:
    fallback = ["person", "organization", "location", "date", "work", "concept", "standard"]
    if not llm_available():
        return fallback
    try:
        client = get_raw_openai()
        settings = get_settings()
        response = client.chat.completions.create(
            model=settings.gen_model_name,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Given this query, what entity types are critical to answer it? "
                        "Return a JSON list of strings only. "
                        f"Query: {query}"
                    ),
                }
            ],
            temperature=0.0,
        )
        labels = parse_json_list(response.choices[0].message.content or "")
        labels = [str(x) for x in labels if isinstance(x, str)]
        return labels or fallback
    except Exception:
        return fallback


def extract_llm_keywords(query: str) -> list[dict[str, Any]]:
    if not llm_available():
        return _heuristic_keywords(query)
    try:
        client = get_raw_openai()
        settings = get_settings()
        response = client.chat.completions.create(
            model=settings.gen_model_name,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Extract key named entities and domain terms from this query. "
                        'Return JSON list of {"text": "...", "label": "..."}. '
                        f"Query: {query}"
                    ),
                }
            ],
            temperature=0.0,
        )
        items = parse_json_list(response.choices[0].message.content or "")
        out = []
        for item in items:
            if isinstance(item, str):
                out.append({"text": item, "label": "keyword", "source": "llm", "score": 1.0})
            elif isinstance(item, dict) and item.get("text"):
                out.append(
                    {
                        "text": str(item["text"]),
                        "label": str(item.get("label") or "keyword"),
                        "source": "llm",
                        "score": 1.0,
                    }
                )
        return out or _heuristic_keywords(query)
    except Exception:
        return _heuristic_keywords(query)


def _heuristic_keywords(query: str) -> list[dict[str, Any]]:
    # Capitalized spans + quoted terms — lite-mode stand-in for the LLM extractor.
    found: list[str] = []
    for m in re.finditer(r"\"([^\"]+)\"|'([^']+)'", query):
        found.append(m.group(1) or m.group(2))
    for m in re.finditer(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b", query):
        found.append(m.group(1))
    for m in re.finditer(r"\b([A-Z]{2,}(?:[-\s]?\d+)?)\b", query):
        found.append(m.group(1))
    stop = {"Who", "What", "When", "Where", "Why", "How", "The", "A", "An"}
    out = []
    seen = set()
    for text in found:
        key = text.lower()
        if key in seen or text in stop or len(text) < 2:
            continue
        seen.add(key)
        out.append({"text": text, "label": "keyword", "source": "llm", "score": 0.7})
    return out


def extract_gliner_entities(query: str, labels: list[str], gliner_model) -> list[dict[str, Any]]:
    if gliner_model is None or not labels:
        return []
    entities = gliner_model.predict_entities(query, labels)
    results = []
    for ent in entities:
        results.append(
            {
                "text": ent["text"],
                "start": ent["start"],
                "end": ent["end"],
                "label": ent["label"],
                "source": "gliner",
                "score": ent.get("score", 1.0),
            }
        )
    return results


def map_to_token_positions(text_spans: list[dict[str, Any]], query: str, tokenizer) -> list[dict[str, Any]]:
    try:
        encoding = tokenizer(query, return_offsets_mapping=True, add_special_tokens=False)
        offsets = encoding["offset_mapping"]
        if hasattr(offsets, "tolist"):
            offsets = offsets.tolist()
    except Exception:
        tokens = re.findall(r"\S+", query)
        offsets = []
        pos = 0
        for tok in tokens:
            idx = query.find(tok, pos)
            if idx < 0:
                idx = pos
            offsets.append((idx, idx + len(tok)))
            pos = idx + len(tok)

    mapped = []
    for span in text_spans:
        text = span["text"]
        start_char = span.get("start", -1)
        end_char = span.get("end", -1)
        if start_char == -1 or end_char == -1:
            start_char = query.lower().find(text.lower())
            if start_char != -1:
                end_char = start_char + len(text)
        if start_char == -1:
            continue
        token_positions = []
        for idx, pair in enumerate(offsets):
            tok_start, tok_end = int(pair[0]), int(pair[1])
            if tok_start < end_char and tok_end > start_char:
                token_positions.append(idx)
        if token_positions:
            copy = {k: v for k, v in span.items() if k not in ("start", "end")}
            copy["token_positions"] = token_positions
            mapped.append(copy)
    return mapped


def _merge_sources(mapped: list[dict[str, Any]]) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, Any]] = {}
    for span in mapped:
        key = span["text"].strip().lower()
        if key not in buckets:
            buckets[key] = span
            continue
        existing = buckets[key]
        srcs = {existing.get("source"), span.get("source")}
        if "gliner" in srcs and "llm" in srcs:
            existing["source"] = "both"
        elif "gliner" in srcs:
            existing["source"] = "gliner"
        else:
            existing["source"] = existing.get("source") or span.get("source")
        existing["token_positions"] = sorted(
            set(existing.get("token_positions", []) + span.get("token_positions", []))
        )
    return list(buckets.values())


def extract_reference_entities(query: str, tokenizer) -> list[dict[str, Any]]:
    gliner_model = get_gliner()
    labels = extract_dynamic_labels(query)
    gliner_results = extract_gliner_entities(query, labels, gliner_model)
    llm_results = extract_llm_keywords(query)
    combined = gliner_results + llm_results
    mapped = map_to_token_positions(combined, query, tokenizer)
    return _merge_sources(mapped)
