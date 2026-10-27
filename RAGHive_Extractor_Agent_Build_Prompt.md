# RAGHive — Extractor Agent Build Prompt (paste this whole file into your AI coding agent)

You are building the **Extractor Agent** — stage 2 of RAGHive's three-agent glass-box
pipeline (`Planner → Extractor → QA/Reasoning`). This is a Python **LangGraph node**,
built to slot into the same `StateGraph` as the already-complete Planner Agent (spaCy/NER
keyword extraction, LangGraph state, vLLM-served Qwen2.5-32B-Instruct, ChromaDB, confidence
scoring with a self-correction retry loop). The already-shipped Next.js frontend is built
and demoable against a mock API — this agent's job is to emit real data in the **exact**
shape the frontend already renders, so wiring it in is a one-line env flag flip, not a
frontend rewrite.

Do not rename any field in Section 5/6 below. The frontend's TypeScript types and the
backend's SSE contract were locked in first; this agent must conform to them, not the
other way around.

---

## 0. Position in the pipeline

```
            ┌─────────────────────────────────────┐
            │   Sub-Query (from Planner Agent)     │
            └──────────────────┬────────────────────┘
                               │
                               ▼
            ┌─────────────────────────────────────┐
            │ Vector Retrieval (ChromaDB + BGE-M3) │
            └──────────────────┬────────────────────┘
                               │
                               ▼
            ┌─────────────────────────────────────┐
            │ Reranking & Dual Scoring Engine       │
            │ (Similarity S_sim + Attribution A_ens)│
            └──────────────────┬────────────────────┘
                               │
                               ▼
            ┌─────────────────────────────────────┐
            │ Metric Computation & Hard Filtering   │
            │ (Hit Rate, MRR, Context Precision)    │
            └──────────────────┬────────────────────┘
                               │
              ┌─────────────────┴─────────────────┐
              ▼                                    ▼
   [ Valid Context Output ]                [ Trace Telemetry ]
   Forwarded to QA/Reasoning Agent         Emitted to UI Glass-Box Panel
```

## 1. Mission (one line)

For every sub-query the Planner produced, retrieve → rerank → dual-score → hard-filter
evidence chunks, hand a clean evidence-backed context to the QA/Reasoning Agent, and emit
full trace telemetry so the frontend's Extractor panel can prove the filtering actually
happened.

---

## 2. Technology stack & dependencies

- **Vector store:** ChromaDB, persistent client — same collection/connection convention
  the Planner Agent already uses.
- **Embedding model:** BGE-M3 (dense embeddings for v1; it supports hybrid dense+sparse if
  you want to add lexical/BM25-style matching later — flag this as a possible v2 upgrade,
  don't block v1 on it).
- **Reranker:** a cross-encoder over the top-N ANN candidates before scoring
  (`BAAI/bge-reranker-v2-m3` or `cross-encoder/ms-marco-MiniLM-L-6-v2` are both reasonable
  — pick one, wrap it behind an interface so it's swappable).
- **Attribution scoring — NormEnsembleXAI:** normalized + aggregated **gradient-based**
  signal + **leave-one-out perturbation** signal, ensembled into a single 0–1 Attribution
  Score per chunk. This is what makes a chunk "kept because it actually matters" distinct
  from "kept because it looked similar."
- **LLM runtime:** vLLM serving Qwen2.5-32B-Instruct — **reuse the same client/connection
  pool the Planner Agent already opened**, do not spin up a second model server.
- **Orchestration:** a LangGraph node, a pure function `state -> state` with no side
  effects besides ChromaDB reads and the reranker/attribution forward passes.
- **Language:** Python 3.11+, fully type-hinted, Pydantic models for every state
  substructure (no raw untyped dicts floating around).

---

## 3. Core algorithms

### 3.1 Dual Scoring Engine

- **Similarity Score `S_sim`** — cosine similarity between the query embedding and chunk
  embedding (BGE-M3), normalized to 0–1.
- **Attribution Score `A_ens`** (NormEnsembleXAI) — ensembled, normalized importance score,
  0–1, from gradient-based + leave-one-out signals.

### 3.2 Retrieval metrics

| Metric | Formula | Meaning |
|---|---|---|
| Hit Rate@K | `HitRate@K = max_{i∈[1..K]} R_i` | Verifies at least one valid supporting fact appears in the top K. |
| MRR | `MRR = 1 / min{i ∣ R_i = 1}` | How early the first accurate chunk appears. |
| Context Precision | `Σ_{k=1}^{K} P@k·R_k / Σ_{k=1}^{K} R_k`, where `P@k = (1/k)·Σ_{j=1}^{k} R_j` | Penalizes ranking irrelevant chunks above relevant ones. |

`R_i` is a binary relevance label per retrieved chunk (1 if it's judged relevant/supporting,
0 otherwise) — derive this from whether the chunk survived hard filtering, or from a
labeled eval set if you're running offline evaluation rather than live inference.

### 3.3 Hard filtering

Keep a chunk only if it clears **both** scores:

```python
keep = (s_sim >= sim_threshold) and (a_ens >= attribution_threshold)
```

Don't hardcode `sim_threshold` / `attribution_threshold` as magic numbers — pull them from
config, and map them to the frontend's existing Settings toggle
(`verificationStrictness: "standard" | "thorough"`, see `GET/PATCH
/api/v1/users/me/preferences` in the backend handoff doc): `standard` = looser thresholds,
`thorough` = stricter. This keeps the Extractor consistent with how the Planner's own
confidence thresholding is described as configurable.

### 3.4 Multi-step aggregation — bridging per-step state to the frontend's `ExtractorTrace`

The state contract below consumes **one sub-query at a time** via
`state["current_step_index"]`. Since the Planner emits a *list* of steps, this node needs
to run once per step (loop back via a LangGraph conditional edge that increments
`current_step_index` until `>= len(state["plan"])`), accumulating results into a running
trace object:

```python
state.setdefault("extractor_trace", {"subQueries": []})
state["extractor_trace"]["subQueries"].append({
    "query": sub_query,
    "chunks": [...]  # see Section 5 for shape
})
```

Only after the loop exhausts all steps does the graph hand off `state["extractor_trace"]`
(mapped to the frontend's `ExtractorTrace`) to the QA/Reasoning Agent.

---

## 4. LangGraph state contract (Python-side, snake_case)

### Inputs consumed

```python
sub_query: str = state["plan"][state["current_step_index"]]
```

### Outputs emitted (per step)

```python
state["current_context"] = "Formatted text of surviving chunks..."
state["retrieved_docs"] = [
    {
        "id": "chk-101",
        "source": "manual.pdf",
        "page": 12,
        "text": "...",
        "similarity_score": 0.89,
        "attribution_score": 0.82,
        "kept": True,
        "filter_reason": None,   # e.g. "below attribution threshold" when kept=False
    }
]
state["retrieval_metrics"] = {
    "hit_rate": 1.0,
    "mrr": 1.0,
    "context_precision": 0.85,
}
state["extraction_valid"] = True
```

`extraction_valid` should be `False` when **zero** chunks survive filtering for that
sub-query — see Section 8 for what should happen downstream when this fires.

---

## 5. TypeScript contract (must match the frontend's `lib/api/types.ts`)

The frontend's locked-in type (from the backend handoff doc — do not deviate on names):

```typescript
interface EvidenceChunk {
  id: string;
  sourceDocument: string;
  text: string;
  similarityScore: number;   // 0..1
  attributionScore: number;  // 0..1, NormEnsembleXAI ensembled score
  keptForReasoning: boolean; // false chunks MUST still be sent, never omitted
}

interface ExtractorTrace {
  subQueries: { query: string; chunks: EvidenceChunk[] }[];
}
```

**Additive extension needed for the UI requirements in Section 7** — add these two
**optional** fields (non-breaking; ask the frontend to add them to the same interface):

```typescript
export interface EvidenceChunk {
  id: string;
  sourceDocument: string;
  pageNumber?: number;       // NEW — powers the "document metadata badge"
  text: string;
  similarityScore: number;
  attributionScore: number;
  keptForReasoning: boolean;
  filterReason?: string;     // NEW — powers "below relevance threshold" copy per-chunk
}
```

### Python → JSON field mapping (implement this in your serializer)

| Python (`retrieved_docs[]`) | JSON (`EvidenceChunk`) |
|---|---|
| `id` | `id` |
| `source` | `sourceDocument` |
| `page` | `pageNumber` |
| `text` | `text` |
| `similarity_score` | `similarityScore` |
| `attribution_score` | `attributionScore` |
| `kept` | `keptForReasoning` |
| `filter_reason` | `filterReason` |

---

## 6. SSE event contract

Per the backend handoff doc, the Extractor's result is emitted as **one complete JSON
event**, never token-streamed (unlike the QA agent's answer text):

```
data: {"type":"agent_status","agent":"extractor","status":"started"}
data: {"type":"agent_status","agent":"extractor","status":"done"}
data: {"type":"extractor_result","data":{ ...ExtractorTrace, camelCase per Section 5... }}
```

If a sub-query yields zero surviving chunks, still emit it inside `extractor_result` (empty
`chunks` array is invalid — send the retrieved-but-filtered chunks with
`keptForReasoning: false` so the UI's "Show N filtered chunks" drawer has something real to
render). Only use the `error` event type for a hard failure (e.g., ChromaDB unreachable),
never for "no relevant evidence found" — that's a normal, displayable outcome.

---

## 7. Frontend visual & interactive requirements

- **Primary accent color:** Deep Teal (`#0F766E` light / `#2DD4BF` dark).
- **Header badges:** top metric strip showing numeric Hit Rate, MRR, and Context Precision,
  plus a `PASS` / `FAIL` badge. Compute this server-side and send it pre-labeled (mirrors
  how the Planner sends `confidenceLevel` pre-labeled rather than making the frontend
  re-derive thresholds) — e.g. add `state["extractor_trace"]["evaluationPassed"]: bool`,
  `True` when `extraction_valid` and all three metrics clear their configured minimums.
- **Dual meter per chunk:** two progress bars — Similarity (`S_sim`, teal) and Attribution
  (`A_ens`, amber `#D97706`).
- **Chunk grouping:**
  - Accepted (`keptForReasoning === true`): full card, full text, source-document badge.
  - Filtered (`keptForReasoning === false`): 40% opacity, strike-through title, collapsed
    inside a drawer labeled `"Show N filtered chunks (below relevance threshold)"` — this is
    exactly what `filterReason` (Section 5) should populate per chunk.
- Never rely on color alone for PASS/FAIL or kept/filtered state — pair with icon + text
  label (carried over from the frontend's global a11y checklist).

---

## 8. Edge cases & error handling

- **Zero chunks survive filtering for a sub-query** → set `extraction_valid = False` for
  that step. Don't hard-fail the whole pipeline. Two acceptable strategies, pick one and
  document the choice: (a) emit `agent_status extractor retrying` once and widen retrieval
  (lower threshold / raise top-K) before giving up — mirrors the Planner's own
  self-correction pattern — or (b) pass the empty-but-valid trace through and let the
  QA/Reasoning Agent generate a caveated answer with `belowGroundingThreshold: true`.
- **ChromaDB returns zero candidates** (empty collection / off-domain query) →
  `retrieved_docs: []`, all metrics `0.0`, `extraction_valid: False` — this is a normal
  outcome, not an `error` event.
- **Duplicate chunks across sub-queries** — dedupe by `id` only when building the merged
  `current_context` string handed to the QA agent; keep duplicates in the per-sub-query
  trace array, since the frontend renders evidence grouped by sub-query, not globally
  deduped.

---

## 9. Acceptance checklist

- [ ] Field names match `ExtractorTrace` / `EvidenceChunk` exactly, camelCase, no typos.
- [ ] Filtered chunks are always included in the payload — never silently dropped.
- [ ] All metrics are numeric in `[0, 1]` — no `NaN` / `Infinity` leaking into JSON.
- [ ] Works correctly when the plan has 1 step and when it has 5+ steps (loop/accumulator
      logic is correct, `subQueries` array grows one entry per step, not overwritten).
- [ ] `extractor_result` is sent as a single complete event — never token-streamed.
- [ ] Thresholds are config-driven and reachable via `verificationStrictness`.
- [ ] Reuses the shared vLLM client and embedding model — no duplicate model loads.
- [ ] `evaluationPassed` / PASS-FAIL badge logic is computed server-side, not left for the
      frontend to infer from raw numbers.
