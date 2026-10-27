"""Seed knowledge base so demo queries retrieve real evidence without uploads."""
from __future__ import annotations

SEED_DOCUMENTS: list[dict[str, str]] = [
    {
        "source": "Wikipedia_Christopher_Nolan_Filmography.pdf",
        "text": (
            "Inception is a 2010 science fiction action film written and directed by Christopher Nolan, "
            "starring Leonardo DiCaprio. The film follows a professional thief who steals information "
            "by infiltrating the subconscious. Nolan also directed The Dark Knight trilogy, Interstellar, "
            "Dunkirk, Tenet, and Oppenheimer."
        ),
    },
    {
        "source": "Cinema_Today_2010_Archive.pdf",
        "text": (
            "Leonardo DiCaprio starred in Inception, which premiered in London on July 8, 2010. "
            "The premiere was a media event but does not identify the film's director on its own."
        ),
    },
    {
        "source": "Variety_Nolan_Oppenheimer_Release.pdf",
        "text": (
            "Oppenheimer is a 2023 biographical drama film written and directed by Christopher Nolan, "
            "documenting the life of J. Robert Oppenheimer. It is Nolan's latest released feature film "
            "as of 2024, following Tenet (2020)."
        ),
    },
    {
        "source": "Universal_Pictures_Press_Release_2024.pdf",
        "text": (
            "Christopher Nolan won Best Director at the 96th Academy Awards for Oppenheimer. "
            "The film also won Best Picture. Nolan's previous Best Director nominations include "
            "Memento, Inception, and Dunkirk."
        ),
    },
    {
        "source": "IMDb_Trivia_Nolan.txt",
        "text": (
            "Christopher Nolan often uses non-linear timelines and IMAX film stock in his productions. "
            "He frequently collaborates with composer Hans Zimmer and cinematographer Hoyte van Hoytema."
        ),
    },
    {
        "source": "NIST_SP_800-82_Rev3.pdf",
        "text": (
            "Cyber-physical systems in smart grids require zero-trust perimeter segmentation combined "
            "with physical tamper detection at remote terminal units (RTUs). NIST SP 800-82 Rev 3 "
            "guides industrial control system security, including SCADA environments."
        ),
    },
    {
        "source": "IEEE_1547_Distributed_Energy.pdf",
        "text": (
            "IEEE 1547-2018 mandates cybersecurity controls for distributed energy resources connecting "
            "to the electric power system. Physical safety interlocks must remain independent of "
            "compromised cyber channels in cyber-physical power grids."
        ),
    },
    {
        "source": "Legacy_Grid_Manual_2012.pdf",
        "text": (
            "Analog relays do not connect to ethernet networks. This legacy guidance predates modern "
            "SCADA IP backbones and is not a current cyber-physical control standard."
        ),
    },
    {
        "source": "RAGHive_Architecture_Whitepaper.pdf",
        "text": (
            "NormEnsembleXAI combines normalized integrated gradients with leave-one-out token erasure "
            "saliency to produce a robust 0-1 attribution score per chunk. A chunk is kept only if both "
            "cosine similarity and the ensembled attribution score clear configured thresholds."
        ),
    },
    {
        "source": "Generic_XAI_Survey.pdf",
        "text": (
            "LIME and SHAP are popular explainability frameworks for tabular machine learning models. "
            "They are not the dual-scoring engine used by RAGHive's Extractor agent."
        ),
    },
    {
        "source": "ChromaDB_Retrieval_Notes.pdf",
        "text": (
            "ChromaDB stores dense embeddings for approximate nearest-neighbour search. RAGHive uses "
            "BGE-M3 (or a MiniLM fallback) to embed sub-questions produced by the Planner, then reranks "
            "the top-N candidates with a cross-encoder before dual scoring."
        ),
    },
    {
        "source": "vLLM_Qwen_Attention_Notes.pdf",
        "text": (
            "vLLM serving Qwen2.5-32B-Instruct does not expose per-layer attention weights. RAGHive "
            "therefore loads Qwen2.5-0.5B-Instruct locally as an independent grounding proxy, then "
            "unloads it immediately after the attention pass."
        ),
    },
]


def seed_if_empty() -> int:
    from app.services.vectorstore import chunk_id, collection_count, upsert_chunks

    if collection_count() > 0:
        return 0
    chunks = []
    for i, doc in enumerate(SEED_DOCUMENTS, start=1):
        chunks.append(
            {
                "id": chunk_id(doc["source"], i, doc["text"]),
                "source": doc["source"],
                "page": i,
                "text": doc["text"],
            }
        )
    return upsert_chunks(chunks)
