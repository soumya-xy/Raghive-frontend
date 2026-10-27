# RAGHive — QA / Reasoning Agent Build Prompt (paste this whole file into your AI coding agent)

You are building the **QA/Reasoning Agent** — stage 3, the final stage of RAGHive's
glass-box pipeline (`Planner → Extractor → QA/Reasoning`). Like the Extractor Agent, this
is a Python **LangGraph node** in the same `StateGraph` as the Planner (spaCy/NER, vLLM
Qwen2.5-32B-Instruct, ChromaDB, attention-based confidence scoring) and must consume the
Extractor's `retrieved_docs` / `extractor_trace` output exactly as the Extractor spec
defines it.

> **Note on scope:** detailed requirements for this agent weren't separately spelled out —
> only the Extractor's were. Everything in this document is derived directly from the
> already-shipped frontend's `QATrace` TypeScript contract and Section 4.4.3 of the
> frontend build prompt, both of which are already locked into the running UI. Building to
> this spec gets you the same zero-refactor integration the Extractor spec targets.

---

## 0. Position in the pipeline

```
   ┌─────────────────────────────┐     ┌─────────────────────────────┐
   │  Verified Plan (Planner)    │     │  Scored Evidence (Extractor) │
   └──────────────┬──────────────┘     └──────────────┬──────────────┘
                   └───────────────┬───────────────────┘
                                   ▼
                  ┌─────────────────────────────────────┐
                  │        Answer Synthesis (LLM)         │
                  │     streamed token-by-token to UI     │
                  └──────────────────┬────────────────────┘
                                     ▼
                  ┌─────────────────────────────────────┐
                  │  Faithfulness Scoring (attention-    │
                  │  based grounding ratio)               │
                  └──────────────────┬────────────────────┘
                                     ▼
                  ┌─────────────────────────────────────┐
                  │  Citation Alignment (sentence ↔       │
                  │  evidence-chunk mapping)              │
                  └──────────────────┬────────────────────┘
                                     ▼
                  ┌─────────────────────────────────────┐
                  │  Erasure Test (mask key terms, check  │
                  │  if the answer actually changes)      │
                  └──────────────────┬────────────────────┘
                                     ▼
               ┌─────────────────────┴─────────────────────┐
               ▼                                           ▼
   [ Final Answer + Citations ]                  [ QA Trace Telemetry ]
   Streamed to chat UI                            Emitted to UI Glass-Box Panel
```

## 1. Mission (one line)

Synthesize the final answer from the verified plan + surviving evidence, then prove it's
grounded — via a Faithfulness Score, a sentence-to-evidence Citation Heatmap, and an
Erasure Test — so the frontend can show its work instead of asking the user to trust a
plain chat bubble.

---

## 2. Technology stack & dependencies

- **LLM runtime:** vLLM serving Qwen2.5-32B-Instruct — **reuse the same client** the
  Planner and Extractor agents already opened; do not load a second model instance.
- **Faithfulness scoring:** attention-based grounding ratio. Reuse the same
  attention-extraction utilities the Planner already built for its own confidence
  scoring — one shared attention-hook implementation, not two divergent ones.
- **Sentence segmentation (for citations):** spaCy sentencizer — consistent with the
  Planner's existing spaCy/NER usage, no second NLP library.
- **Erasure testing:** reuse `state["keywords"]` (the Planner's NER ground-truth terms) for
  masking, and BGE-M3 (already loaded by the Extractor) for the before/after semantic
  similarity check.
- **Streaming:** vLLM's native token streaming for the answer text.
- **Language:** Python 3.11+, type-hinted, Pydantic state models, LangGraph node,
  `state -> state` pure function.

---

## 3. Core algorithms

### 3.1 Faithfulness Score (attention-grounding ratio)

```
F = Σ_{t ∈ answer tokens} attention_mass(t → evidence tokens)
    ────────────────────────────────────────────────────────
    Σ_{t ∈ answer tokens} attention_mass(t → all context tokens)
```

Interpretation: the fraction of attention spent, while generating the answer, on retrieved
evidence versus the model's own parametric background. High `F` = grounded in evidence;
low `F` = the model is more likely drawing on memorized knowledge rather than what the
Extractor actually retrieved — this is the hallucination-risk signal the UI surfaces.

### 3.2 Citation alignment (powers the Citation Heatmap)

For each answer sentence (spaCy sentencizer), compute the attention overlap between that
sentence's tokens and each surviving evidence chunk. A chunk qualifies as a citation for
that sentence if its share of the sentence's attention mass clears a minimum contribution
threshold (e.g. top contributor, or any chunk above ~15% share — make this configurable).
Character offsets (`sentenceSpan`) must be exact indices into the final `answer` string —
the frontend highlights live text ranges, so off-by-one errors will visibly break the UI.

### 3.3 Erasure Test

1. Take `state["keywords"]` — the same NER terms the Planner already extracted, don't
   re-extract them.
2. Mask/remove them from the query and produce a second answer. Two implementation options
   — pick one and document the tradeoff for whoever maintains this:
   - **Full regeneration** (accurate, slower): re-run the whole QA synthesis with the
     masked query.
   - **Embedding-similarity proxy** (cheaper, approximate): compare answer embeddings
     without a full second generation pass, if regeneration latency is unacceptable for the
     product's response-time budget.
3. Compute cosine similarity between the original answer's embedding and the masked-query
   answer's embedding. If similarity drops below a threshold (e.g. `< 0.85`), the answer
   genuinely depended on those terms → `erasureTestChanged = true`.

**Interpretation direction (important, don't flip this):** `erasureTestChanged = true`
(answer changed once key terms were masked) is the **good** outcome — it proves the answer
depends on the query's key terms. `erasureTestChanged = false` (answer unchanged despite
masking) is the **suspicious** outcome — it suggests the model ignored the terms that
should have mattered.

### 3.4 `belowGroundingThreshold`

```python
below_grounding_threshold = faithfulness_score < grounding_threshold
```

Pull `grounding_threshold` from the same `verificationStrictness` setting
(`standard`/`thorough`) the Extractor spec uses for its own thresholds, so a user who picks
"Thorough" gets stricter behavior consistently across both agents.

---

## 4. LangGraph state contract (Python-side, snake_case)

### Inputs consumed

```python
verified_plan = state["plan"]
keywords = state["keywords"]              # from Planner
extractor_trace = state["extractor_trace"]  # from Extractor, all subQueries + chunks
context = state["current_context"]         # merged, deduped evidence text
```

### Outputs emitted

```python
state["answer"] = "The director of Inception is Christopher Nolan..."
state["qa_trace"] = {
    "answer": "...",                       # same text, stored complete
    "faithfulness_score": 0.94,
    "citations": [
        {"sentence_span": [0, 46], "evidence_chunk_ids": ["chk-101", "chk-104"]},
        {"sentence_span": [47, 92], "evidence_chunk_ids": []},  # valid — no citation needed
    ],
    "erasure_test_changed": True,
    "below_grounding_threshold": False,
}
state["qa_valid"] = True
```

---

## 5. TypeScript contract (must match the frontend's `lib/api/types.ts` exactly)

```typescript
interface QATrace {
  answer: string;
  faithfulnessScore: number;    // 0..1
  citations: {
    sentenceSpan: [number, number];   // char offsets into `answer`
    evidenceChunkIds: string[];       // EvidenceChunk.id references — [] is valid
  }[];
  erasureTestChanged: boolean;
  belowGroundingThreshold: boolean;
}
```

### Python → JSON field mapping (implement in your serializer)

| Python (`qa_trace`) | JSON (`QATrace`) |
|---|---|
| `answer` | `answer` |
| `faithfulness_score` | `faithfulnessScore` |
| `citations[].sentence_span` | `citations[].sentenceSpan` |
| `citations[].evidence_chunk_ids` | `citations[].evidenceChunkIds` |
| `erasure_test_changed` | `erasureTestChanged` |
| `below_grounding_threshold` | `belowGroundingThreshold` |

---

## 6. SSE event contract

Unlike the Extractor's single complete event, the QA agent's **answer text is
token-streamed**; everything else ships as one complete event **after** streaming ends:

```
data: {"type":"agent_status","agent":"qa","status":"started"}
data: {"type":"token","data":"The "}
data: {"type":"token","data":"director "}
data: {"type":"token","data":"of "}
...
data: {"type":"agent_status","agent":"qa","status":"done"}
data: {"type":"qa_result","data":{ ...QATrace, camelCase per Section 5... }}
data: {"type":"done","messageId":"msg_2"}
```

`faithfulnessScore`, `citations`, and `erasureTestChanged` all depend on the *complete*
answer text (sentence segmentation and attention-mass totals can't be computed mid-stream),
so compute them only after the last token is emitted, then send `qa_result` as a single
object — never interleave citation/faithfulness data into the token stream.

---

## 7. Frontend visual & interactive requirements

- **Iconography:** check-shield/scale icon, ink with green accent (consistent with the
  Planner's amber/compass and Extractor's teal/layered-documents visual language).
- **Faithfulness Score:** large radial/gauge meter, 0–100%, color-coded using the same
  threshold logic pattern as the Planner's `confidenceLevel` (send a pre-labeled tier
  server-side rather than making the frontend re-derive thresholds) — reuse the palette:
  forest green (high), amber (medium), brick red (low/below-threshold).
- **Citation Heatmap:** the frontend renders this client-side (D3/custom SVG) — your only
  job is exact `sentenceSpan` offsets and `evidenceChunkIds`; do not attempt to render a
  heatmap server-side.
- **Erasure Test:** simple before/after boolean row — "with key term masked, answer
  changed: Yes/No."
- **Low-grounding banner:** triggered by `belowGroundingThreshold`, must be icon + text,
  never color alone (a11y requirement carried across every agent's UI).

---

## 8. Edge cases & error handling

- **Empty or invalid upstream context** (`extraction_valid: False` from the Extractor for
  every sub-query) → still produce an answer, but make it clearly caveated (e.g. "I don't
  have enough verified evidence to answer this confidently") and **force**
  `below_grounding_threshold = True` regardless of the computed faithfulness number — don't
  let a lucky high attention score mask genuinely missing evidence.
- **No citation found for a sentence** → `evidence_chunk_ids: []` is a valid, expected
  result (e.g. transitional sentences, "In summary..."), not an error state — the frontend
  treats an empty array as "no highlight," never as broken data.
- **Erasure test regeneration too slow for the product's latency budget** → fall back to
  the embedding-similarity proxy (Section 3.3), and document that this is an approximation,
  not a full behavioral test.

---

## 9. Acceptance checklist

- [ ] JSON field names are camelCase and match `QATrace` exactly — confirm your
      serialization layer actually converts (`faithfulnessScore`, not `faithfulness_score`).
- [ ] Every `sentenceSpan` is a valid, in-range `[start, end)` offset into the final
      `answer` string — no off-by-one errors.
- [ ] Answer is streamed token-by-token; `qa_result` is sent exactly once, after the stream
      completes, as one complete object.
- [ ] `belowGroundingThreshold` is forced `true` when upstream evidence was empty/invalid,
      independent of the raw faithfulness number.
- [ ] `erasureTestChanged` direction is correct (`true` = answer depended on key terms =
      good sign) — verify this isn't accidentally inverted.
- [ ] Reuses the Planner's `keywords`, the Extractor's embedder, and the shared vLLM
      client — no duplicate resource loads.
- [ ] Runs correctly against the frontend's three mock trace examples (HIGH-confidence
      clean pass, MEDIUM-confidence, and the self-correction + filtered-chunk example) so
      the demo path and the real path produce structurally identical UI states.
