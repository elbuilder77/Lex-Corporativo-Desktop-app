import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCaseStore } from './useCaseStore';

const casesApi = {
  createCase: vi.fn(async () => ({})),
  saveAnalysis: vi.fn(async () => ({})),
  saveDraft: vi.fn(async () => ({})),
  saveState: vi.fn(async () => ({ success: true })),
  listCases: vi.fn(async () => []),
};

const analysis = {
  id: 'analysis-1',
  requestId: 'analysis-1',
  timestamp: '2026-07-28T12:00:00.000Z',
  files: [],
  result: {
    summary: 'Resultado fiscal',
    documentType: 'Evaluación fiscal',
    riskScore: 20,
    detectedParties: [],
    detectedObligations: [],
    missingClauses: [],
    risks: [],
    recommendedActions: [],
  },
  module: 'fiscal',
} as any;

describe('standalone fiscal work', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: { lexDesktop: { cases: casesApi } },
    });
    useCaseStore.getState().clearAllState();
    useCaseStore.setState({ activeModule: 'fiscal', currentCaseId: null });
  });

  it('keeps a result in memory until the user saves it', () => {
    useCaseStore.getState().addFiscalAnalysis(analysis);

    expect(useCaseStore.getState().currentCaseId).toBeNull();
    expect(useCaseStore.getState().fiscalAnalysisHistory).toHaveLength(1);
    expect(casesApi.createCase).not.toHaveBeenCalled();
    expect(casesApi.saveAnalysis).not.toHaveBeenCalled();
  });

  it('creates and persists a fiscal work only after save', async () => {
    useCaseStore.getState().addFiscalAnalysis(analysis);
    useCaseStore.getState().updateFiscalOperationState({
      title: 'Compra de equipo',
      lastActiveTab: 'fiscal-deductibility',
    });

    const caseId = await useCaseStore.getState().saveFiscalWork();

    expect(caseId).toMatch(/^fiscal_/);
    expect(casesApi.createCase).toHaveBeenCalledWith(expect.objectContaining({
      caseId,
      name: 'Compra de equipo',
      module: 'fiscal',
    }));
    expect(casesApi.saveAnalysis).toHaveBeenCalledWith(expect.objectContaining({
      caseId,
      analysisId: 'analysis-1',
      expectedModule: 'fiscal',
    }));
    expect(casesApi.saveState).toHaveBeenCalledWith(expect.objectContaining({
      caseId,
      stateData: expect.objectContaining({
        fiscalOperationState: expect.objectContaining({ lastActiveTab: 'fiscal-deductibility' }),
      }),
    }));
    expect(useCaseStore.getState().currentCaseId).toBe(caseId);
  });

  it('keeps a shared evidence matrix and lets the user resolve pending items', () => {
    useCaseStore.getState().addFiscalAnalysis({
      ...analysis,
      result: {
        ...analysis.result,
        detectedObligations: ['CFDI disponible.'],
        missingData: ['Comprobante de pago.'],
        legalFoundations: [],
        recommendedActions: ['Agregar comprobante bancario.'],
      },
    });

    const pending = useCaseStore.getState().fiscalOperationState.evidenceMatrix.find((item) => item.status === 'missing');
    expect(pending?.title).toBe('Comprobante de pago.');

    useCaseStore.getState().toggleFiscalEvidenceResolved(pending!.id);
    expect(useCaseStore.getState().fiscalOperationState.resolvedEvidenceIds).toContain(pending!.id);

    useCaseStore.getState().toggleFiscalEvidenceResolved(pending!.id);
    expect(useCaseStore.getState().fiscalOperationState.resolvedEvidenceIds).not.toContain(pending!.id);
  });
});
