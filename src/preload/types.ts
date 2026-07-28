export interface LexDesktopAPI {
  cases: {
    createCase: (payload: { caseId: string; name: string; module: 'engineering' | 'fiscal' | 'mercantil'; retentionUntil?: string; description?: string }) => Promise<any>;
    listCases: () => Promise<any[]>;
    getCase: (caseId: string) => Promise<any>;
    renameCase: (payload: { caseId: string; name: string }) => Promise<any>;
    deleteCase: (caseId: string) => Promise<any>;
    saveAnalysis: (payload: { caseId: string; analysisId: string; analysisData: any; expectedModule?: 'engineering' | 'fiscal' | 'mercantil' }) => Promise<any>;
    saveDraft: (payload: { caseId: string; draftId: string; draftData: any; expectedModule?: 'engineering' | 'fiscal' | 'mercantil' }) => Promise<any>;
    deleteAnalysis: (payload: { caseId: string; analysisId: string; expectedModule?: 'engineering' | 'fiscal' | 'mercantil' }) => Promise<{ success: true; deleted: boolean }>;
    deleteDraft: (payload: { caseId: string; draftId: string; expectedModule?: 'engineering' | 'fiscal' | 'mercantil' }) => Promise<{ success: true; deleted: boolean }>;
    saveState: (payload: { caseId: string; stateData: Record<string, unknown>; expectedModule?: 'engineering' | 'fiscal' | 'mercantil' }) => Promise<{ success: true }>;
    purgeExpired: () => Promise<{ deleted: number }>;
    exportAll: () => Promise<{
      success: boolean;
      canceled?: boolean;
      filePath?: string;
      caseCount: number;
      packageHash?: string;
    }>;
    deleteAll: (payload: { confirmation: 'DELETE_ALL_LOCAL_DATA' }) => Promise<{ deleted: number }>;
  };
  documents: {
    selectFile: () => Promise<string[] | null>;
    exportPdf: (payload: { base64: string; defaultPath: string }) => Promise<{ success: boolean; canceled?: boolean; filePath?: string }>;
  };
  analysis: {
    analyzeDocument: (payload: {
      caseId?: string;
      documentId?: string;
      files: any[];
      prompt?: string;
      focusedInstruction?: string;
      rules?: 'fiscal';
      ecosystem?: 'fiscal';
      module?: 'analysis';
      currentDocumentOnly?: true;
      promptProfile?: 'fiscal_analysis';
    }) => Promise<{
      result: any;
      requestId: string;
      ecosystem: 'fiscal';
      module: 'analysis';
      promptProfile: 'fiscal_analysis';
      currentDocumentOnly: true;
      engine: 'local-gemma' | 'byok';
      requestedExecutionMode: 'local' | 'byok';
      provider?: 'gemini' | 'openai' | 'anthropic';
      fallbackReason?: string;
    }>;
    onProgress: (callback: (progress: { step: number; label: string; details?: string }) => void) => void;
  };
  drafts: {
    generateDraft: (payload: {
      requirements: string;
      module?: 'mercantil' | 'fiscal';
      ecosystem?: 'mercantil' | 'fiscal';
      workflowModule?: 'drafting';
      sourceAnalysisId?: string;
      templateId?: string;
      promptProfile?: 'mercantil_drafting' | 'fiscal_drafting';
      template?: any;
      referenceFile?: {
        name: string;
        mimeType: 'application/pdf' | 'text/plain' | 'text/markdown';
        base64: string;
      };
    }) => Promise<{
      result: string;
      requestId: string;
      ecosystem: 'mercantil' | 'fiscal';
      module: 'drafting';
      promptProfile: 'mercantil_drafting' | 'fiscal_drafting';
      sourceAnalysisId?: string;
      templateId?: string;
      engine: 'local-gemma' | 'local-template' | 'byok';
      requestedExecutionMode: 'local' | 'byok';
      provider?: 'gemini' | 'openai' | 'anthropic';
      fallbackReason?: string;
    }>;
  };
  legalKnowledge: {
    searchRAG: (payload: { query: string; module: 'mercantil' | 'fiscal'; limit?: number }) => Promise<any>;
  };
  runtime: {
    getHealth: () => Promise<{
      status: 'ready' | 'degraded' | 'blocked';
      checks: Array<{ id: string; label: string; ok: boolean; detail?: string }>;
      rust: {
        binaryPath: string;
        binaryExists: boolean;
        modelsPath: string;
        expectedGgufModel: string;
        expectedGgufModelPath: string;
        expectedGgufModelExists: boolean;
        ggufModels: string[];
        embeddingModelExists: boolean;
        canUseDevelopmentMock: boolean;
        modelPathSource: 'default' | 'environment';
      };
      capabilities: Record<
        'vault' | 'legalSearch' | 'legalGeneration' | 'rulesAssessment' | 'localAssistant',
        { ready: boolean; label: string; detail: string }
      >;
    }>;
  };
  traceability: {
    getStatus: () => Promise<{ path: string; exists: boolean; size: number }>;
    exportLedger: () => Promise<{
      success: boolean;
      reason?: 'empty' | 'canceled';
      filePath?: string;
      sourcePath: string;
    }>;
  };
  byok: {
    getSettings: () => Promise<{
      enabled: boolean;
      provider: 'gemini' | 'openai' | 'anthropic';
      model: string;
      strictPrivacy: boolean;
      automaticUpdatesEnabled: boolean;
      maxInputChars: number;
      hasApiKey: boolean;
      keyStatus: 'missing' | 'ready' | 'unreadable';
      requiresApiKeyReset: boolean;
      apiKeyFingerprint?: string;
      updatedAt?: string;
      providers: Record<'gemini' | 'openai' | 'anthropic', {
        model: string;
        hasApiKey: boolean;
        keyStatus: 'missing' | 'ready' | 'unreadable';
        requiresApiKeyReset: boolean;
        apiKeyFingerprint?: string;
        updatedAt?: string;
      }>;
    }>;
    saveSettings: (payload: {
      enabled: boolean;
      provider?: 'gemini' | 'openai' | 'anthropic';
      model?: string;
      apiKey?: string;
      strictPrivacy?: boolean;
      automaticUpdatesEnabled?: boolean;
      maxInputChars?: number;
    }) => Promise<{
      enabled: boolean;
      provider: 'gemini' | 'openai' | 'anthropic';
      model: string;
      strictPrivacy: boolean;
      automaticUpdatesEnabled: boolean;
      maxInputChars: number;
      hasApiKey: boolean;
      keyStatus: 'missing' | 'ready' | 'unreadable';
      requiresApiKeyReset: boolean;
      apiKeyFingerprint?: string;
      updatedAt?: string;
      providers: Record<'gemini' | 'openai' | 'anthropic', {
        model: string;
        hasApiKey: boolean;
        keyStatus: 'missing' | 'ready' | 'unreadable';
        requiresApiKeyReset: boolean;
        apiKeyFingerprint?: string;
        updatedAt?: string;
      }>;
    }>;
    clearKey: (payload?: { provider?: 'gemini' | 'openai' | 'anthropic' }) => Promise<{
      enabled: boolean;
      provider: 'gemini' | 'openai' | 'anthropic';
      model: string;
      strictPrivacy: boolean;
      automaticUpdatesEnabled: boolean;
      maxInputChars: number;
      hasApiKey: boolean;
      keyStatus: 'missing' | 'ready' | 'unreadable';
      requiresApiKeyReset: boolean;
      apiKeyFingerprint?: string;
      updatedAt?: string;
      providers: Record<'gemini' | 'openai' | 'anthropic', {
        model: string;
        hasApiKey: boolean;
        keyStatus: 'missing' | 'ready' | 'unreadable';
        requiresApiKeyReset: boolean;
        apiKeyFingerprint?: string;
        updatedAt?: string;
      }>;
    }>;
    testConnection: (payload?: { provider?: 'gemini' | 'openai' | 'anthropic'; apiKey?: string; model?: string }) => Promise<{ ok: true; provider: 'gemini' | 'openai' | 'anthropic'; model: string }>;
  };
  settings: {
    getAppVersion: () => Promise<string>;
    getPlatform: () => Promise<'win32' | 'darwin' | 'linux'>;
    onUpdateAvailable: (callback: (version: string) => void) => void;
    onUpdateDownloaded: (callback: () => void) => void;
    checkForUpdates: () => Promise<{ ok: boolean; status: string; version?: string; message?: string }>;
    installUpdate: () => void;
  };
  navigation: {
    onSettings: (callback: () => void) => () => void;
  };
  assistant: {
    askInstructivo: (payload: { query: string; history?: Array<{ role: 'user' | 'model' | 'assistant'; text: string }> }) => Promise<{ result: string }>;
    askFiscal: (payload: { query: string; history?: Array<{ role: 'user' | 'model' | 'assistant'; text: string }> }) => Promise<{ result: string; citationsAvailable: boolean; groundingStatus: 'grounded' | 'abstained' | 'rejected'; provider?: 'gemini' | 'openai' | 'anthropic' }>;
  };
}
