
// Local desktop user profile.
export interface LexUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export enum AppView {
  INTRODUCTION = 'INTRODUCTION',
  DASHBOARD = 'DASHBOARD',
  PORTAFOLIO = 'PORTAFOLIO',
  FISCAL = 'FISCAL',
  LEGAL_ENGINEERING = 'LEGAL_ENGINEERING',
  PRIVACY = 'PRIVACY',
  TERMS = 'TERMS',
  SETTINGS = 'SETTINGS'
}

export type ModuleTab =
  | 'analysis'
  | 'fiscal-consultation'
  | 'fiscal-preparation'
  | 'fiscal-materiality'
  | 'fiscal-deductibility'
  | 'fiscal-documentation'
  | 'drafting'
  | 'fiscal-regulations';

export type FiscalOperationStep = 'preparation' | 'materiality' | 'deductibility' | 'documentation';

export interface FiscalOperationState {
  title: string;
  description: string;
  evidenceFiles: Array<{ name: string; type: string }>;
  materialityAnswers: Record<string, string>;
  deductibilityAnswers: Record<string, string>;
  completedSteps: FiscalOperationStep[];
  updatedAt?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export type LegalFoundation = {
  id: string;
  title: string;
  law: string;
  article?: string;
  excerpt?: string;
  source?: string;
  relevanceScore?: number;
};

export type DocumentAnalysisResult = {
  summary: string;
  documentType: string;
  riskScore: number;
  detectedParties: string[];
  detectedObligations: string[];
  missingClauses: string[];
  missingData?: string[];
  risks: Array<{
    title: string;
    severity: "low" | "medium" | "high";
    explanation: string;
    relatedClauses: string[];
    legalFoundations: LegalFoundation[];
  }>;
  recommendedActions: string[];
  checklist?: string[];
  riskCategories?: {
    materialidad?: string[];
    deducibilidad?: string[];
    ivaAcreditable?: string[];
    operacionesInexistentes?: string[];
  };
  legalFoundations: LegalFoundation[];
  groundingClaims?: Array<{
    claimId: string;
    heading: string;
    text: string;
    sourceIds: string[];
  }>;
  confidence: "low" | "medium" | "high";
  engine: "rules" | "local-embeddings" | "gemma-local" | "local-gemma" | "byok" | "hybrid";
};

export interface AnalyzedFile {
  fileName: string;
  fileBase64: string;
  mimeType: string;
  previewUrl: string | null;
}

export interface AnalyzedDocumentHistory {
  id: string;
  requestId?: string;
  timestamp: string;
  files: { name: string; type: string }[];
  result: DocumentAnalysisResult;
  module: 'fiscal';
  ecosystem?: 'fiscal';
  promptProfile?: 'fiscal_analysis';
  currentDocumentOnly?: true;
  customInstruction: string;
  executionMode?: 'local' | 'byok';
  engine?: 'local-gemma' | 'byok' | 'rules';
  provider?: 'gemini' | 'openai' | 'anthropic';
}

export interface DraftingHistory {
  id: string;
  timestamp: Date | string;
  prompt: string;
  requestId?: string;
  sourceAnalysisId?: string;
  area?: 'mercantil' | 'fiscal';
  ecosystem?: 'mercantil' | 'fiscal';
  promptProfile?: 'mercantil_drafting' | 'fiscal_drafting';
  templateId?: string;
  templateTitle?: string;
  referenceFileName?: string;
  generatedDoc?: string;
  executionMode?: 'local' | 'byok';
  engine?: 'local-gemma' | 'local-template' | 'byok';
  provider?: 'gemini' | 'openai' | 'anthropic';
}

export interface SavedCase {
  id: string;
  name: string;
  date: string;
  module?: 'engineering' | 'fiscal' | 'mercantil';
  createdAt?: string;
  retentionUntil?: string;
  fiscalAnalysisHistory?: AnalyzedDocumentHistory[];
  engineeringDraftingHistory?: DraftingHistory[];
  fiscalDraftingHistory?: DraftingHistory[];
  analysisHistory?: AnalyzedDocumentHistory[];
}

export type NotificationType = 'error' | 'success' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
}

// ── Local license posture ─────────────────────────────────

export interface UserSubscription {
  licenseId: string | null;
  planId?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  freeChatsUsed?: number;
  freeAnalysesUsed?: number;
  freeDraftsUsed?: number;
}

export const DEFAULT_SUBSCRIPTION: UserSubscription = {
  licenseId: null,
  planId: null,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  freeChatsUsed: 0,
  freeAnalysesUsed: 0,
  freeDraftsUsed: 0,
};

// ── Legal Knowledge Infrastructure ──────────────────────────────

export interface LegalCitation {
  sourceId: string;
  sourceType: 'legislation' | 'jurisprudence' | 'regulation' | 'criterion' | 'other';
  legalArea: 'fiscal' | 'mercantil' | string;
  title: string;
  article?: string;
  section?: string;
  authority?: string;
  version?: string;
  effectiveDate?: string;
  lastReformDate?: string;
  lastCheckedAt?: string;
  lastIngestedAt?: string;
  citationLabel: string;
  sourceUrl?: string;
  retrievedTextSnippet?: string;
  relevanceScore?: number;
}
