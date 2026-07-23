import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const traceRoot = path.join(process.cwd(), '.tmp-traceability-test');

vi.mock('electron', () => ({
  app: {
    getPath: () => traceRoot,
  },
}));

describe('local traceability ledger', () => {
  beforeEach(() => {
    fs.rmSync(traceRoot, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(traceRoot, { recursive: true, force: true });
  });

  it('records hashes and citation metadata without storing prompt, context, or output text', async () => {
    const { getTraceLedgerPath, logLegalExecution } = await import('./traceability');
    logLegalExecution({
      requestId: 'trace-1',
      operation: 'consultation',
      module: 'fiscal',
      primaryModel: 'gemma-test',
      finalModelUsed: 'gemma-test',
      prompt: 'pregunta sensible',
      ragContext: 'CFF Artículo 69-B contenido reservado',
      output: 'respuesta sensible',
      sources: [{ id: 'CFF:69-B', type: 'statute', title: 'CFF', subtitle: 'Artículo 69-B', similarity: 0.95 }],
    });

    const line = fs.readFileSync(getTraceLedgerPath(), 'utf8').trim();
    const entry = JSON.parse(line);
    expect(entry.operation).toBe('consultation');
    expect(entry.sourcesCount).toBe(1);
    expect(entry.promptHash).toMatch(/^[a-f0-9]{64}$/);
    expect(entry.ragContextHash).toMatch(/^[a-f0-9]{64}$/);
    expect(entry.outputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(line).not.toContain('pregunta sensible');
    expect(line).not.toContain('contenido reservado');
    expect(line).not.toContain('respuesta sensible');
  });
});
