import { ipcMain, app, dialog } from 'electron';
import { copyFileSync } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';
import { registerAnalyzeHandlers } from './analyze.handler';
import { registerDraftHandlers } from './draft.handler';
import { registerRagHandlers } from './rag.handler';
import { registerVaultHandlers } from './vault.handler';
import { registerAssistantHandlers } from './assistant.handler';
import { registerByokHandlers } from './byok.handler';
import { getLegalKnowledgeRuntimePath, isLocalRagAvailable } from '../lib/rag';
import { getVaultProtectionStatus, listCases } from '../lib/case-vault';
import { getByokSettings } from '../lib/byok-settings';
import { getTraceLedgerStatus } from '../lib/traceability';

export function registerIpcHandlers(): void {
  // ── Shell Operations ───────────────────────
  ipcMain.handle('dialog:show-open-dialog', async (_event, options) => {
    const result = await dialog.showOpenDialog(options);
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('dialog:show-save-dialog', async (_event, options) => {
    const result = await dialog.showSaveDialog(options);
    return result.canceled ? null : result.filePath;
  });

  // ── App Metadata ───────────────────────────
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:platform', () => process.platform);
  ipcMain.handle('runtime:get-health', async () => {
    let vaultReady = false;
    let vaultDetail = 'No se pudo abrir la bóveda local.';
    let ragReady = false;

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

  // ── Modular Handler Registration ───────────
  registerAnalyzeHandlers();
  registerDraftHandlers();
  registerRagHandlers();
  registerVaultHandlers();
  registerAssistantHandlers();
  registerByokHandlers();
}
