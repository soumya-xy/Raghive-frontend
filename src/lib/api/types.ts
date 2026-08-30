export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface PlannerTrace {
  steps: { id: string; text: string; dependsOn?: string[] }[];
  keywords: string[];
  confidence: number; // 0..1
  confidenceLevel: ConfidenceLevel;
  attentionMatrix: number[][]; // rows x cols
  rowLabels: string[];
  colLabels: string[];
  retried: boolean;
  retryReason?: string;
}

export interface EvidenceChunk {
  id: string;
  sourceDocument: string;
  text: string;
  similarityScore: number; // 0..1
  attributionScore: number; // 0..1 (NormEnsembleXAI)
  keptForReasoning: boolean;
}

export interface ExtractorTrace {
  subQueries: { query: string; chunks: EvidenceChunk[] }[];
}

export interface QATrace {
  answer: string;
  faithfulnessScore: number; // 0..1
  citations: { sentenceSpan: [number, number]; evidenceChunkIds: string[] }[];
  erasureTestChanged: boolean;
  belowGroundingThreshold: boolean;
}

export interface ReasoningTrace {
  planner: PlannerTrace;
  extractor: ExtractorTrace;
  qa: QATrace;
}

export interface StreamEvent {
  type:
    | "agent_status"
    | "planner_result"
    | "extractor_result"
    | "token"
    | "qa_result"
    | "done"
    | "error";
  agent?: string;
  status?: string;
  data?: any;
  messageId?: string;
  message?: string;
}

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: string;
  pinned: boolean;
  messageCount: number;
  avgFaithfulness?: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  trace?: ReasoningTrace;
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface UserPreferences {
  theme?: "light" | "dark" | "system";
  density?: "comfortable" | "compact";
  alwaysShowTrace?: boolean;
  verificationStrictness?: "standard" | "thorough";
  showHeatmapsByDefault?: boolean;
}
