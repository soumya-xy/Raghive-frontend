from __future__ import annotations

import asyncio
import json
import logging
import sys
import time
from typing import Any, Optional

import numpy as np

logger = logging.getLogger(__name__)

# Standard benchmark questions aligned with the indexed college DBMS corpus
BENCHMARK_DATASET = [
    {
        "question": "What are the three levels in the Three Schema Architecture?",
        "ground_truth": "The three levels of the Three Schema Architecture are the Physical (or Internal) level, the Logical (or Conceptual) level, and the View (or External) level.",
        "expected_keywords": ["physical", "logical", "view", "internal", "conceptual", "external", "schema"],
    },
    {
        "question": "What is the difference between physical and logical data independence?",
        "ground_truth": "Physical data independence is the ability to modify the physical schema without changing the logical schema. Logical data independence is the ability to change the logical schema without modifying external schemas or application programs.",
        "expected_keywords": ["physical", "logical", "data independence", "schema", "application programs"],
    },
    {
        "question": "What is the primary purpose of a Database Management System (DBMS)?",
        "ground_truth": "A DBMS is software used to manage databases. Its primary purpose is to provide an efficient and convenient way to store, retrieve, update, and manage data while maintaining security and integrity.",
        "expected_keywords": ["manage", "database", "store", "retrieve", "security", "integrity"],
    },
    {
        "question": "What is the difference between DDL and DML in SQL?",
        "ground_truth": "Data Definition Language (DDL) is used to define and manage database structures and schemas (like CREATE, ALTER, DROP), while Data Manipulation Language (DML) is used to manipulate and query data within the database (like SELECT, INSERT, UPDATE, DELETE).",
        "expected_keywords": ["ddl", "dml", "definition", "manipulation", "schema", "query"],
    },
]


def _lexical_recall(ground_truth: str, answer_and_context: str) -> float:
    """Compute token coverage of ground truth within the retrieved context/answer."""
    import re
    gt_tokens = set(re.findall(r"\w{3,}", ground_truth.lower()))
    ctx_tokens = set(re.findall(r"\w{3,}", answer_and_context.lower()))
    if not gt_tokens:
        return 1.0
    overlap = len(gt_tokens & ctx_tokens)
    return float(np.clip(overlap / len(gt_tokens), 0.0, 1.0))


def _compute_keyword_precision(expected_keywords: list[str], context_text: str) -> float:
    """Compute what fraction of target keywords appear in retrieved contexts."""
    if not expected_keywords:
        return 1.0
    text_lower = context_text.lower()
    matches = sum(1 for kw in expected_keywords if kw.lower() in text_lower)
    return float(np.clip(matches / len(expected_keywords), 0.0, 1.0))


async def run_live_pipeline_query(question: str) -> dict[str, Any]:
    """Execute the full RAGHive streaming pipeline and return answer + context."""
    from app.services.pipeline import run_query_stream

    chunks_retrieved = []
    answer_tokens = []
    final_trace = None

    async for event in run_query_stream(question, strictness="standard"):
        etype = event.get("type")
        if etype == "token":
            answer_tokens.append(event.get("data") or "")
        elif etype == "extractor_result":
            data = event.get("data") or {}
            for sq in data.get("subQueries") or []:
                for chk in sq.get("chunks") or []:
                    if chk.get("keptForReasoning"):
                        chunks_retrieved.append(chk.get("text") or "")
        elif etype == "completed":
            final_trace = event.get("trace") or {}

    answer = "".join(answer_tokens).strip()
    return {
        "question": question,
        "answer": answer,
        "contexts": chunks_retrieved,
        "trace": final_trace,
    }


def evaluate_dataset_with_ragas(
    dataset_records: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Run Ragas evaluation using native metrics if OpenAI / Groq LLM client is available,
    with an automatic deterministic fallback if evaluation rate limits trigger.
    """
    try:
        from datasets import Dataset
        from ragas import evaluate
        from ragas.metrics.collections import (
            AnswerRelevancy,
            ContextPrecision,
            ContextRecall,
            Faithfulness,
        )

        data_dict = {
            "question": [r["question"] for r in dataset_records],
            "answer": [r["answer"] for r in dataset_records],
            "contexts": [r["contexts"] for r in dataset_records],
            "ground_truth": [r["ground_truth"] for r in dataset_records],
        }
        hf_dataset = Dataset.from_dict(data_dict)

        logger.info("[ragas] Running native Ragas evaluation over %d samples...", len(dataset_records))
        result = evaluate(
            hf_dataset,
            metrics=[
                Faithfulness(),
                AnswerRelevancy(),
                ContextPrecision(),
                ContextRecall(),
            ],
        )
        return {
            "faithfulness": float(result.get("faithfulness", 0.0)),
            "answer_relevancy": float(result.get("answer_relevancy", 0.0)),
            "context_precision": float(result.get("context_precision", 0.0)),
            "context_recall": float(result.get("context_recall", 0.0)),
            "evaluation_engine": "ragas-native",
        }
    except Exception as exc:
        logger.warning("[ragas] Native Ragas run skipped/failed (%s); using deterministic evaluation metrics.", exc)
        return evaluate_dataset_deterministic(dataset_records)


def evaluate_dataset_deterministic(
    dataset_records: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Deterministic scoring for evaluation when external judge LLM is unavailable:
      - Faithfulness: overlap between answer tokens and evidence contexts
      - Answer Relevancy: overlap between question tokens and generated answer
      - Context Precision: fraction of retrieved chunks matching expected query keywords
      - Context Recall: fraction of ground truth facts covered by retrieved chunks
    """
    faithfulness_scores = []
    relevancy_scores = []
    precision_scores = []
    recall_scores = []

    for item in dataset_records:
        question = item["question"]
        answer = item["answer"]
        contexts = item.get("contexts") or []
        ground_truth = item.get("ground_truth") or ""
        expected_keywords = item.get("expected_keywords") or []

        all_context_text = " ".join(contexts)

        # 1. Faithfulness: is answer supported by context?
        f_score = _lexical_recall(answer, all_context_text) if answer else 0.0
        faithfulness_scores.append(f_score)

        # 2. Answer Relevancy: does answer cover question?
        rel_score = _lexical_recall(question, answer) if answer else 0.0
        relevancy_scores.append(rel_score)

        # 3. Context Precision: are retrieved chunks on-target?
        p_score = _compute_keyword_precision(expected_keywords, all_context_text)
        precision_scores.append(p_score)

        # 4. Context Recall: did contexts retrieve ground truth?
        r_score = _lexical_recall(ground_truth, all_context_text)
        recall_scores.append(r_score)

    return {
        "faithfulness": float(np.mean(faithfulness_scores)) if faithfulness_scores else 0.0,
        "answer_relevancy": float(np.mean(relevancy_scores)) if relevancy_scores else 0.0,
        "context_precision": float(np.mean(precision_scores)) if precision_scores else 0.0,
        "context_recall": float(np.mean(recall_scores)) if recall_scores else 0.0,
        "sample_count": len(dataset_records),
        "evaluation_engine": "deterministic-harness",
    }


async def run_benchmark(max_samples: int = 2) -> dict[str, Any]:
    """Run full benchmark through the active RAGHive pipeline and evaluate."""
    print(f"\n=======================================================")
    print(f" RAGHive RAGAS Evaluation Benchmark")
    print(f"=======================================================")

    records = []
    samples = BENCHMARK_DATASET[:max_samples]

    for idx, item in enumerate(samples, start=1):
        q = item["question"]
        print(f"\n[{idx}/{len(samples)}] Query: {q}")
        t0 = time.time()
        res = await run_live_pipeline_query(q)
        dt = time.time() - t0
        print(f"       Answer: {res['answer'][:100]}...")
        print(f"       Contexts kept: {len(res['contexts'])} | Latency: {dt:.2f}s")

        records.append(
            {
                "question": q,
                "answer": res["answer"],
                "contexts": res["contexts"] if res["contexts"] else ["(no context)"],
                "ground_truth": item["ground_truth"],
                "expected_keywords": item["expected_keywords"],
            }
        )

    print("\nComputing RAGAS evaluation metrics...")
    eval_result = evaluate_dataset_with_ragas(records)

    print("\n-------------------------------------------------------")
    print(" RAGAS Evaluation Summary")
    print("-------------------------------------------------------")
    print(f"  Faithfulness:      {eval_result['faithfulness']:.4f}")
    print(f"  Answer Relevancy:  {eval_result['answer_relevancy']:.4f}")
    print(f"  Context Precision: {eval_result['context_precision']:.4f}")
    print(f"  Context Recall:    {eval_result['context_recall']:.4f}")
    print(f"  Engine:            {eval_result['evaluation_engine']}")
    print("-------------------------------------------------------\n")
    return eval_result


if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    asyncio.run(run_benchmark(max_samples=count))

