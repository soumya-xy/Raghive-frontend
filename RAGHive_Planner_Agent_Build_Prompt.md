# RAGHive — Planner Agent Build Prompt v2 (paste this whole file into your AI coding agent)

You are building/rebuilding the **Planner Agent** — stage 1 of RAGHive's three-agent
glass-box pipeline (`Planner → Extractor → QA/Reasoning`). This is a Python **LangGraph
node** that decomposes the user's query into a dependency-aware sub-question plan, then
**verifies that plan using independent, non-self-reported signals** — not the LLM's own
confidence score. This version supersedes any earlier draft that computed confidence as
`initial_confidence × xai_score`; that approach is deprecated for the reasons in Section 3.

Do not rename any field in Section 4/5 below once implemented. The Extractor and
QA/Reasoning agents already consume `state["keywords"]`, `state["plan"]`, and
`state["verification_report"]` per their own specs — this agent must emit them in the
exact shape those specs expect.

---

## 0. Position in the pipeline

```
                         USER QUERY
                             │
                             ▼
              ┌───────────────────────────┐
              │ Reference Entity Extraction │
              │   (GLiNER + LLM ensemble)   │
              └──────────────┬─────────────┘
                             │
                             ▼
              ┌───────────────────────────┐
              │   Plan Generation (Qwen32B) │
              └──────────────┬─────────────┘
                             │
              ┌──────────────┴──────────────┬──────────────────┬─────────────────┐
              ▼                             ▼                  ▼                 ▼
     Entity/Keyword Coverage      Requirement Coverage   Self-Consistency   Attention XAI
        (cheap, always run)         (best-effort)      (cost-aware trigger)  (proxy model)
              │                             │                  │                 │
              └──────────────┬──────────────┴──────────────────┴─────────────────┘
                             ▼
                   ┌───────────────────┐
                   │  Decision Layer    │
                   │ (verification      │
                   │  report, no blend) │
                   └─────────┬─────────┘
                             │
              ┌──────────────┼───────────────┐
              ▼              ▼               ▼
            PASS      FAIL (retry #1)   FAIL again after retry
              │              │               │
              ▼              ▼               ▼
        Continue to    Re-plan with     Pause pipeline —
         Extractor     corrective        emit awaiting_human_input,
                        feedback,        wait for user to approve/
                        re-verify        edit/regenerate
```

---

## 1. Mission (one line)

Decompose the query into a dependency-aware sub-question plan, then verify that plan
using **four independent, observable signals** — never the LLM's own self-reported
confidence — producing a legible, per-check verification report; retry once with
corrective feedback on failure, and escalate to human review if the retry still fails.

---

## 2. Technology stack & dependencies

- **Generation model:** vLLM-served Qwen2.5-32B-Instruct via `ChatOpenAI`
  (`langchain_openai`), structured output into `PlanSteps`. Client instantiated **once at
  module scope**, never recreated per call.
- **XAI/attention proxy model:** Qwen2.5-0.5B-Instruct, loaded locally via HF
  `transformers` (4-bit quantized), loaded immediately before the attention pass and
  **unloaded immediately after**. vLLM does not expose per-layer attention weights or
  support backward passes through its serving API, hence this proxy is required — do not
  attempt to extract attention/gradients from the 32B via vLLM.
- **Reference entity extraction:** GLiNER (`urchade/gliner_medium-v2.1`, module-level
  singleton, **fail loudly** — raise on load failure, don't silently continue with `None`)
  ensembled with LLM-based keyword extraction (raw `openai.OpenAI` client, also
  module-level singleton). Tag each entity with `source: "gliner" | "llm" | "both"`.
- **Semantic comparison (self-consistency):** BGE-M3 embeddings — same model the Extractor
  loads; decide and document whether the Planner loads its own instance or shares a handle
  with the Extractor within one graph run.
- **Requirement parsing:** spaCy dependency parser, for the (optional, best-effort)
  requirement-coverage check.
- **Language:** Python 3.11+, fully type-hinted, Pydantic models for every state
  substructure.

---

## 3. Core algorithms

### 3.0 Why not self-reported confidence

LLMs are poorly calibrated at self-assessing correctness — they will report high
confidence on decompositions that are wrong. `initial_confidence` from the structured
output is **retained as a field** but is explicitly demoted: it is **never** used to
compute `confidence_flag` or gate PASS/FAIL. Its only permitted use is as a cheap routing
hint for whether to trigger the more expensive self-consistency check (Section 3.3.3).

### 3.1 Reference entity extraction

- Combine GLiNER NER output with LLM-based keyword extraction; dedupe/merge into one list,
  each entity tagged with its `source`.
- **Terminology note (binding for code comments, docstrings, and the report):** call this
  set **"reference entities"**, never "ground truth." GLiNER is an independently-run
  extraction model, not a manually verified label set — "ground truth" is not defensible
  terminology unless you've hand-labeled a dataset and validated GLiNER against it.
- Tokenize each entity against the **XAI proxy model's tokenizer** (must match the model
  used in Phase 3 attention extraction) to get `token_positions`.

### 3.2 Plan generation

- `generate_plan(query, llm)` → structured `PlanSteps` (unchanged from current
  implementation).
- `initial_confidence` is kept on the `PlanSteps` schema but flows only into the
  self-consistency triggering logic (3.3.3), never into `confidence_flag`.

### 3.3 Verification suite — four independent checks

Each check is independent, produces its **own** `PASS` / `FAIL` / `WARNING` /
`SKIPPED` status plus a human-readable reason, and is **never blended into a single
weighted float**. If asked in a viva "why 30%/30%/40%?", the honest answer should be "we
don't do that" — not a number you have to defend.

#### 3.3.1 Entity/keyword coverage (cheapest — always run)

```python
missed = [
    e["text"] for e in reference_entities
    if not any(
        e["text"].lower() in sq.question.lower()
        or e["text"].lower() in [k.lower() for k in sq.search_keywords]
        for sq in plan.sub_questions
    )
]
entity_coverage = {"status": "FAIL" if missed else "PASS", "missed": missed}
```
Zero LLM calls, deterministic, lexical fact — not a vibe.

#### 3.3.2 Requirement coverage (optional, best-effort — document the weaker rigor)

- spaCy-parse the original query; split on coordinating conjunctions / wh-question markers
  to identify distinct information requirements (e.g. "who directed X, what year was it
  released, and what is their latest movie" → 3 requirements).
- Check each requirement has lexical/semantic overlap with at least one sub-question.
- **This check is weaker evidence than entity coverage** — there is no equally clean
  non-LLM signal for "did the plan address every clause." State this explicitly in the
  report as a best-effort heuristic, not a guarantee. If the query has only one clear
  clause, mark `SKIPPED`, not `PASS`/`FAIL`.

#### 3.3.3 Self-consistency (cost-aware triggering — do not run on every query)

**Trigger condition:**
```python
run_self_consistency = (
    0.5 <= plan.initial_confidence <= 0.85          # borderline self-report
    or verification_strictness == "thorough"         # always run in thorough mode
) and entity_coverage["status"] != "FAIL"             # already know it needs a retry
```

**Sampling:** generate 2 additional plans at nonzero temperature (3 total: A, B, C).

**Hybrid comparison** (per pair):
```python
def compare_plans(plan_a, plan_b):
    a_texts = [sq.question for sq in plan_a.sub_questions]
    b_texts = [sq.question for sq in plan_b.sub_questions]
    if len(a_texts) == len(b_texts):
        sims = [cosine_sim(bge_m3_embed(a), bge_m3_embed(b)) for a, b in zip(a_texts, b_texts)]
        return {"method": "step_level", "score": sum(sims) / len(sims)}
    else:
        a_full = plan_a.chain_of_thought + " " + " ".join(a_texts)
        b_full = plan_b.chain_of_thought + " " + " ".join(b_texts)
        return {"method": "whole_plan", "score": cosine_sim(bge_m3_embed(a_full), bge_m3_embed(b_full))}
```
Run for (A,B), (A,C), (B,C); average the three scores → `semantic_similarity`.
Also compute `structural_agreement` — the fraction of the 3 runs that share the
majority step count.

```python
self_consistency = {
    "status": "STABLE" if semantic_similarity >= threshold else "UNSTABLE",  # threshold from verification_strictness
    "semantic_similarity": semantic_similarity,
    "structural_agreement": structural_agreement,
}
```

**Interpretation note (binding — put this in code comments):** `STABLE` means the model
produced a *reproducible* reading of the query across independent samples. It does **not**
mean the reading is *correct* — three runs can consistently make the same mistake.
Consistency is evidence of stability, not truth. Never conflate the two downstream.

**Positional-comparison assumption:** step-level comparison via `zip()` assumes step *i*
in run A corresponds to step *i* in run B. This holds when decomposition order tracks
dependency order (which it should for this domain) but is an assumption, not a guarantee —
spot-check a handful of same-count pairs during testing and note the finding in the report.

#### 3.3.4 Attention-based XAI grounding (proxy model, reframed)

- Mechanism unchanged from the existing implementation: load the 0.5B proxy, extract
  `attention_matrix` + `query_token_span` + `plan_token_span`, unload immediately after.
- `verify_planner_focus(reference_entities, attention_output)` → `entity_scores`,
  `overall_xai_score`, `ignored_entities`.
- **Framing correction (binding for docstrings/report):** document this explicitly as an
  *"independent grounding verification via a lightweight proxy model,"* never as
  *"explaining why the 32B generated this plan."* The proxy model is architecturally
  distinct from the generation model; its attention does not literally trace the 32B's
  computation.
- Threshold is **config-driven** via `verification_strictness` — no hardcoded `0.60`.

```python
attention_xai = {
    "status": "PASS" if overall_xai_score >= threshold else "FAIL",
    "overall_xai_score": overall_xai_score,
    "ignored_entities": ignored_entities,
}
```

### 3.4 Decision layer — verification report, not a blended score

```python
verification_report = {
    "entity_coverage": entity_coverage,
    "requirement_coverage": requirement_coverage,   # status may be "SKIPPED"
    "self_consistency": self_consistency,           # status may be "SKIPPED"
    "attention_xai": attention_xai,
    "overall_status": overall_status,               # "PASS" | "WARNING" | "FAIL"
    "flags": [...],                                 # human-readable reason strings
}
```

**`overall_status` logic** (tune exact thresholds via `verification_strictness`, but keep
the *shape* of this logic — entity coverage failure is the one hard veto):
- `entity_coverage == "FAIL"` → `overall_status = "FAIL"` regardless of the other three
  (a missing named entity is the most severe failure mode — the plan literally doesn't
  mention something the query needed).
- Exactly one of `attention_xai`/`self_consistency` failing/unstable, entity coverage
  passing → `"WARNING"`.
- Two or more of the non-entity checks failing/unstable simultaneously → `"FAIL"`.
- All run checks PASS/STABLE → `"PASS"`.

**`confidence` (frontend scalar, required field, 0..1):**
```python
run_checks = [c for c in [entity_coverage, requirement_coverage, self_consistency, attention_xai]
              if c["status"] != "SKIPPED"]
passed = sum(1 for c in run_checks if c["status"] in ("PASS", "STABLE"))
confidence = passed / len(run_checks)
```
This is a transparent, unweighted fraction of checks passed — **not** the LLM's
self-reported number, **not** a weighted blend. Document it exactly this way: *"confidence
here means the fraction of independent verification checks passed, not a calibrated
probability of correctness."*

**`confidence_flag`:** simple discrete mapping from `overall_status` — `PASS → HIGH`,
`WARNING → MEDIUM`, `FAIL → LOW`. No numeric threshold math to defend in a viva.

### 3.5 Self-correction retry loop

**Trigger:** `overall_status == "FAIL"` and `retry_count == 0`.

```python
corrective_feedback = "\n".join([
    f"Previous attempt missed entities: {entity_coverage['missed']}." if entity_coverage["missed"] else "",
    f"Previous attempt did not address: {requirement_coverage.get('missed_requirements', [])}." if requirement_coverage.get("missed_requirements") else "",
]).strip()

plan = generate_plan(query + "\n" + corrective_feedback, llm)
# re-run the full verification suite (3.3.1–3.3.4) on the new plan
retried, retry_reason = True, corrective_feedback
```
Retry **exactly once**. If the second attempt also produces `overall_status == "FAIL"`,
do not retry again — proceed to HITL escalation (3.6).

### 3.6 Human-in-the-loop escalation

**Trigger:** `retried == True` and `overall_status == "FAIL"` on the second attempt.

- Do **not** proceed automatically to the Extractor.
- Emit an `awaiting_human_input` SSE event (Section 6) carrying the full
  `verification_report` and the current plan.
- Pipeline **pauses** — use LangGraph's interrupt/checkpoint mechanism so state persists
  while waiting (don't hold this open in-process; the user may not respond for minutes).
- **Resume options** the frontend can send back: (a) approve the current plan as-is
  despite the FAIL, (b) edit one or more sub-questions or add a missed keyword, (c)
  trigger another regeneration.
- On resume with edits: re-run the cheap checks (entity coverage, attention XAI) on the
  edited plan for the record, but **do not block again** — a human already reviewed it,
  don't create an infinite loop. Log `human_reviewed: true` plus a diff of what changed.
- **Decide and document a timeout policy now:** what happens if no human responds within
  some window (e.g., auto-proceed with a forced `LOW` caveat carried into the QA agent's
  `belowGroundingThreshold`, vs. leaving the chat in a pending state). Pick one.

---

## 4. LangGraph state contract (Python-side, snake_case)

### Inputs consumed
```python
query: str = state["original_question"]
verification_strictness: str = state.get("verification_strictness", "standard")
```

### Outputs emitted
```python
state["plan"] = plan                              # PlanSteps
state["reference_entities"] = reference_entities   # list[dict], NOT "ground_truth_entities"
state["keywords"] = [e["text"] for e in reference_entities]   # flattened; QA agent reuses this
state["verification_report"] = verification_report
state["confidence"] = confidence                   # checks_passed / total_checks_run
state["confidence_flag"] = confidence_flag         # "HIGH" | "MEDIUM" | "LOW"
state["attention_weights"] = {
    "matrix": attention_output["attention_matrix"].tolist(),
    "tokens": attention_output["tokens"],
    "query_token_span": attention_output["query_token_span"],
    "plan_token_span": attention_output["plan_token_span"],
}
state["retried"] = retried
state["retry_reason"] = retry_reason               # None if not retried
state["awaiting_human_input"] = awaiting_human_input  # True only if escalated to HITL
state["current_step_index"] = 0                    # init for Extractor's loop
state["verification_strictness"] = verification_strictness  # thread through unchanged
state["history"] += [history_entry]
```

---

## 5. TypeScript contract mapping (frontend `PlannerTrace`)

The frontend's current locked-in type does **not** have a field for the verification
report. This needs an **additive, optional extension** (same non-breaking pattern the
Extractor spec used for `pageNumber`/`filterReason`):

```typescript
interface VerificationCheck {
  status: "PASS" | "FAIL" | "WARNING" | "STABLE" | "UNSTABLE" | "SKIPPED";
  reason?: string;
}

interface PlannerTrace {
  steps: { id: string; text: string; dependsOn?: string[] }[];
  keywords: string[];
  confidence: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  attentionMatrix: number[][];
  rowLabels: string[];
  colLabels: string[];
  retried: boolean;
  retryReason?: string;
  // NEW — additive, non-breaking:
  verificationChecks?: {
    entityCoverage: VerificationCheck;
    requirementCoverage: VerificationCheck;
    selfConsistency: VerificationCheck;
    attentionXai: VerificationCheck;
  };
}
```

### Python → JSON field mapping

| Python | JSON |
|---|---|
| `sub_questions[].step_id` (int) | `steps[].id` (stringified) |
| `sub_questions[].question` | `steps[].text` |
| `sub_questions[].depends_on` (list[int]) | `steps[].dependsOn` (list[string]) |
| `keywords` | `keywords` |
| `confidence` | `confidence` |
| `confidence_flag` | `confidenceLevel` |
| `retried` | `retried` |
| `retry_reason` | `retryReason` |
| `verification_report.*` | `verificationChecks.*` (camelCase per sub-key) |

### Attention matrix slicing (already correct in your `main.py` debug script — move it here)

```python
matrix = np.array(attention_weights["matrix"])
tokens = attention_weights["tokens"]
q_start, q_end = attention_weights["query_token_span"]
p_start, p_end = attention_weights["plan_token_span"]

attentionMatrix = matrix[p_start:p_end, q_start:q_end].tolist()   # rows = plan tokens, cols = query tokens
rowLabels = tokens[p_start:p_end]
colLabels = tokens[q_start:q_end]
```
Move this out of the matplotlib/CSV debug script and into the actual serializer — return
plain lists, not numpy arrays, and drop the CSV/PNG side effects from production code.

---

## 6. SSE event contract

```
data: {"type":"agent_status","agent":"planner","status":"started"}
data: {"type":"agent_status","agent":"planner","status":"retrying","reason":"missed entities: ['digital twins']"}
data: {"type":"agent_status","agent":"planner","status":"awaiting_human_input"}
data: {"type":"planner_verification","data":{ ...verification_report... }}
...  [stream pauses here until the frontend resumes] ...
data: {"type":"agent_status","agent":"planner","status":"done"}
data: {"type":"planner_result","data":{ ...PlannerTrace, camelCase per Section 5... }}
```

**New resume endpoint required** (not previously in the backend handoff doc — flag this
to whoever owns the API contract):
```
POST /api/v1/chats/:chatId/messages/:messageId/resume
Body: { "approvedPlan": {...} } | { "editedSubQuestions": [...] } | { "regenerate": true }
```

---

## 7. Frontend visual & interactive requirements

- Verification report rendered as a checklist — one row per check (Entity Coverage,
  Requirement Coverage, Self-Consistency, Attention Grounding), each with icon + status +
  one-line reason. Never color alone (a11y requirement, carried over from every other
  agent's UI).
- If a check's status is `SKIPPED`, show it plainly (e.g. "skipped — high initial
  confidence") rather than hiding the row — the point of glass-box UI is showing what
  *didn't* run too.
- HITL pause state: a distinct panel (not a silent stall) showing the plan, the failed
  checks with reasons, and an edit affordance (inline edit on sub-question text, an
  "add missed keyword" chip input) plus Approve / Regenerate actions.

---

## 8. Edge cases & error handling

- GLiNER fails to load at startup → **raise**, don't silently continue with `None` —
  reference entities are load-bearing for two of the four checks.
- `initial_confidence` missing/malformed from structured output → treat as "borderline,"
  always trigger self-consistency as a safe fallback.
- Self-consistency triggered but a sampled generation call errors/times out → degrade
  gracefully: mark `self_consistency` as `SKIPPED` with reason `"generation error"`, don't
  crash the node.
- Requirement coverage parse yields no distinct clauses (single-clause query) →
  `SKIPPED`, not `PASS`/`FAIL`.
- HITL escalation with no human response within the timeout window → apply whatever
  fallback policy you documented in Section 3.6 — don't leave this undefined.
- Retry limit is exactly 1 — a second consecutive `FAIL` always routes to HITL, never a
  second silent retry.

---

## 9. Acceptance checklist

- [ ] `confidence` / `confidence_flag` are **never** derived from the LLM's self-reported
      `initial_confidence` — only from the verification report.
- [ ] `verification_report` always includes all four check keys, even when `SKIPPED`.
- [ ] Self-consistency triggers only per the cost-aware rule — not on every single query.
- [ ] `entity_coverage == FAIL` always forces `overall_status = FAIL`, regardless of the
      other three checks.
- [ ] `retried` / `retry_reason` populated correctly; retry happens **at most once**.
- [ ] `awaiting_human_input` path has a real resume mechanism (new endpoint), not a UI
      dead-end.
- [ ] "Reference entities" terminology used throughout code, comments, and report —
      "ground truth" does not appear anywhere.
- [ ] Attention proxy model is documented as an *independent grounding check*, never as
      "explaining the 32B's decision."
- [ ] GLiNER, the raw OpenAI client, and the tokenizer are module-level singletons — not
      recreated on every call.
- [ ] `keywords`, `reference_entities`, `verification_report`, `confidence`,
      `confidence_flag`, `retried`, `retry_reason`, `current_step_index` are all present
      in the returned state dict (fixes the earlier bug where a `PlannerOutput` object was
      built and then never returned).
