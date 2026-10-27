from __future__ import annotations

from typing import Any, Iterator, Optional

from app.config import get_settings

_raw_client = None
_chat_llm = None
_llm_reachable: Optional[bool] = None


def get_raw_openai():
    """Module-level singleton raw OpenAI client (vLLM-compatible)."""
    global _raw_client
    if _raw_client is None:
        from openai import OpenAI

        settings = get_settings()
        _raw_client = OpenAI(
            base_url=settings.local_inference_url,
            api_key=settings.local_api_key,
            timeout=60.0,
        )
    return _raw_client


def get_chat_llm():
    """Module-level singleton ChatOpenAI pointing at the shared vLLM pool."""
    global _chat_llm
    if _chat_llm is None:
        from langchain_openai import ChatOpenAI

        settings = get_settings()
        _chat_llm = ChatOpenAI(
            model=settings.gen_model_name,
            base_url=settings.local_inference_url,
            api_key=settings.local_api_key,
            temperature=0,
            timeout=90,
        )
    return _chat_llm


def llm_available() -> bool:
    global _llm_reachable
    if _llm_reachable is not None:
        return _llm_reachable
    settings = get_settings()
    try:
        import httpx

        base = settings.local_inference_url.rstrip("/")
        # Try standard OpenAI /v1/models first, then fallback to root /models
        urls = [base + "/models"]
        if base.endswith("/v1"):
            urls.append(base[:-3] + "/models")
        else:
            urls.append(base + "/v1/models")

        reachable = False
        with httpx.Client(timeout=5.0) as client:
            headers = {"Authorization": f"Bearer {settings.local_api_key}"}
            for u in urls:
                try:
                    r = client.get(u, headers=headers)
                    if r.status_code < 500:
                        reachable = True
                        break
                except Exception:
                    continue
        _llm_reachable = reachable
    except Exception:
        _llm_reachable = False
    return _llm_reachable


def chat_complete(system: str, user: str, *, temperature: float = 0.0) -> str:
    settings = get_settings()
    client = get_raw_openai()
    response = client.chat.completions.create(
        model=settings.gen_model_name,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
    )
    return (response.choices[0].message.content or "").strip()


def chat_stream(system: str, user: str, *, temperature: float = 0.0) -> Iterator[str]:
    settings = get_settings()
    client = get_raw_openai()
    stream = client.chat.completions.create(
        model=settings.gen_model_name,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            yield delta


def parse_json_list(text: str) -> list[Any]:
    import json
    import re

    content = text.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?", "", content).strip()
        if content.endswith("```"):
            content = content[:-3].strip()
    try:
        data = json.loads(content)
        return data if isinstance(data, list) else []
    except Exception:
        match = re.search(r"\[.*\]", content, re.S)
        if not match:
            return []
        try:
            data = json.loads(match.group(0))
            return data if isinstance(data, list) else []
        except Exception:
            return []
