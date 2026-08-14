import {
  getAnalysisPromptProfile,
  getDraftingPromptProfile,
  type AnalysisPromptProfile,
  type LegalAnalysisEcosystem,
  type LegalDraftingArea,
} from "../../shared/legal-contracts";

const isElectron = typeof window !== 'undefined' && 'lexDesktop' in window;

export interface AnalysisResponse {
  result: any;
  requestId: string;
  ecosystem: LegalAnalysisEcosystem;
  module: 'analysis';
  promptProfile: AnalysisPromptProfile;
  currentDocumentOnly: true;
  engine: 'byok';
  requestedExecutionMode: 'byok';
  provider?: 'gemini' | 'openai' | 'anthropic';
  fallbackReason?: string;
}

export interface DraftTemplateContext {
  id: string;
  title: string;
  prompt: string;
  requiredFields?: string[];
  output?: string;
}

export interface UserReferenceFile {
  name: string;
  mimeType: 'application/pdf' | 'text/plain' | 'text/markdown';
  base64: string;
}

const IPC_TIMEOUT_MS = 60000; // Timeout de red y procesamiento del proveedor BYOK

const withTimeout = <T>(promise: Promise<T>, ms: number = IPC_TIMEOUT_MS): Promise<T> => {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Tiempo de espera agotado. El proveedor de IA no respondió a tiempo.'));
    }, ms);
  });
  return Promise.race([
    promise.then(res => {
      clearTimeout(timeoutId);
      return res;
    }), 
    timeoutPromise
  ]);
};

export const analyzeFiscalDocument = async (
  files: { base64: string; mimeType: string; name: string }[],
  prompt: string
): Promise<AnalysisResponse> => {
  return analyzeDocument(files, prompt, 'fiscal');
};

export const analyzeDocument = async (
  files: { base64: string; mimeType: string; name: string }[],
  prompt: string,
  ecosystem: LegalAnalysisEcosystem = 'fiscal'
): Promise<AnalysisResponse> => {
  if (!isElectron) {
    throw new Error('Lex Corporativo requiere el runtime de escritorio local.');
  }
  return withTimeout(window.lexDesktop.analysis.analyzeDocument({
    caseId: 'temp',
    files,
    focusedInstruction: prompt,
    ecosystem,
    module: 'analysis',
    currentDocumentOnly: true,
    promptProfile: getAnalysisPromptProfile(ecosystem),
  })) as Promise<AnalysisResponse>;
};

export const draftLegalDocument = async (
  requirements: string,
  module: LegalDraftingArea,
  template?: DraftTemplateContext,
  sourceAnalysisId?: string,
  referenceFile?: UserReferenceFile,
) => {
  if (!isElectron) {
    throw new Error('Lex Corporativo requiere el runtime de escritorio local.');
  }
  return withTimeout(window.lexDesktop.drafts.generateDraft({
    requirements,
    ecosystem: module,
    workflowModule: 'drafting',
    sourceAnalysisId,
    templateId: template?.id,
    promptProfile: getDraftingPromptProfile(module),
    template,
    referenceFile,
  }));
};

export const analyzeEngineeringDocument = async (
  files: { base64: string; mimeType: string; name: string }[],
  prompt: string,
  ecosystem: LegalAnalysisEcosystem = 'mercantil',
): Promise<AnalysisResponse> => {
  return analyzeDocument(files, prompt, ecosystem);
};
