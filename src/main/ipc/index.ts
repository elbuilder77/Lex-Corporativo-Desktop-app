import { ipcMain, app, dialog, BrowserWindow } from 'electron';
import { copyFileSync } from 'fs';
import { existsSync } from 'fs';
import { join, resolve, basename } from 'path';
import { registerAnalyzeHandlers } from './analyze.handler';
import { registerDraftHandlers } from './draft.handler';
import { registerRagHandlers } from './rag.handler';
import { registerVaultHandlers } from './vault.handler';
import { registerAssistantHandlers } from './assistant.handler';
import { registerByokHandlers } from './byok.handler';
import { registerCorpusHandlers } from './corpus.handler';
import { getLegalKnowledgeRuntimePath, isLocalRagAvailable } from '../lib/rag';
import { isLegalCorpusAvailable } from '../lib/legal-corpus';
import { getVaultProtectionStatus, listCases } from '../lib/case-vault';
import { getByokSettings, saveByokSettings } from '../lib/byok-settings';
import { getTraceLedgerStatus } from '../lib/traceability';
import { sanitizeForLogs } from '../lib/sanitizer';

const ALLOWED_EXPORT_EXTS = ['json', 'pdf', 'docx', 'jsonl'];

function sanitizeOpenDialogOptions(options: Electron.OpenDialogOptions): Electron.OpenDialogOptions {
  const safeOptions = { ...options };
  if (safeOptions.defaultPath) {
    const fileName = basename(safeOptions.defaultPath);
    safeOptions.defaultPath = resolve(app.getPath('downloads'), fileName);
  } else {
    safeOptions.defaultPath = app.getPath('downloads');
  }
  if (safeOptions.filters) {
    safeOptions.filters = safeOptions.filters.map(filter => ({
      ...filter,
      extensions: filter.extensions?.filter(ext => ALLOWED_EXPORT_EXTS.includes(ext)) || []
    })).filter(filter => filter.extensions.length > 0);
  }
  return safeOptions;
}

function sanitizeSaveDialogOptions(options: Electron.SaveDialogOptions): Electron.SaveDialogOptions {
  const safeOptions = { ...options };
  if (safeOptions.defaultPath) {
    const fileName = basename(safeOptions.defaultPath);
    safeOptions.defaultPath = resolve(app.getPath('downloads'), fileName);
  } else {
    safeOptions.defaultPath = app.getPath('downloads');
  }
  if (safeOptions.filters) {
    safeOptions.filters = safeOptions.filters.map(filter => ({
      ...filter,
      extensions: filter.extensions?.filter(ext => ALLOWED_EXPORT_EXTS.includes(ext)) || []
    })).filter(filter => filter.extensions.length > 0);
  }
  return safeOptions;
}

export function registerIpcHandlers(): void {
  // ── Shell Operations ───────────────────────
  ipcMain.handle('dialog:show-open-dialog', async (_event, options) => {
    const safeOptions = sanitizeOpenDialogOptions(options);
    const result = await dialog.showOpenDialog(safeOptions);
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('dialog:show-save-dialog', async (_event, options) => {
    const safeOptions = sanitizeSaveDialogOptions(options);
    const result = await dialog.showSaveDialog(safeOptions);
    return result.canceled ? null : result.filePath;
  });

  // ── App Metadata ───────────────────────────
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:platform', () => process.platform);
  ipcMain.handle('runtime:get-health', async () => {
    let vaultReady = false;
    let vaultDetail = 'No se pudo abrir la bóveda local.';
    let ragReady = false;
    let legalCorpusReady = false;

    try {
      await listCases();
      const protection = getVaultProtectionStatus();
      vaultReady = protection.ready;
      vaultDetail = protection.ready
        ? `Cifrado del sistema: ${protection.backend}`
        : protection.legacyPayloads > 0
          ? `${protection.legacyPayloads} registros heredados requieren migración cifrada.`
          : `Cifrado seguro no disponible (${protection.backend}).`;
    } catch {
      vaultReady = false;
    }

    try {
      ragReady = await isLocalRagAvailable();
    } catch {
      ragReady = false;
    }

    legalCorpusReady = isLegalCorpusAvailable();

    const byokSettings = getByokSettings();
    const embeddingModelPath = app.isPackaged
      ? join(process.resourcesPath, 'legal-runtime', 'models', 'Xenova', 'all-MiniLM-L6-v2', 'onnx', 'model_quantized.onnx')
      : join(app.getAppPath(), 'legal-runtime', 'models', 'Xenova', 'all-MiniLM-L6-v2', 'onnx', 'model_quantized.onnx');
    const embeddingsReady = existsSync(embeddingModelPath);
    const byokGenerationReady = byokSettings.enabled && byokSettings.hasApiKey;
    const legalSearchReady = ragReady && embeddingsReady;
    const legalGenerationReady = vaultReady && legalSearchReady && byokGenerationReady;
    const checks = [
      { id: 'vault', label: 'Bóveda SQLite cifrada', ok: vaultReady, detail: vaultDetail },
      { id: 'rag', label: 'Base legal LanceDB', ok: ragReady, detail: getLegalKnowledgeRuntimePath() },
      { id: 'corpus', label: 'Corpus normativo íntegro', ok: legalCorpusReady, detail: legalCorpusReady ? 'Los 16 ordenamientos están disponibles.' : 'Faltan archivos del corpus instalado.' },
      { id: 'embeddings', label: 'Modelo local de búsqueda', ok: embeddingsReady, detail: embeddingModelPath },
      { id: 'byok', label: 'API propia del usuario', ok: byokGenerationReady, detail: byokGenerationReady ? `${byokSettings.provider}:${byokSettings.model}` : 'Agrega y activa una API key' },
      { id: 'privacy', label: 'Privacidad estricta', ok: byokSettings.strictPrivacy || !byokSettings.automaticUpdatesEnabled },
    ];

    const blocking = checks.filter((check) => !check.ok && (check.id === 'vault' || check.id === 'privacy' || check.id === 'byok'));
    const status = checks.every((check) => check.ok)
      ? 'ready'
      : blocking.length > 0
        ? 'blocked'
        : 'degraded';

    return {
      status,
      checks,
      capabilities: {
        vault: {
          ready: vaultReady,
          label: 'Portafolio local',
          detail: vaultReady ? 'La bóveda cifrada está disponible.' : vaultDetail,
        },
        legalSearch: {
          ready: legalSearchReady,
          label: 'Consulta de corpus',
          detail: legalSearchReady
            ? 'LanceDB y el modelo de embeddings local están disponibles.'
            : 'Requiere la base LanceDB verificada y el modelo de embeddings local.',
        },
        legalCorpus: {
          ready: legalCorpusReady,
          label: 'Corpus normativo',
          detail: legalCorpusReady
            ? 'Los textos íntegros instalados están disponibles para descarga.'
            : 'No se encontraron todos los textos normativos instalados.',
        },
        legalGeneration: {
          ready: legalGenerationReady,
          label: 'Análisis y generación jurídica',
          detail: legalGenerationReady
            ? `Disponible mediante ${byokSettings.provider} con la API key del usuario.`
            : 'Requiere bóveda cifrada, corpus local y una API key activa.',
        },
        rulesAssessment: {
          ready: vaultReady,
          label: 'Evaluaciones por reglas',
          detail: vaultReady
            ? 'Las evaluaciones deterministas pueden guardarse en el portafolio.'
            : 'Requiere la bóveda cifrada para conservar el resultado.',
        },
        localAssistant: {
          ready: byokGenerationReady,
          label: 'Instructivo interactivo',
          detail: byokGenerationReady
            ? `Disponible mediante ${byokSettings.provider}.`
            : 'Requiere una API key activa.',
        },
      },
    };
  });

  ipcMain.handle('trace:get-status', async () => getTraceLedgerStatus());
  ipcMain.handle('trace:export', async () => {
    const status = getTraceLedgerStatus();
    if (!status.exists) {
      return { success: false, reason: 'empty' as const, sourcePath: status.path };
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: `lex-corporativo-trazabilidad-${new Date().toISOString().slice(0, 10)}.jsonl`,
      filters: [{ name: 'Bitácora JSONL', extensions: ['jsonl'] }],
    });

    if (canceled || !filePath) {
      return { success: false, reason: 'canceled' as const, sourcePath: status.path };
    }

    copyFileSync(status.path, filePath);
    return { success: true, filePath, sourcePath: status.path };
  });

  // ── Update Consent ───────────────────────────
  ipcMain.handle('settings:set-update-consent', async (_event, consent: boolean) => {
    const settings = getByokSettings();
    return saveByokSettings({
      enabled: settings.enabled,
      provider: settings.provider,
      model: settings.model,
      strictPrivacy: settings.strictPrivacy,
      automaticUpdatesEnabled: settings.automaticUpdatesEnabled,
      maxInputChars: settings.maxInputChars,
      updateConsentGiven: consent,
    });
  });

  // ── CSP Violation Reporting ─────────────────
  ipcMain.handle('csp:report', async (_event, report: unknown) => {
    try {
      const cleanReport = sanitizeForLogs(report);
      console.warn('[CSP Violation]', JSON.stringify(cleanReport));
      // Could also append to traceability ledger
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

  // ── Modular Handler Registration ───────────
  registerAnalyzeHandlers();
  registerDraftHandlers();
  registerRagHandlers();
  registerVaultHandlers();
  registerAssistantHandlers();
  registerByokHandlers();
  registerCorpusHandlers();
}
