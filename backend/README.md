# RAGHive Backend

Glass-box multi-agent RAG API for the RAGHive Next.js frontend.

Pipeline: **Planner → Extractor → QA/Reasoning**, streamed to the UI as Server-Sent Events that match `src/lib/api/types.ts`.

This service is a sibling of `Raghive-frontend`. The planner node is derived from `MA_RAG_BTP` (entity extraction, attention proxy, XAI verifier) and rebuilt to the v2 verification-report contract (no blended self-reported confidence).

## Quick start

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

Frontend (`.env.local` in `frontend/`):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_USE_MOCK_AUTH=true
```

Then `pnpm dev` inside `frontend/` on port 3000.

## Architecture

| Piece | Implementation |
|---|---|
| API | FastAPI `/api/v1/*`, CORS for the Next app |
| Auth | Firebase ID tokens, or `AUTH_DISABLED=true` for local demo |
| Persistence | SQLite (chats, messages, traces, HITL checkpoints, preferences) |
| Orchestration | LangGraph `StateGraph` + SSE runner |
| Generation | vLLM / OpenAI-compatible `ChatOpenAI` (Qwen2.5-32B-Instruct) |
| Reference entities | GLiNER + LLM ensemble (`source: gliner \| llm \| both`) |
| Attention XAI | Independent Qwen2.5-0.5B proxy, loaded then unloaded |
| Retrieval | ChromaDB + BGE-M3 (falls back to MiniLM / hashing) |
| Dual scoring | Cosine `S_sim` + NormEnsembleXAI `A_ens` (gradient proxy + leave-one-out) |
| HITL | Pause after a second planner FAIL; resume via `POST .../resume` |

## HITL timeout policy

If the planner escalates to human review and nobody resumes, the chat **stays pending**. There is no silent auto-proceed. A forced-LOW caveat would hide a failed verification; the glass-box UI is supposed to show that pause.

## Modes

- **`RAGHIVE_MODE=lite`** (default on Windows/dev): GLiNER / 0.5B / BGE-M3 are optional. Missing pieces degrade with documented fallbacks. The JSON contract is unchanged.
- **`RAGHIVE_MODE=full`**: GLiNER must load or the process raises. Intended for the A100 cluster.

`GET /api/v1/health` reports which backends are actually live.

## Ingest

`POST /api/v1/documents` accepts PDF / TXT / MD. Text is chunked with page metadata and upserted into ChromaDB. A seed corpus (Nolan/Inception, grid security, NormEnsembleXAI) is loaded on first boot so the demo queries retrieve real chunks.
