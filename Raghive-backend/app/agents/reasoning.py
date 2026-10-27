from __future__ import annotations

import re
from typing import Any, Callable, Iterator, Optional

import numpy as np

from app.models.state import GraphState, PlanSteps
from app.services.attention import run_attention_pass
from app.services.embeddings import cosine01, embed_texts
from app.services.llm import chat_complete, chat_stream, llm_available
from app.services.thresholds import get_thresholds

QA_SYSTEM = """You are the RAGHive QA/Reasoning agent.
Answer using ONLY the provided evidence chunks. Cite chunk ids in your reasoning but write a fluent final answer.
If evidence is missing or contradictory, say so clearly and hedge.
Do not invent facts that are not in the evidence."""


def _plan_summary(plan: Optional[PlanSteps]) -> str:
    if not plan:
        return ""
    lines = [f"{sq.step_id}. {sq.question}" for sq in plan.sub_questions]
    return "Verified plan:\n" + "\n".join(lines)


def _build_user_prompt(state: GraphState, query_override: Optional[str] = None) -> str:
    query = query_override or state["original_question"]
    context = state.get("current_context") or ""
    if not context:
        context = "(no surviving evidence chunks)"
    return (
        f"User question: {query}\n\n"
        f"{_plan_summary(state.get('plan'))}\n\n"
        f"Evidence:\n{context}\n\n"
        "Write the final answer as plain prose."
    )


def _heuristic_answer(state: GraphState) -> str:
    docs = [d for d in (state.get("retrieved_docs") or []) if d.get("kept")]
    if not docs:
        return (
            "I don't have enough verified evidence to answer this confidently. "
            "No retrieved chunks survived the Extractor's dual-score filter."
        )
    snippets = " ".join(d["text"] for d in docs[:4])
    return snippets[:900]


def generate_answer(state: GraphState, query_override: Optional[str] = None) -> str:
    prompt = _build_user_prompt(state, query_override)
    if llm_available():
        try:
            return chat_complete(QA_SYSTEM, prompt, temperature=0.0)
        except Exception:
            pass
    return _heuristic_answer(state)


def stream_answer(state: GraphState) -> Iterator[str]:
    prompt = _build_user_prompt(state)
    if llm_available():
        try:
            yield from chat_stream(QA_SYSTEM, prompt, temperature=0.0)
            return
        except Exception:
            pass
    text = _heuristic_answer(state)
    for tok in text.split(" "):
        yield tok + " "


def _sentences(answer: str) -> list[tuple[int, int, str]]:
    try:
        import spacy

        nlp = spacy.blank("en")
        if "sentencizer" not in nlp.pipe_names:
            nlp.add_pipe("sentencizer")
        doc = nlp(answer)
        spans = [(s.start_char, s.end_char, s.text) for s in doc.sents if s.text.strip()]
        if spans:
            return spans
    except Exception:
        pass
    spans = []
    for m in re.finditer(r"[^.!?]+[.!?]+|[^.!?]+$", answer):
        text = m.group(0)
        if text.strip():
            spans.append((m.start(), m.end(), text))
    return spans or [(0, len(answer), answer)]


def _faithfulness(answer: str, evidence: str, keywords: list[str]) -> float:
    if not answer.strip():
        return 0.0
    if not evidence.strip():
        return 0.0
    attn = run_attention_pass(evidence[:1500], answer[:1500], keywords)
    matrix = np.asarray(attn["attention_matrix"])
    q_start, q_end = attn["query_token_span"]  # evidence tokens in this framing
    p_start, p_end = attn["plan_token_span"]  # answer tokens
    if p_end <= p_start or q_end <= q_start:
        return _lexical_faithfulness(answer, evidence)
    ans_to_all = matrix[p_start:p_end, :].sum()
    ans_to_ev = matrix[p_start:p_end, q_start:q_end].sum()
    if ans_to_all <= 1e-9:
        return _lexical_faithfulness(answer, evidence)
    return float(np.clip(ans_to_ev / ans_to_all, 0.0, 1.0))


def _lexical_faithfulness(answer: str, evidence: str) -> float:
    a = set(re.findall(r"[a-z0-9]{3,}", answer.lower()))
    e = set(re.findall(r"[a-z0-9]{3,}", evidence.lower()))
    if not a:
        return 0.0
    return float(np.clip(len(a & e) / len(a), 0.0, 1.0))


def _citations(answer: str, kept_chunks: list[dict[str, Any]], share: float) -> list[dict[str, Any]]:
    spans = _sentences(answer)
    if not kept_chunks:
        return [{"sentence_span": [s, e], "evidence_chunk_ids": []} for s, e, _ in spans]
    chunk_texts = [c["text"] for c in kept_chunks]
    chunk_ids = [c["id"] for c in kept_chunks]
    sent_texts = [t for _, _, t in spans]
    sent_embs = embed_texts(sent_texts)
    chunk_embs = embed_texts(chunk_texts)
    out = []
    for i, (start, end, _) in enumerate(spans):
        sims = [cosine01(sent_embs[i], chunk_embs[j]) for j in range(len(chunk_embs))]
        total = sum(sims) or 1.0
        shares = [s / total for s in sims]
        ids = [chunk_ids[j] for j, sh in enumerate(shares) if sh >= share]
        if not ids and shares:
            best = int(np.argmax(shares))
            if shares[best] >= share * 0.66:
                ids = [chunk_ids[best]]
        if len(ids) > 3:
            top = np.argsort(shares)[::-1][:2]
            ids = [chunk_ids[int(j)] for j in top]
        out.append({"sentence_span": [int(start), int(end)], "evidence_chunk_ids": ids})
    return out


def _mask_keywords(query: str, keywords: list[str]) -> str:
    masked = query
    for kw in sorted(keywords, key=len, reverse=True):
        if not kw.strip():
            continue
        masked = re.sub(re.escape(kw), "[MASKED]", masked, flags=re.I)
    return masked


def _erasure_changed(state: GraphState, original_answer: str, threshold: float, thorough: bool) -> bool:
    """
    Default: embedding-similarity proxy (fast). Thorough mode may regenerate.
    True = the answer depended on the query's key terms (the good outcome).
    """
    keywords = list(state.get("keywords") or [])
    if not keywords or not original_answer.strip():
        return False
    masked_query = _mask_keywords(state["original_question"], keywords)
    if masked_query == state["original_question"]:
        return False
    if thorough and llm_available():
        try:
            masked_answer = generate_answer(state, query_override=masked_query)
            a, b = embed_texts([original_answer, masked_answer])
            return cosine01(a, b) < threshold
        except Exception:
            pass
    # Embedding-similarity proxy: original answer vs masked-query embedding.
    orig_q, mask_q, ans = embed_texts([state["original_question"], masked_query, original_answer])
    sim_orig = cosine01(ans, orig_q)
    sim_mask = cosine01(ans, mask_q)
    # If the answer is about as close to the masked query as to the original, terms were ignored.
    return (sim_orig - sim_mask) > (1.0 - threshold) * 0.5 or sim_mask < threshold


def qa_node(state: GraphState, answer: Optional[str] = None) -> GraphState:
    thr = get_thresholds(state.get("verification_strictness") or "standard")
    text = answer if answer is not None else generate_answer(state)
    kept = [d for d in (state.get("retrieved_docs") or []) if d.get("kept")]
    evidence = state.get("current_context") or ""
    upstream_invalid = not bool(state.get("extraction_valid")) or not kept

    faith = _faithfulness(text, evidence, list(state.get("keywords") or []))
    if upstream_invalid:
        below = True
        if not text.strip():
            text = (
                "I don't have enough verified evidence to answer this confidently. "
                "The Extractor did not keep supporting chunks for this query."
            )
    else:
        below = faith < thr.grounding_threshold

    citations = _citations(text, kept, thr.citation_share)
    # Clamp spans into the answer.
    n = len(text)
    for c in citations:
        s, e = c["sentence_span"]
        c["sentence_span"] = [max(0, min(s, n)), max(0, min(e, n))]

    erasure = _erasure_changed(
        state,
        text,
        thr.erasure_sim_threshold,
        thorough=(state.get("verification_strictness") == "thorough"),
    )

    if faith >= 0.85:
        tier = "HIGH"
    elif faith >= 0.70:
        tier = "MEDIUM"
    else:
        tier = "LOW"

    qa_trace = {
        "answer": text,
        "faithfulness_score": float(np.clip(faith, 0, 1)),
        "citations": citations,
        "erasure_test_changed": erasure,
        "below_grounding_threshold": below,
        "faithfulness_tier": tier,
    }
    state.update(
        {
            "answer": text,
            "qa_trace": qa_trace,
            "qa_valid": not below,
            "history": [{"agent": "qa", "faithfulness": faith, "below": below}],
        }
    )
    return state
