import { LexUser, SavedCase, UserSubscription, DEFAULT_SUBSCRIPTION } from '../types';

export const LOCAL_DESKTOP_USER: LexUser = {
  id: 'local-user',
  email: null,
  displayName: 'Usuario local',
  photoURL: null,
};

export async function getLocalUser(): Promise<LexUser> {
  return LOCAL_DESKTOP_USER;
}

export async function startLocalSession(): Promise<LexUser> {
  return LOCAL_DESKTOP_USER;
}

export async function purgeExpiredCases(): Promise<number> {
  try {
    const result = await window.lexDesktop.cases.purgeExpired();
    return result.deleted;
  } catch (err) {
    console.error('[Local Desktop] Error depurando actividades vencidas:', err);
    return 0;
  }
}

export async function getCases(_userId: string, limitCount = 10): Promise<SavedCase[]> {
  try {
    const vaultCases = await window.lexDesktop.cases.listCases();
    return vaultCases.map((vc: any) => ({
      id: vc.caseId,
      name: vc.name,
      module: vc.module,
      date: vc.createdAt,
      createdAt: vc.createdAt,
      fiscalAnalysisHistory: [],
      engineeringDraftingHistory: [],
      fiscalDraftingHistory: [],
    })).slice(0, limitCount);
  } catch (err) {
    console.error('[Local Desktop] Fallo al listar actividades locales:', err);
    return [];
  }
}

export interface UpsertCasePayload {
  id: string;
  userId: string;
  name: string;
  date: string;
  fiscalAnalysisHistory: unknown[];
  engineeringAnalysisHistory?: unknown[];
  engineeringDraftingHistory: unknown[];
  fiscalDraftingHistory: unknown[];
  fiscalChatHistory: unknown[];
  engineeringDraftState: Record<string, unknown>;
  fiscalDraftState: Record<string, unknown>;
  fiscalOperationState: Record<string, unknown>;
  retentionUntil?: string;
  module?: 'engineering' | 'fiscal';
}

export async function upsertCase(payload: UpsertCasePayload): Promise<void> {
  try {
    const module = payload.module === 'fiscal' ? 'fiscal' : 'engineering';
    await window.lexDesktop.cases.createCase({
      caseId: payload.id,
      name: payload.name,
      module: module,
      retentionUntil: payload.retentionUntil,
    });

    await window.lexDesktop.cases.saveState({
      caseId: payload.id,
      expectedModule: module,
      stateData: {
        fiscalAnalysisHistory: payload.fiscalAnalysisHistory,
        engineeringAnalysisHistory: payload.engineeringAnalysisHistory,
        engineeringDraftingHistory: payload.engineeringDraftingHistory,
        fiscalDraftingHistory: payload.fiscalDraftingHistory,
        fiscalChatHistory: payload.fiscalChatHistory,
        engineeringDraftState: payload.engineeringDraftState,
        fiscalDraftState: payload.fiscalDraftState,
        fiscalOperationState: payload.fiscalOperationState,
      },
    });
  } catch (err) {
    console.error('[Local Desktop] Error guardando actividad local:', err);
  }
}

export async function deleteCase(caseId: string): Promise<void> {
  try {
    await window.lexDesktop.cases.deleteCase(caseId);
  } catch (err) {
    console.error('[Local Desktop] Error borrando actividad local:', err);
  }
}

export async function deleteAllCases(_userId: string): Promise<void> {
  try {
    await window.lexDesktop.cases.deleteAll({ confirmation: 'DELETE_ALL_LOCAL_DATA' });
  } catch (err) {
    console.error('[Local Desktop] Error borrando todas las actividades locales:', err);
  }
}

export async function getSubscriptionStatus(_userId: string): Promise<UserSubscription> {
  return DEFAULT_SUBSCRIPTION;
}
