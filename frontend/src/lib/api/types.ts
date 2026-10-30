export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface VerificationCheck {
  status: "PASS" | "FAIL" | "WARNING" | "STABLE" | "UNSTABLE" | "SKIPPED";
  reason?: string;
  missed?: string[];
  missedRequirements?: string[];
  semanticSimilarity?: number;
  structuralAgreement?: number;
  overallXaiScore?: number;
  ignoredEntities?: string[];
}

export interface PlannerTrace {
  steps: { id: string; text: string; dependsOn?: string[] }[];
  keywords: string[];
  confidence: number; // 0..1 — fraction of independent verification checks passed
  confidenceLevel: ConfidenceLevel;
  attentionMatrix: number[][]; // rows x cols
  rowLabels: string[];
  colLabels: string[];
  retried: boolean;
  retryReason?: string;
  verificationChecks?: {
    entityCoverage: VerificationCheck;
    requirementCoverage: VerificationCheck;
    selfConsistency: VerificationCheck;
    attentionXai: VerificationCheck;
  };
}

export interface EvidenceChunk {
  id: string;
  sourceDocument: string;
  pageNumber?: number;
  text: string;
  similarityScore: number; // 0..1
  attributionScore: number; // 0..1 (NormEnsembleXAI)
  keptForReasoning: boolean;
  filterReason?: string;
}

export interface ExtractorTrace {
  subQueries: { query: string; chunks: EvidenceChunk[] }[];
  evaluationPassed?: boolean;
  hitRate?: number;
  mrr?: number;
  contextPrecision?: number;
}

export interface QATrace {
  answer: string;
  faithfulnessScore: number; // 0..1
  citations: { sentenceSpan: [number, number]; evidenceChunkIds: string[] }[];
  erasureTestChanged: boolean;
  belowGroundingThreshold: boolean;
  faithfulnessTier?: ConfidenceLevel;
}

export interface ReasoningTrace {
  planner: PlannerTrace | null;
  extractor: ExtractorTrace | null;
  qa: QATrace | null;
}

export interface StreamEvent {
  type:
    | "agent_status"
    | "planner_result"
    | "planner_verification"
    | "extractor_result"
    | "token"
    | "qa_result"
    | "awaiting_human_input"
    | "done"
    | "error";
  agent?: string;
  status?: string;
  data?: any;
  messageId?: string;
  message?: string;
  pending?: boolean;
  reason?: string;
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
  pending?: boolean;
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
