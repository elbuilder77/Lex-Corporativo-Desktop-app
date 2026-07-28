import { create } from 'zustand';
import { AnalyzedDocumentHistory, ChatMessage, DraftingHistory, FiscalOperationState, FiscalOperationStep, SavedCase } from '../types';

interface CaseState {
  currentCaseId: string | null;
  activeModule: 'engineering' | 'fiscal' | null;
  fiscalAnalysisHistory: AnalyzedDocumentHistory[];
  engineeringDraftingHistory: DraftingHistory[];
  fiscalDraftingHistory: DraftingHistory[];
  fiscalChatHistory: ChatMessage[];
  fiscalOperationState: FiscalOperationState;
  recentCases: SavedCase[];
  isLoadingCases: boolean;
  
  engineeringDraftState: { prompt: string; mode: 'template' | 'reference'; generatedDoc: string; template: any | null; area: 'mercantil' | 'fiscal'; referenceFileName?: string; executionMode: 'local' | 'byok' };
  fiscalDraftState: { prompt: string; mode: 'scratch' | 'template' | 'analysis'; generatedDoc: string; template: any | null; linkedAnalysisId?: string };
  setEngineeringDraftState: (state: Partial<{ prompt: string; mode: 'template' | 'reference'; generatedDoc: string; template: any | null; area: 'mercantil' | 'fiscal'; referenceFileName?: string; executionMode: 'local' | 'byok' }>) => void;
  setFiscalDraftState: (state: Partial<{ prompt: string; mode: 'scratch' | 'template' | 'analysis'; generatedDoc: string; template: any | null; linkedAnalysisId?: string }>) => void;
  setFiscalChatHistory: (updater: ChatMessage[] | ((current: ChatMessage[]) => ChatMessage[])) => void;
  updateFiscalOperationState: (state: Partial<FiscalOperationState>) => void;
  completeFiscalOperationStep: (step: FiscalOperationStep) => void;
  saveFiscalWork: (name?: string) => Promise<string>;
  
  setCurrentCaseId: (id: string | null) => void;
  switchModule: (module: 'engineering' | 'fiscal') => void;
  addFiscalAnalysis: (item: AnalyzedDocumentHistory) => void;
  addEngineeringDrafting: (item: DraftingHistory) => void;
  addFiscalDrafting: (item: DraftingHistory) => void;
  removeGeneratedArtifact: (artifactId: string, activityType: 'analysis' | 'drafting', module: 'engineering' | 'fiscal', generatedDoc?: string) => void;
  fetchRecentCases: () => Promise<void>;
  removeRecentCase: (caseId: string) => void;
  
  resetCase: () => void;
  resetFiscalWork: () => void;
  loadCase: (c: SavedCase) => Promise<void>;
  
  clearAllState: () => void;
}

const createDefaultEngineeringDraftState = (): CaseState['engineeringDraftState'] => ({
  prompt: '',
  mode: 'template',
  generatedDoc: '',
  template: null,
  area: 'mercantil',
  executionMode: 'local',
});

const createDefaultFiscalDraftState = (): CaseState['fiscalDraftState'] => ({
  prompt: '',
  mode: 'scratch',
  generatedDoc: '',
  template: null,
});

const createDefaultFiscalOperationState = (): FiscalOperationState => ({
  title: '',
  description: '',
  evidenceFiles: [],
  materialityAnswers: {},
  deductibilityAnswers: {},
  completedSteps: [],
});

export const useCaseStore = create<CaseState>((set, get) => ({
  currentCaseId: null,
  activeModule: null,
  fiscalAnalysisHistory: [],
  engineeringDraftingHistory: [],
  fiscalDraftingHistory: [],
  fiscalChatHistory: [],
  fiscalOperationState: createDefaultFiscalOperationState(),
  recentCases: [],
  isLoadingCases: false,
  
  engineeringDraftState: createDefaultEngineeringDraftState(),
  fiscalDraftState: createDefaultFiscalDraftState(),
  
  setEngineeringDraftState: (state) => set((s) => ({ engineeringDraftState: { ...s.engineeringDraftState, ...state } })),
  setFiscalDraftState: (state) => set((s) => ({ fiscalDraftState: { ...s.fiscalDraftState, ...state } })),
  setFiscalChatHistory: (updater) => set((state) => ({
    fiscalChatHistory: typeof updater === 'function' ? updater(state.fiscalChatHistory) : updater,
  })),
  updateFiscalOperationState: (nextState) => set((state) => ({
    fiscalOperationState: {
      ...state.fiscalOperationState,
      ...nextState,
      updatedAt: new Date().toISOString(),
    },
  })),
  completeFiscalOperationStep: (step) => set((state) => ({
    fiscalOperationState: {
      ...state.fiscalOperationState,
      completedSteps: state.fiscalOperationState.completedSteps.includes(step)
        ? state.fiscalOperationState.completedSteps
        : [...state.fiscalOperationState.completedSteps, step],
      updatedAt: new Date().toISOString(),
    },
  })),
  saveFiscalWork: async (name) => {
    if (!window.lexDesktop?.cases) {
      throw new Error('El guardado local no está disponible.');
    }

    const state = get();
    const canReuseCurrent = Boolean(state.currentCaseId && state.activeModule === 'fiscal');
    const caseId = canReuseCurrent
      ? state.currentCaseId as string
      : `fiscal_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const latestAnalysisTitle = state.fiscalAnalysisHistory[0]?.result?.documentType;
    const latestDraftTitle = state.fiscalDraftingHistory[0]?.templateTitle;
    const activityName = name?.trim()
      || state.fiscalOperationState.title
      || latestDraftTitle
      || latestAnalysisTitle
      || (state.fiscalChatHistory.length ? 'Consulta fiscal' : 'Trabajo fiscal');

    await window.lexDesktop.cases.createCase({
      caseId,
      name: activityName.slice(0, 96),
      module: 'fiscal',
    });

    await Promise.all([
      ...state.fiscalAnalysisHistory.map((item) => window.lexDesktop.cases.saveAnalysis({
        caseId,
        analysisId: item.id,
        analysisData: item,
        expectedModule: 'fiscal',
      })),
      ...state.fiscalDraftingHistory.map((item) => window.lexDesktop.cases.saveDraft({
        caseId,
        draftId: item.id,
        draftData: item,
        expectedModule: 'fiscal',
      })),
    ]);

    await window.lexDesktop.cases.saveState({
      caseId,
      expectedModule: 'fiscal',
      stateData: {
        fiscalAnalysisHistory: state.fiscalAnalysisHistory,
        fiscalDraftingHistory: state.fiscalDraftingHistory,
        fiscalChatHistory: state.fiscalChatHistory,
        fiscalDraftState: state.fiscalDraftState,
        fiscalOperationState: state.fiscalOperationState,
      },
    });

    set({ currentCaseId: caseId, activeModule: 'fiscal' });
    await get().fetchRecentCases();
    return caseId;
  },
  
  setCurrentCaseId: (id) => set({ currentCaseId: id }),
  switchModule: (module) => set((state) => {
    if (state.activeModule === module) return {};
    return {
      activeModule: module,
      currentCaseId: state.activeModule && state.activeModule !== module ? null : state.currentCaseId,
    };
  }),
  addFiscalAnalysis: (item) => set((state) => {
    const next = [item, ...state.fiscalAnalysisHistory];
    if (state.currentCaseId && window.lexDesktop?.cases) {
      window.lexDesktop.cases.saveAnalysis({ caseId: state.currentCaseId, analysisId: item.id, analysisData: item, expectedModule: 'fiscal' }).catch(console.error);
    }
    return { fiscalAnalysisHistory: next };
  }),
  addEngineeringDrafting: (item) => set((state) => {
    if (state.currentCaseId && window.lexDesktop?.cases) {
      window.lexDesktop.cases.saveDraft({ caseId: state.currentCaseId, draftId: item.id, draftData: item, expectedModule: 'engineering' }).catch(console.error);
    }
    return { engineeringDraftingHistory: [item, ...state.engineeringDraftingHistory] };
  }),
  addFiscalDrafting: (item) => set((state) => {
    if (state.currentCaseId && window.lexDesktop?.cases) {
      window.lexDesktop.cases.saveDraft({ caseId: state.currentCaseId, draftId: item.id, draftData: item, expectedModule: 'fiscal' }).catch(console.error);
    }
    return { fiscalDraftingHistory: [item, ...state.fiscalDraftingHistory] };
  }),
  removeGeneratedArtifact: (artifactId, activityType, module, generatedDoc) => set((state) => {
    if (activityType === 'analysis') {
      return {
        fiscalAnalysisHistory: state.fiscalAnalysisHistory.filter((item) => item.id !== artifactId),
        fiscalDraftState: state.fiscalDraftState.linkedAnalysisId === artifactId
          ? { ...state.fiscalDraftState, linkedAnalysisId: undefined }
          : state.fiscalDraftState,
      };
    }
    if (module === 'fiscal') {
      return {
        fiscalDraftingHistory: state.fiscalDraftingHistory.filter((item) => item.id !== artifactId),
        fiscalDraftState: generatedDoc && state.fiscalDraftState.generatedDoc === generatedDoc
          ? { ...state.fiscalDraftState, generatedDoc: '' }
          : state.fiscalDraftState,
      };
    }
    return {
      engineeringDraftingHistory: state.engineeringDraftingHistory.filter((item) => item.id !== artifactId),
      engineeringDraftState: generatedDoc && state.engineeringDraftState.generatedDoc === generatedDoc
        ? { ...state.engineeringDraftState, generatedDoc: '' }
        : state.engineeringDraftState,
    };
  }),
  
  fetchRecentCases: async () => {
    set({ isLoadingCases: true });
    try {
      if (window.lexDesktop?.cases) {
        const metadataCases = await window.lexDesktop.cases.listCases();
        const cases: SavedCase[] = metadataCases.map((m: any) => ({
          id: m.caseId,
          name: m.name,
          date: m.updatedAt,
          module: m.module,
          createdAt: m.createdAt,
          retentionUntil: m.retentionUntil,
        }));
        set({ recentCases: cases, isLoadingCases: false });
      } else {
        set({ isLoadingCases: false });
      }
    } catch {
      set({ isLoadingCases: false });
    }
  },

  removeRecentCase: (caseId: string) => set((state) => {
    window.lexDesktop?.cases?.deleteCase(caseId).catch(console.error);
    return {
      recentCases: state.recentCases.filter((c) => c.id !== caseId),
      currentCaseId: state.currentCaseId === caseId ? null : state.currentCaseId,
      fiscalAnalysisHistory: state.currentCaseId === caseId ? [] : state.fiscalAnalysisHistory,
      engineeringDraftingHistory: state.currentCaseId === caseId ? [] : state.engineeringDraftingHistory,
      fiscalDraftingHistory: state.currentCaseId === caseId ? [] : state.fiscalDraftingHistory,
      fiscalChatHistory: state.currentCaseId === caseId ? [] : state.fiscalChatHistory,
      fiscalOperationState: state.currentCaseId === caseId ? createDefaultFiscalOperationState() : state.fiscalOperationState,
      engineeringDraftState: state.currentCaseId === caseId ? createDefaultEngineeringDraftState() : state.engineeringDraftState,
      fiscalDraftState: state.currentCaseId === caseId ? createDefaultFiscalDraftState() : state.fiscalDraftState,
    };
  }),

  resetCase: () => set({
    currentCaseId: null,
    fiscalAnalysisHistory: [],
    engineeringDraftingHistory: [],
    fiscalDraftingHistory: [],
    fiscalChatHistory: [],
    fiscalOperationState: createDefaultFiscalOperationState(),
    engineeringDraftState: createDefaultEngineeringDraftState(),
    fiscalDraftState: createDefaultFiscalDraftState(),
  }),
  resetFiscalWork: () => set((state) => ({
    currentCaseId: state.activeModule === 'fiscal' ? null : state.currentCaseId,
    fiscalAnalysisHistory: [],
    fiscalDraftingHistory: [],
    fiscalChatHistory: [],
    fiscalOperationState: createDefaultFiscalOperationState(),
    fiscalDraftState: createDefaultFiscalDraftState(),
  })),
  
  loadCase: async (c) => {
    set({
      currentCaseId: c.id,
      activeModule: c.module === 'fiscal' ? 'fiscal' : 'engineering',
      fiscalAnalysisHistory: [],
      engineeringDraftingHistory: [],
      fiscalDraftingHistory: [],
      fiscalChatHistory: [],
      fiscalOperationState: createDefaultFiscalOperationState(),
      engineeringDraftState: createDefaultEngineeringDraftState(),
      fiscalDraftState: createDefaultFiscalDraftState(),
    });

    if (c.module && window.lexDesktop?.cases) {
      try {
        const fullData = await window.lexDesktop.cases.getCase(c.id);
        const isEngineering = c.module === 'engineering' || c.module === 'mercantil';
        const persisted: Record<string, any> = fullData.state && typeof fullData.state === 'object' ? fullData.state : {};
        set({
          fiscalAnalysisHistory: isEngineering ? [] : (fullData.analyses || []),
          engineeringDraftingHistory: isEngineering ? (fullData.drafts || []) : [],
          fiscalDraftingHistory: isEngineering ? [] : (fullData.drafts || []),
          fiscalChatHistory: isEngineering ? [] : (persisted.fiscalChatHistory || []),
          fiscalOperationState: isEngineering
            ? createDefaultFiscalOperationState()
            : { ...createDefaultFiscalOperationState(), ...(persisted.fiscalOperationState || {}) },
          engineeringDraftState: persisted.engineeringDraftState
            ? { ...createDefaultEngineeringDraftState(), ...persisted.engineeringDraftState }
            : createDefaultEngineeringDraftState(),
          fiscalDraftState: persisted.fiscalDraftState
            ? { ...createDefaultFiscalDraftState(), ...persisted.fiscalDraftState }
            : createDefaultFiscalDraftState(),
        });
      } catch (err) {
        console.error('Error loading case data from vault:', err);
      }
    }
  },
  
  clearAllState: () => set({
    currentCaseId: null,
    fiscalAnalysisHistory: [],
    engineeringDraftingHistory: [],
    fiscalDraftingHistory: [],
    fiscalChatHistory: [],
    fiscalOperationState: createDefaultFiscalOperationState(),
    recentCases: [],
    engineeringDraftState: createDefaultEngineeringDraftState(),
    fiscalDraftState: createDefaultFiscalDraftState(),
  })
}));
