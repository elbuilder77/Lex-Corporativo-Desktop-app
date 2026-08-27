import { copyFileSync } from 'fs';
import { dialog, ipcMain } from 'electron';
import { z } from 'zod';
import { getInstalledCorpusLaw, getLegalCorpusOverview, readLegalCorpusLawContent } from '../lib/legal-corpus';

const CorpusLawPayloadSchema = z.object({
  code: z.string().trim().min(1).max(24),
});

function safeDownloadName(code: string, name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return `${code}-${slug}.md`;
}

export function registerCorpusHandlers(): void {
  ipcMain.handle('corpus:list', () => getLegalCorpusOverview());

  ipcMain.handle('corpus:read', async (_event, rawPayload: unknown) => {
    const payload = CorpusLawPayloadSchema.parse(rawPayload);
    const result = readLegalCorpusLawContent(payload.code);
    return {
      success: true,
      ...result,
    };
  });

  ipcMain.handle('corpus:download', async (_event, rawPayload: unknown) => {
    const payload = CorpusLawPayloadSchema.parse(rawPayload);
    const law = getInstalledCorpusLaw(payload.code);
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: safeDownloadName(law.code, law.name),
      filters: [{ name: 'Texto normativo Markdown', extensions: ['md'] }],
    });

    if (canceled || !filePath) return { success: false, canceled: true as const };

    copyFileSync(law.filePath, filePath);
    return {
      success: true,
      canceled: false as const,
      filePath,
      code: law.code,
      sha256: law.sha256,
    };
  });
}

