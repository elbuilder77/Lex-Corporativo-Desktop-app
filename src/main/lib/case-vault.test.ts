import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

const mockState = {
  isEncryptionAvailable: true,
  backend: 'dpapi',
  testVaultPath: path.join(process.cwd(), 'temp_test_vault'),
};

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') return mockState.testVaultPath;
      return '';
    },
  },
  safeStorage: {
    isEncryptionAvailable: () => mockState.isEncryptionAvailable,
    getSelectedStorageBackend: () => mockState.backend,
    encryptString: (str: string) => Buffer.from('encrypted:' + str, 'utf-8'),
    decryptString: (buf: Buffer) => buf.toString('utf-8').slice('encrypted:'.length),
  },
}));

const require = createRequire(import.meta.url);
const sqliteNativeAvailableInNode = (() => {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    db.close();
    return true;
  } catch {
    return false;
  }
})();

const describeVault = sqliteNativeAvailableInNode ? describe : describe.skip;
let vault: typeof import('./case-vault') | null = null;

describeVault('Local Case Vault', () => {
  beforeEach(() => {
    mockState.isEncryptionAvailable = true;
    mockState.backend = 'dpapi';
    vault?.closeDb(); // Close any lingering connections
    if (fs.existsSync(mockState.testVaultPath)) {
      fs.rmSync(mockState.testVaultPath, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    vault?.closeDb(); // Always close SQLite connection so the folder can be deleted
    if (fs.existsSync(mockState.testVaultPath)) {
      fs.rmSync(mockState.testVaultPath, { recursive: true, force: true });
    }
  });

  it('blocks new cases when secure OS encryption is unavailable', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = false;

    await expect(vault.createCase('case_123', 'Test Case 1', 'mercantil'))
      .rejects.toThrow('cifrado seguro del sistema operativo no está disponible');
    expect(vault.getVaultProtectionStatus().ready).toBe(false);
  });

  it('creates and lists cases using OS safeStorage encryption when available', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_456', 'Secure Case 2', 'fiscal');

    const cases = await vault.listCases();
    expect(cases.length).toBe(1);
    expect(cases[0].name).toBe('Secure Case 2');
    expect(cases[0].module).toBe('fiscal');
  });

  it('saves, lists, and exports documents, analyses, and drafts securely', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_test', 'Full Test Case', 'mercantil');
    await vault.saveDocument('case_test', 'evidence.pdf', 'application/pdf', 'dummy-base64-content', 'mercantil');
    await vault.saveAnalysis('case_test', 'report_1', { summary: 'Risks found' }, 'mercantil');
    await vault.saveDraft('case_test', 'draft_1', { templateTitle: 'NDA', generatedDoc: 'Documento generado' }, 'mercantil');

    const cases = await vault.listCases();
    expect(cases.length).toBe(1);

    const exported = await vault.exportCase('case_test', 'mercantil');
    const parsed = JSON.parse(exported);

    expect(parsed.metadata.name).toBe('Full Test Case');
    expect(parsed.documents.length).toBe(1);
    expect(parsed.documents[0].fileName).toBe('evidence.pdf');
    expect(parsed.documents[0].base64).toBe('dummy-base64-content');
    expect(parsed.analyses.length).toBe(1);
    expect(parsed.analyses[0].summary).toBe('Risks found');
    expect(parsed.drafts.length).toBe(1);
    expect(parsed.drafts[0].templateTitle).toBe('NDA');
    expect(parsed.drafts[0].generatedDoc).toBe('Documento generado');
  });

  it('updates case metadata without deleting child records', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    const original = await vault.createCase('case_upsert', 'Original', 'fiscal');
    await vault.saveAnalysis('case_upsert', 'analysis_1', { summary: 'Persistente' }, 'fiscal');
    await vault.saveDraft('case_upsert', 'draft_1', { generatedDoc: 'Persistente' }, 'fiscal');

    for (let index = 0; index < 10; index += 1) {
      await vault.createCase('case_upsert', `Actualizada ${index}`, 'fiscal');
    }

    const exported = JSON.parse(await vault.exportCase('case_upsert', 'fiscal'));
    expect(exported.metadata.createdAt).toBe(original.createdAt);
    expect(exported.metadata.name).toBe('Actualizada 9');
    expect(exported.analyses).toHaveLength(1);
    expect(exported.drafts).toHaveLength(1);
  });

  it('persists case state and replaces retried analysis and draft payloads idempotently', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_state', 'Estado', 'fiscal');
    await vault.saveAnalysis('case_state', 'analysis_1', { summary: 'v1' }, 'fiscal');
    await vault.saveAnalysis('case_state', 'analysis_1', { summary: 'v2' }, 'fiscal');
    await vault.saveDraft('case_state', 'draft_1', { generatedDoc: 'v1' }, 'fiscal');
    await vault.saveDraft('case_state', 'draft_1', { generatedDoc: 'v2' }, 'fiscal');
    await vault.saveCaseState('case_state', {
      fiscalChatHistory: [{ role: 'user', text: 'Consulta persistida' }],
      fiscalDraftingHistory: [{ id: 'draft_1' }],
    }, 'fiscal');

    const exported = JSON.parse(await vault.exportCase('case_state', 'fiscal'));
    expect(exported.analyses).toEqual([{ summary: 'v2' }]);
    expect(exported.drafts).toEqual([{ generatedDoc: 'v2' }]);
    expect(exported.state.fiscalChatHistory[0].text).toBe('Consulta persistida');
  });

  it('deletes one generated analysis or draft without deleting the case', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_artifacts', 'Artefactos', 'fiscal');
    await vault.saveAnalysis('case_artifacts', 'analysis_1', { id: 'analysis_1', summary: 'Eliminar' }, 'fiscal');
    await vault.saveAnalysis('case_artifacts', 'analysis_2', { id: 'analysis_2', summary: 'Conservar' }, 'fiscal');
    await vault.saveDraft('case_artifacts', 'draft_1', { id: 'draft_1', generatedDoc: 'Eliminar' }, 'fiscal');
    await vault.saveDraft('case_artifacts', 'draft_2', { id: 'draft_2', generatedDoc: 'Conservar' }, 'fiscal');
    await vault.saveCaseState('case_artifacts', {
      fiscalAnalysisHistory: [{ id: 'analysis_1' }, { id: 'analysis_2' }],
      fiscalDraftingHistory: [{ id: 'draft_1' }, { id: 'draft_2' }],
      fiscalDraftState: { linkedAnalysisId: 'analysis_1', generatedDoc: 'Eliminar' },
    }, 'fiscal');

    expect(await vault.deleteAnalysis('case_artifacts', 'analysis_1', 'fiscal')).toBe(true);
    expect(await vault.deleteDraft('case_artifacts', 'draft_1', 'fiscal')).toBe(true);
    expect(await vault.deleteAnalysis('case_artifacts', 'missing', 'fiscal')).toBe(false);

    const exported = JSON.parse(await vault.exportCase('case_artifacts', 'fiscal'));
    expect(exported.analyses.map((item: any) => item.id)).toEqual(['analysis_2']);
    expect(exported.drafts.map((item: any) => item.id)).toEqual(['draft_2']);
    expect(exported.state.fiscalAnalysisHistory).toEqual([{ id: 'analysis_2' }]);
    expect(exported.state.fiscalDraftingHistory).toEqual([{ id: 'draft_2' }]);
    expect(exported.state.fiscalDraftState.linkedAnalysisId).toBeUndefined();
    expect(exported.state.fiscalDraftState.generatedDoc).toBe('');
    expect(await vault.listCases()).toHaveLength(1);
  });

  it('purges only activities whose retention date has expired', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_expired', 'Vencida', 'fiscal', '2026-01-01T00:00:00.000Z');
    await vault.createCase('case_active', 'Activa', 'fiscal', '2027-01-01T00:00:00.000Z');
    const deleted = await vault.purgeExpiredCases('2026-07-14T00:00:00.000Z');

    expect(deleted).toBe(1);
    expect((await vault.listCases()).map(item => item.caseId)).toEqual(['case_active']);
  });

  it('deletes cases clean and completely from the workspace', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_delete', 'Delete Me', 'fiscal');
    const casesBefore = await vault.listCases();
    expect(casesBefore.length).toBe(1);

    await vault.deleteCase('case_delete', 'fiscal');
    
    const casesAfter = await vault.listCases();
    expect(casesAfter.length).toBe(0);
  });

  it('renames cases without changing their ecosystem', async () => {
    vault = await import('./case-vault');
    mockState.isEncryptionAvailable = true;

    await vault.createCase('case_rename', 'Original', 'mercantil');
    const renamed = await vault.renameCase('case_rename', 'Renombrado', 'mercantil');

    expect(renamed.name).toBe('Renombrado');
    expect(renamed.module).toBe('mercantil');

    const cases = await vault.listCases();
    expect(cases[0].name).toBe('Renombrado');
  });
});
