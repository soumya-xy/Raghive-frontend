from __future__ import annotations

import json
from typing import Any, AsyncIterator


def sse_pack(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def sse_from_events(events: AsyncIterator[dict[str, Any]]) -> AsyncIterator[str]:
    async for event in events:
        yield sse_pack(event)
