import { ChatSummary, Message } from "../types";
import { MOCK_TRACE_INCEPTION, MOCK_TRACE_RETRY, MOCK_TRACE_MEDIUM } from "./mock-trace";

export const MOCK_CHATS: ChatSummary[] = [
  {
    id: "chat_inception_101",
    title: "Christopher Nolan Inception & Latest Film",
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    pinned: true,
    messageCount: 2,
    avgFaithfulness: 0.95,
  },
  {
    id: "chat_cyber_202",
    title: "Cyber-Physical Power Grid Safety",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hrs ago
    pinned: false,
    messageCount: 2,
    avgFaithfulness: 0.92,
  },
  {
    id: "chat_xai_303",
    title: "NormEnsembleXAI Attribution Engine",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Yesterday
    pinned: false,
    messageCount: 2,
    avgFaithfulness: 0.88,
  },
  {
    id: "chat_chroma_404",
    title: "ChromaDB Sub-Question Vector Search",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    pinned: false,
    messageCount: 4,
    avgFaithfulness: 0.91,
  },
  {
    id: "chat_vllm_505",
    title: "Qwen2.5-32B Attention Saliency Benchmarks",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(), // 8 days ago
    pinned: false,
    messageCount: 6,
    avgFaithfulness: 0.94,
  },
];

export const MOCK_MESSAGES_MAP: Record<string, Message[]> = {
  chat_inception_101: [
    {
      id: "msg_user_1",
      role: "user",
      content: "Who is the director of Inception and what is their latest movie?",
      createdAt: new Date(Date.now() - 1000 * 60 * 16).toISOString(),
    },
    {
      id: "msg_asst_1",
      role: "assistant",
      content:
        "The director of Inception is Christopher Nolan. His latest released feature film is Oppenheimer (2023), for which he won the Academy Award for Best Director.",
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      trace: MOCK_TRACE_INCEPTION,
    },
  ],
  chat_cyber_202: [
    {
      id: "msg_user_2",
      role: "user",
      content: "What are the key security standards for cyber-physical power grids?",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3.1).toISOString(),
    },
    {
      id: "msg_asst_2",
      role: "assistant",
      content:
        "Cyber-physical power grid security relies on zero-trust perimeter segmentation (NIST SP 800-82 Rev 3) paired with IEEE 1547-2018 cybersecurity mandates for distributed energy resource interconnection.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      trace: MOCK_TRACE_RETRY,
    },
  ],
  chat_xai_303: [
    {
      id: "msg_user_3",
      role: "user",
      content: "Explain how NormEnsembleXAI works in RAGHive.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24.1).toISOString(),
    },
    {
      id: "msg_asst_3",
      role: "assistant",
      content:
        "NormEnsembleXAI computes chunk attribution by ensembling normalized integrated gradients with leave-one-out token erasure signals, ensuring only grounded evidence influences generation.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      trace: MOCK_TRACE_MEDIUM,
    },
  ],
};
