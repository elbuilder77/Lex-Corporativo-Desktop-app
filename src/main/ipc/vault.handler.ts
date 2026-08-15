import { dialog, ipcMain } from 'electron';
import { writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { z } from 'zod';
import {
  createCase,
  deleteAnalysis,
  deleteAllCases,
  deleteCase,
  deleteDraft,
  exportCase,
  listCases,
  purgeExpiredCases,
  renameCase,
  saveAnalysis,
  saveCaseState,
  saveDraft,
} from '../lib/case-vault';

const caseIdRegex = /^[a-zA-Z0-9-_]+$/;

// Zero-Trust input validation schemas for Vault operations
const CreateCaseSchema = z.object({
  caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  name: z.string().min(1),
  module: z.enum(['engineering', 'fiscal', 'mercantil']),
  retentionUntil: z.string().datetime().optional(),
});

const RenameCaseSchema = z.object({
  caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  name: z.string().trim().min(1).max(160),
  expectedModule: z.enum(['engineering', 'fiscal', 'mercantil']).optional(),
});

const SaveAnalysisSchema = z.object({
  caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  analysisId: z.string().min(1),
  analysisData: z.any(),
  expectedModule: z.enum(['engineering', 'fiscal', 'mercantil']).optional(),
});

const SaveDraftSchema = z.object({
  caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  draftId: z.string().min(1),
  draftData: z.any(),
  expectedModule: z.enum(['engineering', 'fiscal', 'mercantil']).optional(),
});

const DeleteAnalysisSchema = z.object({
  caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  analysisId: z.string().min(1),
  expectedModule: z.enum(['engineering', 'fiscal', 'mercantil']).optional(),
});

const DeleteDraftSchema = z.object({
  caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  draftId: z.string().min(1),
  expectedModule: z.enum(['engineering', 'fiscal', 'mercantil']).optional(),
});

const SaveStateSchema = z.object({
  caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  stateData: z.record(z.string(), z.unknown()),
  expectedModule: z.enum(['engineering', 'fiscal', 'mercantil']).optional(),
});

const CaseOperationSchema = z.union([
  z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
  z.object({
    caseId: z.string().min(1).regex(caseIdRegex, "Invalid case ID format"),
    expectedModule: z.enum(['engineering', 'fiscal', 'mercantil']).optional(),
  }),
]);

const ExportPdfSchema = z.object({
  base64: z.string().min(1),
  defaultPath: z.string().min(1).max(260),
});

const ExportDocxSchema = z.object({
  base64: z.string().min(1),
  defaultPath: z.string().min(1).max(260),
});


const DeleteAllSchema = z.object({
  confirmation: z.literal('DELETE_ALL_LOCAL_DATA'),
}).strict();

function parseCaseOperation(raw: unknown): { caseId: string; expectedModule?: 'engineering' | 'fiscal' | 'mercantil' } {
  const parsed = CaseOperationSchema.parse(raw);
  return typeof parsed === 'string' ? { caseId: parsed } : parsed;
}

export function registerVaultHandlers(): void {
  // ── Create Case ──────────────────────────
  ipcMain.handle('vault:create-case', async (_event, rawPayload: unknown) => {
    try {
      const payload = CreateCaseSchema.parse(rawPayload);
      return await createCase(payload.caseId, payload.name, payload.module, payload.retentionUntil);
    } catch (err: any) {
      console.error('[IPC Vault] create-case validation or storage error:', err);
      throw new Error(`Error en el portafolio al crear actividad: ${err.message}`);
    }
  });

  // ── List Cases ───────────────────────────
  ipcMain.handle('vault:list-cases', async () => {
    try {
      return await listCases();
    } catch (err: any) {
      console.error('[IPC Vault] list-cases storage error:', err);
      throw new Error(`Error en el portafolio al listar actividades: ${err.message}`);
    }
  });

  // ── Rename Case ─────────────────────────
  ipcMain.handle('vault:rename-case', async (_event, rawPayload: unknown) => {
    try {
      const payload = RenameCaseSchema.parse(rawPayload);
      return await renameCase(payload.caseId, payload.name, payload.expectedModule);
    } catch (err: any) {
      console.error('[IPC Vault] rename-case validation or storage error:', err);
      throw new Error(`Error en el portafolio al renombrar actividad: ${err.message}`);
    }
  });

  // ── Save Analysis ────────────────────────
  ipcMain.handle('vault:save-analysis', async (_event, rawPayload: unknown) => {
    try {
      const payload = SaveAnalysisSchema.parse(rawPayload);
      await saveAnalysis(payload.caseId, payload.analysisId, payload.analysisData, payload.expectedModule);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC Vault] save-analysis validation or storage error.');
      throw new Error(`Error en el portafolio al guardar análisis: ${err.message}`);
    }
  });

  // ── Save Draft ──────────────────────────
  ipcMain.handle('vault:save-draft', async (_event, rawPayload: unknown) => {
    try {
      const payload = SaveDraftSchema.parse(rawPayload);
      await saveDraft(payload.caseId, payload.draftId, payload.draftData, payload.expectedModule);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC Vault] save-draft validation or storage error.');
      throw new Error(`Error en el portafolio al guardar borrador: ${err.message}`);
    }
  });

  ipcMain.handle('vault:delete-analysis', async (_event, rawPayload: unknown) => {
    try {
      const payload = DeleteAnalysisSchema.parse(rawPayload);
      const deleted = await deleteAnalysis(payload.caseId, payload.analysisId, payload.expectedModule);
      return { success: true, deleted };
    } catch (err: any) {
      console.error('[IPC Vault] delete-analysis validation or storage error.');
      throw new Error(`Error en el portafolio al eliminar analisis: ${err.message}`);
    }
  });

  ipcMain.handle('vault:delete-draft', async (_event, rawPayload: unknown) => {
    try {
      const payload = DeleteDraftSchema.parse(rawPayload);
      const deleted = await deleteDraft(payload.caseId, payload.draftId, payload.expectedModule);
      return { success: true, deleted };
    } catch (err: any) {
      console.error('[IPC Vault] delete-draft validation or storage error.');
      throw new Error(`Error en el portafolio al eliminar documento: ${err.message}`);
    }
  });

  ipcMain.handle('vault:save-state', async (_event, rawPayload: unknown) => {
    try {
      const payload = SaveStateSchema.parse(rawPayload);
      await saveCaseState(payload.caseId, payload.stateData, payload.expectedModule);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC Vault] save-state validation or storage error.');
      throw new Error(`Error en el portafolio al guardar estado: ${err.message}`);
    }
  });

  // ── Delete Case ──────────────────────────
  ipcMain.handle('vault:delete-case', async (_event, rawPayload: unknown) => {
    try {
      const payload = parseCaseOperation(rawPayload);
      await deleteCase(payload.caseId, payload.expectedModule);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC Vault] delete-case storage error.');
      throw new Error(`Error en el portafolio al eliminar actividad: ${err.message}`);
    }
  });

  ipcMain.handle('vault:purge-expired', async () => ({ deleted: await purgeExpiredCases() }));
  ipcMain.handle('vault:delete-all', async (_event, rawPayload: unknown) => {
    DeleteAllSchema.parse(rawPayload);
    return { deleted: await deleteAllCases() };
  });

  ipcMain.handle('vault:export-all', async () => {
    const metadata = await listCases();
    const cases = await Promise.all(metadata.map(async item => JSON.parse(await exportCase(item.caseId))));
    const exportCore = {
      format: 'lex-corporativo-vault-backup',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      caseCount: cases.length,
      cases,
    };
    const packageHash = createHash('sha256').update(JSON.stringify(exportCore)).digest('hex');
    const backup = { ...exportCore, packageHash };
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: `lex-corporativo-respaldo-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Respaldo Lex Corporativo', extensions: ['json'] }],
    });
    if (canceled || !filePath) {
      return { success: false, canceled: true, caseCount: cases.length };
    }
    writeFileSync(filePath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
    return { success: true, filePath, caseCount: cases.length, packageHash };
  });

  // ── Load Case Data ───────────────────────
  ipcMain.handle('vault:load-case-data', async (_event, rawPayload: unknown) => {
    try {
      const payload = parseCaseOperation(rawPayload);
      // To keep it simple, we just call exportCase and let renderer handle it.
      const exported = await exportCase(payload.caseId, payload.expectedModule);
      return JSON.parse(exported);
    } catch (err: any) {
      console.error('[IPC Vault] load-case-data storage error.');
      throw new Error(`Error en el portafolio al cargar actividad: ${err.message}`);
    }
  });

  // ── Export PDF ───────────────────────────
  ipcMain.handle('vault:export-pdf', async (_event, rawPayload: unknown) => {
    try {
      const payload = ExportPdfSchema.parse(rawPayload);
      
      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: payload.defaultPath,
        filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }]
      });

      if (!canceled && filePath) {
        // Strip any data URI prefix (e.g. data:application/pdf;filename=...;base64,)
        const parts = payload.base64.split('base64,');
        const base64Data = parts.length > 1 ? parts[1] : payload.base64;
        writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        return { success: true, filePath };
      }
      return { success: false, canceled: true };
    } catch (err: any) {
      console.error('[IPC Vault] export-pdf error:', err);
      throw new Error(`Error al exportar PDF: ${err.message}`);
    }
  });

  // ── Export DOCX (Word) ────────────────────
  ipcMain.handle('vault:export-docx', async (_event, rawPayload: unknown) => {
    try {
      const payload = ExportDocxSchema.parse(rawPayload);
      
      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: payload.defaultPath,
        filters: [{ name: 'Documento de Microsoft Word (.docx)', extensions: ['docx'] }]
      });

      if (!canceled && filePath) {
        const parts = payload.base64.split('base64,');
        const base64Data = parts.length > 1 ? parts[1] : payload.base64;
        writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        return { success: true, filePath };
      }
      return { success: false, canceled: true };
    } catch (err: any) {
      console.error('[IPC Vault] export-docx error:', err);
      throw new Error(`Error al exportar Word: ${err.message}`);
    }
  });
}

