import { ipcMain, app, dialog } from 'electron';
import { copyFileSync } from 'fs';
import { registerAnalyzeHandlers } from './analyze.handler';
import { registerDraftHandlers } from './draft.handler';
import { registerRagHandlers } from './rag.handler';
import { registerVaultHandlers } from './vault.handler';
import { registerAssistantHandlers } from './assistant.handler';
import { registerByokHandlers } from './byok.handler';
import { getRustRuntimeHealth } from '../lib/rust-engine';
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
    const rust = getRustRuntimeHealth();
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
    const checks = [
      { id: 'vault', label: 'Bóveda SQLite cifrada', ok: vaultReady, detail: vaultDetail },
      { id: 'rag', label: 'Base legal LanceDB', ok: ragReady, detail: getLegalKnowledgeRuntimePath() },
      { id: 'rust', label: 'Motor Rust', ok: rust.binaryExists, detail: rust.binaryPath },
      { id: 'gguf', label: 'Gemma 2B local', ok: rust.expectedGgufModelExists, detail: rust.expectedGgufModelPath },
      { id: 'embeddings', label: 'Modelo de embeddings', ok: rust.embeddingModelExists },
      { id: 'byok', label: 'Proveedor BYOK', ok: !byokSettings.enabled || byokSettings.hasApiKey, detail: byokSettings.enabled ? `${byokSettings.provider}:${byokSettings.model}` : 'Desactivado' },
      { id: 'privacy', label: 'Privacidad estricta', ok: byokSettings.strictPrivacy || !byokSettings.automaticUpdatesEnabled },
    ];

    const blocking = checks.filter((check) => !check.ok && (check.id === 'vault' || check.id === 'privacy'));
    const status = checks.every((check) => check.ok)
      ? 'ready'
      : blocking.length > 0
        ? 'blocked'
        : 'degraded';

    return { status, checks, rust };
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
