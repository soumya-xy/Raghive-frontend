# RAGHive — Full Project Documentation

**RAGHive** is a glass-box, multi-agent, explainable RAG (Retrieval-Augmented Generation) research platform. Users ask a question and can see *why* the system produced an answer — the plan, retrieved evidence, verification checks, citations, and faithfulness — before (and while) the answer is generated.

This is **not** a waste / rag-picking product. **RAG** = Retrieval-Augmented Generation. **Hive** = a three-agent pipeline (Planner → Extractor → QA).

Associated with an academic research project at **LNMIIT**. The backend planner is derived from the `MA_RAG_BTP` thesis work and rebuilt for a verification-report contract (independent checks, not a blended self-reported confidence score).

| Part | Path | Role |
|------|------|------|
| Frontend | `frontend/` | Next.js web app (marketing, auth, chat workspace, XAI traces) |
| Backend | `backend/` | FastAPI RAG API (pipeline, vector store, persistence, SSE) |
| Docs | `docs/` | Architectural specs, agent build prompts, and contracts |

---

## 1. What the product does

1. A researcher signs in (Firebase, or a local demo identity).
2. They open a chat and ask a question (optionally after uploading PDF / TXT / MD into the corpus).
3. The backend runs **Planner → Extractor → QA/Reasoning**.
4. The UI streams live agent status, tokens, and a **reasoning trace**.
5. If the planner fails verification twice, the pipeline **pauses for human-in-the-loop (HITL)** — approve, edit sub-questions, or regenerate.
6. The user inspects attention matrices, dual-scored evidence chunks, faithfulness, citations, and an erasure test.

**Tagline (app metadata):** “See exactly why the AI said what it said, before it says it.”

---

## 2. How the two folders connect

```
Browser (localhost:3000)
        │  fetch + Authorization: Bearer <Firebase ID token or mock token>
        │  SSE over HTTP (ReadableStream), not WebSockets
        ▼
Next.js 16 frontend  ──►  FastAPI backend (localhost:8000)
  src/lib/api/client.ts      /api/v1/*
  src/lib/api/types.ts  ◄──► app/models/schemas.py
                             app/services/serialization.py  (camelCase traces)
```

| Concern | Frontend | Backend |
|---------|----------|---------|
| Base URL | `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`) | Uvicorn on port **8000** |
| CORS | Origin `http://localhost:3000` | `RAGHIVE_CORS_ORIGINS` |
| Auth | Firebase Auth ID token on `Authorization: Bearer …` | Firebase Admin verify, or `AUTH_DISABLED` demo user |
| Mock token | `mock_firebase_id_token_raghive_bearer_12345` | Same value in `MOCK_BEARER_TOKEN` |
| Shared contract | `src/lib/api/types.ts` (`StreamEvent`, `ReasoningTrace`, chats, prefs) | Pydantic DTOs + SSE events |
| Real-time | `consumeSse()` on `fetch` body | `text/event-stream` (`data: {json}\n\n`) |
| LLM (separate process) | Not called directly | vLLM / OpenAI-compatible server, typically `:8001` |

**Local run**

```text
# Backend
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Frontend (.env.local)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_USE_MOCK_AUTH=true

cd frontend
pnpm dev          # port 3000
```

Optional third process: vLLM (or any OpenAI-compatible server) at `LOCAL_INFERENCE_URL` (default `http://localhost:8001/v1`). If it is down and `RAGHIVE_ALLOW_HEURISTIC_LLM=true`, the pipeline still runs with heuristic plan/answer so the UI can be wired without a GPU.

---

## 3. Shared API contract

Prefix: `/api/v1` (except `GET /`).

### 3.1 REST

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Service info (`docs`, `health`) |
| GET | `/api/v1/health` | Mode, LLM reachability, embeddings, reranker, Chroma size |
| POST | `/api/v1/auth/session` | Upsert profile from current token |
| GET | `/api/v1/users/me` | Current user profile |
| GET / PATCH | `/api/v1/users/me/preferences` | Theme, density, trace flags, verification strictness |
| GET | `/api/v1/chats` | List non-archived chats (pinned first) |
| POST | `/api/v1/chats` | Create chat |
| GET | `/api/v1/chats/{id}` | Chat + messages |
| PATCH | `/api/v1/chats/{id}` | title / pinned / archived |
| DELETE | `/api/v1/chats/{id}` | Delete chat + cascade messages |
| GET | `/api/v1/chats/{id}/messages/{messageId}/trace` | Stored reasoning trace |
| POST | `/api/v1/chats/{id}/messages` | Send query — **SSE stream** |
| POST | `/api/v1/chats/{id}/messages/{messageId}/resume` | HITL resume — **SSE stream** |
| POST | `/api/v1/query` | Stateless SSE query (no chat persist) |
| POST | `/api/v1/documents` | Upload PDF / TXT / MD → chunk → Chroma |

Auth: every route except `GET /` and `GET /health` goes through `get_current_user` (Bearer token).

### 3.2 SSE event types

Emitted as `data: {json}\n\n`. Types match `StreamEvent` in the frontend:

| Event | Meaning |
|-------|---------|
| `agent_status` | Planner / extractor / QA: `started`, `retrying`, `done`, `awaiting_human_input` |
| `planner_verification` | Four independent planner checks |
| `planner_result` | Planner trace (steps, keywords, attention, confidence) |
| `extractor_result` | Dual-scored chunks + retrieval metrics |
| `token` | Streaming QA tokens |
| `qa_result` | Answer + faithfulness + citations + erasure |
| `awaiting_human_input` | HITL pause payload |
| `done` | `{ messageId, pending? }` |
| `error` | Pipeline error |

Query body includes `content` and `verificationStrictness` (`standard` | `thorough`).

---

## 4. Multi-agent pipeline (the core product)

### 4.1 Planner

- Decomposes the user question into a **sub-question dependency graph**.
- Extracts **reference entities** (GLiNER + LLM ensemble: `gliner` | `llm` | `both`).
- Runs **four independent verification checks** (not one blended confidence):
  1. **Entity coverage** — FAIL is a veto
  2. **Requirement coverage**
  3. **Self-consistency** — three plans, embedding agreement
  4. **Attention XAI** — proxy model saliency
- Confidence = unweighted fraction of checks passed (`HIGH` / `MEDIUM` / `LOW`).
- On first FAIL: **one automatic retry** with corrective feedback.
- On second FAIL: **HITL pause** (chat stays pending; no silent auto-proceed).

### 4.2 Extractor

- Retrieves chunks from **ChromaDB** per sub-question.
- Embeddings: **BAAI/bge-m3** → fallback `bge-small-en-v1.5` → `all-MiniLM-L6-v2` → hashing.
- Rerank: **cross-encoder/ms-marco-MiniLM-L-6-v2** (or similarity-only fallback).
- **Dual scoring (NormEnsembleXAI):** keep a chunk only if cosine similarity `S_sim` **and** attribution `A_ens` (gradient or cosine×lexical + leave-one-out) both clear thresholds.
- Reports Hit Rate, MRR, Context Precision.

### 4.3 QA / Reasoning

- Generates a grounded answer from kept chunks (Qwen2.5-32B-Instruct via vLLM, or heuristic in lite mode).
- **Faithfulness** from answer-token → evidence-token attention.
- Sentence-level **citations** (embedding alignment to chunks).
- **Erasure test:** mask keywords and see if the answer changes (thorough mode may regenerate).
- Streams tokens to the UI as they are produced.

### 4.4 Attention XAI proxy

vLLM 32B does not expose attentions. The backend loads **Qwen2.5-0.5B-Instruct**, aggregates the last 4 layers, then **unloads**. Lite fallback: lexical overlap matrix.

### 4.5 Strictness

`standard` vs `thorough` (`app/services/thresholds.py`): thorough raises similarity / XAI / grounding bars and `top_k`. The UI persists this locally and sends it on each query; verification settings also PATCH user preferences.

### 4.6 Orchestration note

A LangGraph `StateGraph` is defined in `app/agents/graph.py` (planner → extractor loop → finalize → QA) but the **live runner** is a custom SSE loop in `app/services/pipeline.py` so events can be emitted between steps. HITL state is stored as `pipeline_state_json` on the assistant message.

---

# Part A — Frontend (`Raghive-frontend`)

## A.1 Tech stack

| Area | Choice | Version / notes |
|------|--------|-----------------|
| Framework | **Next.js App Router** | `16.3.3` |
| UI | **React / React DOM** | `19.2.8` |
| Language | **TypeScript** | `^5` |
| Package manager | **pnpm** | `9.15.4` |
| Styling | **Tailwind CSS v4** + custom tokens | `^4` |
| Components | **Radix UI** (dialog, dropdown, tabs, tooltip, slot) | shadcn-like primitives, no `components.json` |
| Icons | **lucide-react** | `^1.37.0` |
| Animation | **motion** | `^13.1.1` |
| Toasts | **sonner** | `^2.0.8` |
| Forms | **react-hook-form** + **zod** + **@hookform/resolvers** | Auth pages |
| Server state | **TanStack React Query** | `^5.102.8` |
| Client state | **Zustand** (+ persist for UI prefs) | `^5.0.15` |
| Auth | **Firebase Auth** | `firebase` `^12.18.0` |
| HTTP | Native **`fetch`** (no axios) | Bearer token |
| Streaming | SSE via `ReadableStream` | `consumeSse` |
| Class utils | clsx + tailwind-merge | |
| Lint | ESLint 9 + eslint-config-next | |

**Not used:** Redux, charts libraries (heatmaps are custom SVG/CSS), maps, payments, Socket.IO, Next Route Handlers, middleware, PWA, tests.

**Scripts:** `dev`, `build`, `start`, `lint`.

## A.2 Folder structure

```
Raghive-frontend/
├── package.json
├── next.config.ts
├── .env.example
├── RAGHive_*_Agent_Build_Prompt.md   # planner / extractor / reasoning specs
├── public/
└── src/
    ├── app/                 # App Router pages + layouts
    ├── components/          # ui, layout, chat, trace, shared, providers
    ├── lib/
    │   ├── api/             # client, types, endpoints, mock
    │   ├── firebase/        # Auth SDK + context
    │   ├── hooks/
    │   ├── store/           # Zustand
    │   └── utils/
    └── styles/tokens.css
```

Path alias: `@/*` → `./src/*`.

## A.3 Routes

| URL | What it is |
|-----|------------|
| `/` | Marketing landing (hero, problem, how-it-works, feature bento, comparison) |
| `/auth/sign-in` | Email/password + Google |
| `/auth/sign-up` | Email sign-up + display name + terms |
| `/auth/forgot-password` | Password reset email |
| `/app/chat` | Redirect to latest chat or `/app/chat/new` |
| `/app/chat/new` | Create chat, then open it |
| `/app/chat/[chatId]` | Main workspace: messages + live stream + HITL + trace panel |
| `/app/history` | Search, pin filter, table/grid, bulk delete, JSON export |
| `/app/settings` | Redirects to profile |
| `/app/settings/profile` | Display name (local UI) |
| `/app/settings/appearance` | Theme + density |
| `/app/settings/verification` | Strictness + trace panel defaults |
| `/app/settings/account` | Password / sessions / delete (mostly UI) |

Layouts:

- Root — fonts (Fraunces, Inter Tight, JetBrains Mono), providers, Sonner, default dark theme
- `(marketing)` — public nav + footer (route group; URL stays `/`)
- `auth` — split pane (form + value props)
- `app` — client-side auth gate, sidebar + topbar
- `app/settings` — settings tab nav

Also: global `error.tsx`, `not-found.tsx`.

## A.4 Features implemented

### Auth

- Email/password sign-in and sign-up, Google popup, forgot password, sign-out
- Mock auth identity for demo (`Dr. Soumya Jain` / `researcher@lnmiit.ac.in`) without Firebase
- Client-only gate: unauthenticated visits to `/app/*` redirect to `/auth/sign-in`
- **No RBAC / admin roles** (sidebar “Academic Plan” is a static badge)

### Marketing site

Animated pipeline hero, black-box RAG problem statement, three-agent explainer, XAI feature bento, Naive vs Modular vs RAGHive comparison table, CTA.

### Chat workspace (core)

- Create / list / pin / delete chats
- Composer with Enter-to-send and **document attach** (`.pdf`, `.txt`, `.md`)
- Live token stream + agent status strip
- Inline plan / evidence / faithfulness chips
- HITL panel: approve, edit sub-questions, regenerate
- Right-hand **trace panel** (All / Plan / Docs / QA)

### Reasoning trace UI

- Planner steps, retry banner, four verification checks, keywords, attention matrix
- Extractor chunks with similarity + XAI bars; Hit Rate / MRR / Ctx Precision; show filtered
- QA faithfulness gauge, low-grounding banner, erasure test
- Sentence ↔ chunk **hover highlight** across panels
- Attention saliency table and confidence badge

### History

Search, pinned-only, table/grid, multi-select, bulk delete, JSON export of chat summaries, `avgFaithfulness` when present. (Page exists; not linked from the sidebar.)

### Settings

- Appearance: light / Night Hive / system, density — persisted in Zustand (`raghive-ui-preferences`)
- Verification: strictness + panel defaults; strictness PATCHed to API
- Profile / password / sessions / delete account: largely cosmetic (toasts / sign-out), not fully wired to Firebase or the API

### Mock API

Default: mock is **on** unless `NEXT_PUBLIC_USE_MOCK_API === "false"`. Mock chats, traces (Inception / retry / medium), and a simulated SSE stream so the full UI can run without the backend.

## A.5 State management

| Layer | Tool | Where |
|-------|------|--------|
| Auth user + ID token | React Context | `src/lib/firebase/auth-context.tsx` |
| Chat list / messages | TanStack Query | `use-chats.ts`, `use-messages.ts` |
| Live stream / HITL / active trace | Zustand | `use-chat-store.ts` (not persisted) |
| Theme, sidebar, trace panel, density, strictness | Zustand + persist | `use-ui-store.ts` |
| Citation hover / filtered chunks | Zustand | `use-trace-store.ts` |

## A.6 Design system

Custom tokens (`src/styles/tokens.css`), not a third-party kit:

- Light: cream `#FAF8F4`, ink `#1C1A16`, amber `#D97706`, teal `#0F766E`
- Dark “Night Hive”: `#12100D` / `#1C1914`, amber `#F59E0B`, teal `#2DD4BF`
- Hex-dot background, custom scrollbars
- Fonts: Fraunces (display), Inter Tight (UI), JetBrains Mono (scores / chips)
- Primitives: Button, Input, Badge, Card, Dialog, Dropdown, Tabs, Tooltip
- Reduced-motion support on carousel, agent status, page transitions

## A.7 Environment (frontend)

From `.env.example`:

| Variable | Meaning |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI origin |
| `NEXT_PUBLIC_USE_MOCK_API` | `"false"` = live API |
| `NEXT_PUBLIC_USE_MOCK_AUTH` | `true` = skip Firebase, demo researcher |

Also read in code (not listed in `.env.example`): `NEXT_PUBLIC_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`, `MEASUREMENT_ID`.

## A.8 Notable frontend implementation details

- Full product loop in mock mode (no backend required)
- Cross-panel citation hover via a dedicated trace store
- Custom XAI visuals (no chart library)
- Document ingest from the composer (`POST /api/v1/documents`)
- Client methods exist for `getMe` / `getTrace` / `getPreferences` but are unused in pages; traces arrive via the stream / message payload

---

# Part B — Backend (`Raghive-backend`)

## B.1 Tech stack

| Area | Choice | Package / default |
|------|--------|-------------------|
| Language | Python 3 | |
| Framework | **FastAPI** | `>=0.115.0` |
| Server | **Uvicorn** | `>=0.32.0` |
| Validation / settings | **Pydantic v2** + pydantic-settings | |
| ORM / app DB | **SQLAlchemy 2.0** + **SQLite** | `sqlite:///./data/raghive.db` |
| Vector DB | **ChromaDB** | collection `raghive_chunks` |
| Orchestration | **LangGraph** (graph defined; SSE runner is custom) | `>=0.2.50` |
| LLM client | OpenAI SDK + **LangChain ChatOpenAI** | pointed at local vLLM |
| Generation model | **Qwen2.5-32B-Instruct** | `LOCAL_INFERENCE_URL` |
| XAI proxy | **Qwen2.5-0.5B-Instruct** | load then unload |
| Embeddings | **BGE-M3** (+ fallbacks) | |
| Reranker | MiniLM cross-encoder | |
| NER | **GLiNER** `urchade/gliner_medium-v2.1` | required only in `full` mode |
| PDF | **PyMuPDF** | |
| Auth | **Firebase Admin** (optional) | `firebase-admin` |
| Uploads | python-multipart, local disk | `./data/uploads` |
| HTTP probe | httpx | LLM `/models` health |

**Optional extras** (commented in `requirements.txt`): torch, transformers, sentence-transformers, GLiNER, spaCy, bitsandbytes.

**Not used:** Mongo/Postgres as default, Redis, Celery, Stripe, Twilio, Cloudinary, email, Socket.IO, cron.

Entry: `python -m uvicorn app.main:app --reload --port 8000`  
Factory: `app/main.py` → `create_app()`.

## B.2 Folder structure

```
Raghive-backend/
├── README.md
├── requirements.txt
├── .env.example
└── app/
    ├── main.py              # FastAPI factory, CORS, lifespan
    ├── config.py
    ├── deps.py              # get_current_user
    ├── api/                 # chats, documents, users, system
    ├── agents/              # planner, extractor, reasoning, graph
    ├── services/            # pipeline, ingest, XAI, vectorstore, …
    ├── db/                  # session, models, crud
    ├── models/              # Pydantic DTOs + GraphState
    └── utils/               # firebase_auth, sse
data/                        # runtime (gitignored): raghive.db, chroma/, uploads/
```

**Lifespan:** create upload + chroma dirs → `init_db()` → optional `seed_if_empty()`.

**Request path:** Router → `Depends(get_current_user)` + `Depends(get_db)` → CRUD and/or pipeline.

## B.3 Database models (SQLite)

### `users`

`id` (Firebase UID or demo `usr_raghive_demo_101`), `email`, `display_name` (default `"Researcher"`), `avatar_url`, `created_at`, `preferences_json`.

### `chats`

`id` (`chat_` + hex), `user_id`, `title`, `pinned`, `archived`, timestamps. Archived chats hidden from list. First user message auto-titles the chat (72 chars).

### `messages`

`id` (`msg_` + hex), `chat_id`, `role` (`user` / `assistant`), `content`, `created_at`, `trace_json`, `pending` (HITL / in-flight), `pipeline_state_json` (resume checkpoint), `faithfulness`.

### `documents`

`id` (`doc_` + hex), `user_id`, `filename`, `chunk_count`, `created_at`.  
Upload-only — no list/get/delete API.

**Not a SQL table:** Chroma collection `raghive_chunks` (`id`, `source`, `page`, `text`, embedding). The collection is **global**, not per-user namespaced.

## B.4 Auth and security

1. Parse `Authorization: Bearer <token>`.
2. If `AUTH_DISABLED=true`: verify if present, else demo claims (`usr_raghive_demo_101`, `researcher@lnmiit.ac.in`).
3. If auth enabled: 401 without / invalid token; Firebase `verify_id_token`; upsert user.
4. Exact match to `MOCK_BEARER_TOKEN` → demo claims.

Chats/messages are scoped by `user_id`. No roles, cookies, CSRF, refresh tokens, or rate limiting. CORS allowlist + SSE `Cache-Control: no-cache`, `X-Accel-Buffering: no`. Raw graph state is stripped from browser events.

## B.5 Document ingest and seed corpus

- `POST /api/v1/documents`: save under `UPLOAD_DIR`, PDF via PyMuPDF, others UTF-8
- Chunk size **700**, overlap **120**, upsert to Chroma
- On first boot (`SEED_ON_STARTUP`): Nolan / Inception / Oppenheimer notes, grid/ICS security (NIST SP 800-82, IEEE 1547), NormEnsembleXAI / Chroma / vLLM notes — so demo queries retrieve real chunks without uploads

## B.6 Modes

| Mode | Intent |
|------|--------|
| `lite` (default, Windows/dev) | GLiNER / 0.5B / BGE-M3 optional; heuristic + hashing fallbacks; **same JSON contract** |
| `full` | GLiNER must load; intended for A100 / thesis cluster |

`GET /api/v1/health` reports which backends are actually live.

## B.7 Environment (backend)

| Variable | Meaning |
|----------|---------|
| `RAGHIVE_HOST` / `RAGHIVE_PORT` | Bind address (default `0.0.0.0:8000`) |
| `RAGHIVE_CORS_ORIGINS` | Frontend origins |
| `RAGHIVE_MODE` | `lite` or `full` |
| `RAGHIVE_ALLOW_HEURISTIC_LLM` | Run without vLLM |
| `LOCAL_INFERENCE_URL` / `LOCAL_API_KEY` | OpenAI-compatible LLM |
| `GEN_MODEL_NAME` / `XAI_MODEL_NAME` | 32B generate / 0.5B attention |
| `EMBEDDING_MODEL` / `RERANKER_MODEL` | Retrieval stack |
| `CHROMA_PATH` / `CHROMA_COLLECTION` | Vector store |
| `SEED_ON_STARTUP` | Seed empty Chroma |
| `AUTH_DISABLED` | Local demo auth |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CREDENTIALS_FILE` | Production verify |
| `MOCK_BEARER_TOKEN` | Shared with frontend mock |
| `DATABASE_URL` | SQLAlchemy URL |
| `UPLOAD_DIR` | Local file store |

## B.8 Notable backend implementation details

- Independent verification report (entity FAIL veto; ≥2 other fails → FAIL; 1 → WARNING)
- HITL checkpoint + resume (`approve` / edit sub-questions / `regenerate`)
- Dual-score filter so “looks similar” is not enough to keep a chunk
- Attention proxy because the generation server does not expose attentions
- Graceful lite mode so the frontend contract stays stable on a laptop
- FastAPI `/docs` only — no admin product API

**Present in repo but unused at runtime:** `yake` dependency, compiled `get_graph()`, some leftover CRUD helpers.

---

# Part C — What is not implemented

These are **not** in either repo (do not claim them on a resume as product features):

- User roles / admin console / multi-tenant orgs
- Payments, billing, email, push notifications
- WebSockets / Socket.IO
- Maps, charts libraries, PWA
- Document list / delete APIs; per-user vector namespaces
- Next.js middleware or server-side session checks
- Automated tests (Jest / Vitest / Playwright / pytest)
- Cron / workers / Redis
- Cloud object storage (S3 / Cloudinary)
- Profile / password-change / account-delete fully wired to Firebase or the API

---

# Part D — Resume points (5)

Use these as-is or trim to the job. Together they cover the whole system.

1. **Built RAGHive, a glass-box multi-agent RAG platform (Next.js 16, React 19, FastAPI) that streams a Planner → Extractor → QA pipeline so users can inspect the plan, evidence, and faithfulness before trusting the answer.**

2. **Implemented Server-Sent Event orchestration with human-in-the-loop: four independent planner verification checks, one automatic retry, then a pause to approve, edit sub-questions, or regenerate — with pipeline state checkpointed in SQLite.**

3. **Designed dual-scored retrieval (ChromaDB, BGE-M3 embeddings, cross-encoder rerank, NormEnsembleXAI attribution) so chunks must pass both similarity and XAI thresholds, plus PDF/TXT/MD ingest via PyMuPDF.**

4. **Shipped an interactive XAI workspace — attention matrices, citation hover linking, faithfulness gauges, erasure tests, and live token/agent status — using Zustand, TanStack Query, Tailwind, and custom SVG visualizations (no black-box chat UI).**

5. **Integrated Firebase Auth (Bearer ID tokens), a typed REST + SSE contract between the two repos, and lite/full inference modes (Qwen2.5-32B via vLLM plus a 0.5B attention proxy) so the same API works on a laptop or a GPU cluster.**

---

# Part E — One-line summary

**RAGHive** is an LNMIIT academic full-stack product: a Next.js glass-box UI talking to a FastAPI multi-agent RAG API (Planner → Extractor → QA), with ChromaDB retrieval, NormEnsembleXAI dual scoring, streamed traces, and HITL when verification fails — so researchers can see *why* the model answered, not only *what* it said.
