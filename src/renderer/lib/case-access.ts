export type WorkspaceModule = 'engineering' | 'fiscal';

export const CROSS_ECOSYSTEM_CASE_MESSAGE =
  'Este portafolio pertenece a otro módulo. Selecciona una actividad compatible o crea una nueva.';

export const MISSING_LOCAL_CASE_MESSAGE =
  'Selecciona un portafolio compatible o crea una nueva actividad.';

export async function getLocalCaseModule(caseId: string): Promise<WorkspaceModule | null> {
  if (!window.lexDesktop?.cases) return null;
  const cases = await window.lexDesktop.cases.listCases();
  const found = cases.find((c: any) => c.caseId === caseId);
  if (found?.module === 'engineering' || found?.module === 'fiscal') return found.module;
  return found?.module === 'mercantil' ? 'engineering' : null;
}

export async function validateLocalCaseModule(
  caseId: string,
  expectedModule: WorkspaceModule,
): Promise<{ ok: boolean; message?: string }> {
  const module = await getLocalCaseModule(caseId);

  if (!module) {
    return { ok: false, message: MISSING_LOCAL_CASE_MESSAGE };
  }

  if (module !== expectedModule) {
    return { ok: false, message: CROSS_ECOSYSTEM_CASE_MESSAGE };
  }

  return { ok: true };
}

export async function ensureModuleActivity(
  expectedModule: WorkspaceModule,
  preferredCaseId?: string | null,
): Promise<string> {
  if (!window.lexDesktop?.cases) {
    throw new Error('El portafolio local no está disponible.');
  }

  if (preferredCaseId) {
    const validation = await validateLocalCaseModule(preferredCaseId, expectedModule);
    if (validation.ok) return preferredCaseId;
  }

  const activityCaseId = `activity_${expectedModule}`;
  const cases = await window.lexDesktop.cases.listCases();
  const existing = cases.find((c: any) => c.caseId === activityCaseId);

  if (!existing) {
    await window.lexDesktop.cases.createCase({
      caseId: activityCaseId,
      name: expectedModule === 'engineering' ? 'Ingeniería Jurídica' : 'Actividad Fiscal',
      module: expectedModule,
    });
  }

  return activityCaseId;
}

export function normalizeFolderError(fallback: string): string {
  return fallback;
}
