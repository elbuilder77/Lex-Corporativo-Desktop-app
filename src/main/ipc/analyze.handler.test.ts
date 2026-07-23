import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    getPath: () => process.cwd(),
    getAppPath: () => process.cwd(),
    isPackaged: false,
  },
}));

vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(),
  env: {},
}));

vi.mock('@lancedb/lancedb', () => ({
  connect: vi.fn(),
}));

import { parseAnalyzePayload } from './analyze.handler';

const basePayload = {
  caseId: 'activity_fiscal',
  files: [{
    name: 'contrato.pdf',
    base64: Buffer.from('pdf').toString('base64'),
    mimeType: 'application/pdf',
  }],
};

describe('analysis payload contract', () => {
  it('normalizes the explicit fiscal analysis contract', () => {
    const payload = parseAnalyzePayload({
      ...basePayload,
      ecosystem: 'fiscal',
      module: 'analysis',
      currentDocumentOnly: true,
      focusedInstruction: 'Revisa materialidad y soporte fiscal.',
      promptProfile: 'fiscal_analysis',
    });

    expect(payload.ecosystem).toBe('fiscal');
    expect(payload.module).toBe('analysis');
    expect(payload.currentDocumentOnly).toBe(true);
    expect(payload.focusedInstruction).toBe('Revisa materialidad y soporte fiscal.');
    expect(payload.promptProfile).toBe('fiscal_analysis');
  });

  it('ignores renderer attempts to select an execution mode', () => {
    const payload = parseAnalyzePayload({
      ...basePayload,
      ecosystem: 'fiscal',
      executionMode: 'byok',
    });

    expect(payload).not.toHaveProperty('executionMode');
    expect(payload).not.toHaveProperty('cloudConsent');
  });

  it('rejects a renderer-provided requestId so main owns analysis isolation', () => {
    expect(() => parseAnalyzePayload({
      ...basePayload,
      ecosystem: 'fiscal',
      requestId: 'user-controlled-id',
    })).toThrow();
  });

  it('rejects mercantile analysis because it is no longer a product workflow', () => {
    expect(() => parseAnalyzePayload({
      ...basePayload,
      ecosystem: 'mercantil',
      promptProfile: 'mercantil_analysis',
    })).toThrow();
  });
});
