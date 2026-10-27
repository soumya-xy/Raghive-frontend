import { ReasoningTrace } from "../types";

export const MOCK_TRACE_INCEPTION: ReasoningTrace = {
  planner: {
    steps: [
      { id: "step_1", text: "Identify the director of the film 'Inception'." },
      { id: "step_2", text: "Identify the latest movie directed by Christopher Nolan.", dependsOn: ["step_1"] },
      { id: "step_3", text: "Synthesize findings into a concise, factual answer with release date context.", dependsOn: ["step_2"] },
    ],
    keywords: ["Inception", "director", "latest movie", "filmography"],
    confidence: 0.96,
    confidenceLevel: "HIGH",
    attentionMatrix: [
      [0.92, 0.85, 0.12, 0.05],
      [0.40, 0.94, 0.88, 0.15],
      [0.10, 0.25, 0.91, 0.82],
    ],
    rowLabels: ["Step 1 (Director ID)", "Step 2 (Latest Movie)", "Step 3 (Synthesis)"],
    colLabels: ["Inception", "Director", "Latest Movie", "Filmography"],
    retried: false,
  },
  extractor: {
    subQueries: [
      {
        query: "Who directed the movie Inception?",
        chunks: [
          {
            id: "chunk_101",
            sourceDocument: "Wikipedia_Christopher_Nolan_Filmography.pdf",
            text: "Inception is a 2010 science fiction action film written and directed by Christopher Nolan, starring Leonardo DiCaprio.",
            similarityScore: 0.94,
            attributionScore: 0.98,
            keptForReasoning: true,
          },
          {
            id: "chunk_102",
            sourceDocument: "Cinema_Today_2010_Archive.pdf",
            text: "Leonardo DiCaprio starred in Inception, which premiered in London on July 8, 2010.",
            similarityScore: 0.72,
            attributionScore: 0.41,
            keptForReasoning: false,
          },
        ],
      },
      {
        query: "What is Christopher Nolan's latest film?",
        chunks: [
          {
            id: "chunk_103",
            sourceDocument: "Variety_Nolan_Oppenheimer_Release.pdf",
            text: "Oppenheimer is a 2023 biographical drama film written and directed by Christopher Nolan, documenting the life of J. Robert Oppenheimer.",
            similarityScore: 0.91,
            attributionScore: 0.95,
            keptForReasoning: true,
          },
          {
            id: "chunk_104",
            sourceDocument: "Universal_Pictures_Press_Release_2024.pdf",
            text: "Christopher Nolan won Best Director at the 96th Academy Awards for Oppenheimer.",
            similarityScore: 0.85,
            attributionScore: 0.89,
            keptForReasoning: true,
          },
          {
            id: "chunk_105",
            sourceDocument: "IMDb_Trivia_Nolan.txt",
            text: "Christopher Nolan often uses non-linear timelines and IMAX film stock in his productions.",
            similarityScore: 0.58,
            attributionScore: 0.22,
            keptForReasoning: false,
          },
        ],
      },
    ],
  },
  qa: {
    answer:
      "The director of Inception is Christopher Nolan. His latest released feature film is Oppenheimer (2023), for which he won the Academy Award for Best Director.",
    faithfulnessScore: 0.95,
    citations: [
      {
        sentenceSpan: [0, 52], // "The director of Inception is Christopher Nolan."
        evidenceChunkIds: ["chunk_101"],
      },
      {
        sentenceSpan: [53, 149], // "His latest released feature film is Oppenheimer (2023)..."
        evidenceChunkIds: ["chunk_103", "chunk_104"],
      },
    ],
    erasureTestChanged: true,
    belowGroundingThreshold: false,
  },
};

export const MOCK_TRACE_RETRY: ReasoningTrace = {
  planner: {
    steps: [
      { id: "step_1", text: "Extract cybersecurity protocols for SCADA systems." },
      { id: "step_2", text: "Map physical safety interlocks in cyber-physical power grids." },
      { id: "step_3", text: "Cross-reference IEEE 1547 standards for grid tie-in resilience." },
    ],
    keywords: ["cyber-physical", "power grid", "IEEE 1547", "SCADA"],
    confidence: 0.92,
    confidenceLevel: "HIGH",
    attentionMatrix: [
      [0.95, 0.70, 0.20, 0.88],
      [0.91, 0.94, 0.45, 0.60],
      [0.30, 0.82, 0.96, 0.40],
    ],
    rowLabels: ["SCADA Protocol", "Physical Interlocks", "IEEE 1547 Grid Standard"],
    colLabels: ["cyber-physical", "power grid", "IEEE 1547", "SCADA"],
    retried: true,
    retryReason: "Attention check failed on critical keyword 'cyber-physical' during initial pass. Re-decomposed query to mandate physical interlock validation.",
  },
  extractor: {
    subQueries: [
      {
        query: "What are cyber-physical security standards for power grids?",
        chunks: [
          {
            id: "chunk_201",
            sourceDocument: "NIST_SP_800-82_Rev3.pdf",
            text: "Cyber-physical systems in smart grids require zero-trust perimeter segmentation combined with physical tamper detection at remote terminal units (RTUs).",
            similarityScore: 0.92,
            attributionScore: 0.94,
            keptForReasoning: true,
          },
          {
            id: "chunk_202",
            sourceDocument: "IEEE_1547_Distributed_Energy.pdf",
            text: "IEEE 1547-2018 mandates cybersecurity controls for distributed energy resources connecting to the electric power system.",
            similarityScore: 0.88,
            attributionScore: 0.91,
            keptForReasoning: true,
          },
          {
            id: "chunk_203",
            sourceDocument: "Legacy_Grid_Manual_2012.pdf",
            text: "Analog relays do not connect to ethernet networks.",
            similarityScore: 0.45,
            attributionScore: 0.12,
            keptForReasoning: false,
          },
        ],
      },
    ],
  },
  qa: {
    answer:
      "Cyber-physical power grid security relies on zero-trust perimeter segmentation (NIST SP 800-82 Rev 3) paired with IEEE 1547-2018 cybersecurity mandates for distributed energy resource interconnection.",
    faithfulnessScore: 0.92,
    citations: [
      {
        sentenceSpan: [0, 102],
        evidenceChunkIds: ["chunk_201"],
      },
      {
        sentenceSpan: [103, 195],
        evidenceChunkIds: ["chunk_202"],
      },
    ],
    erasureTestChanged: true,
    belowGroundingThreshold: false,
  },
};

export const MOCK_TRACE_MEDIUM: ReasoningTrace = {
  planner: {
    steps: [
      { id: "step_1", text: "Describe NormEnsembleXAI attribution scoring algorithm." },
      { id: "step_2", text: "Evaluate gradient-based vs leave-one-out importance signals." },
    ],
    keywords: ["NormEnsembleXAI", "gradient-based", "leave-one-out"],
    confidence: 0.76,
    confidenceLevel: "MEDIUM",
    attentionMatrix: [
      [0.85, 0.65, 0.40],
      [0.50, 0.88, 0.79],
    ],
    rowLabels: ["NormEnsembleXAI", "Gradient vs Leave-One-Out"],
    colLabels: ["NormEnsembleXAI", "gradient-based", "leave-one-out"],
    retried: false,
  },
  extractor: {
    subQueries: [
      {
        query: "How does NormEnsembleXAI calculate chunk attribution?",
        chunks: [
          {
            id: "chunk_301",
            sourceDocument: "RAGHive_Architecture_Whitepaper.pdf",
            text: "NormEnsembleXAI combines normalized integrated gradients with leave-one-out token erasure saliency to produce a robust 0-1 attribution score per chunk.",
            similarityScore: 0.86,
            attributionScore: 0.89,
            keptForReasoning: true,
          },
          {
            id: "chunk_302",
            sourceDocument: "Generic_XAI_Survey.pdf",
            text: "LIME and SHAP are popular explainability frameworks for tabular machine learning models.",
            similarityScore: 0.61,
            attributionScore: 0.25,
            keptForReasoning: false,
          },
        ],
      },
    ],
  },
  qa: {
    answer:
      "NormEnsembleXAI computes chunk attribution by ensembling normalized integrated gradients with leave-one-out token erasure signals, ensuring only grounded evidence influences generation.",
    faithfulnessScore: 0.88,
    citations: [
      {
        sentenceSpan: [0, 162],
        evidenceChunkIds: ["chunk_301"],
      },
    ],
    erasureTestChanged: true,
    belowGroundingThreshold: false,
  },
};
