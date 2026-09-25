import { describe, expect, it, vi, beforeEach } from 'vitest';

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

vi.mock('../lib/rag', () => ({
  formatRAGContext: vi.fn((sources: any[]) => sources.map(s => s.content).join('\n')),
  searchLegalArticles: vi.fn(),
}));

vi.mock('../lib/legal-reranker', () => ({
  rerankLegalArticles: vi.fn(),
}));

vi.mock('../lib/traceability', () => ({
  logLegalExecution: vi.fn(),
}));

import { processRagSearch } from './rag.handler';
import { searchLegalArticles } from '../lib/rag';
import { rerankLegalArticles } from '../lib/legal-reranker';
import { logLegalExecution } from '../lib/traceability';

describe('RAG IPC search handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns formatted context and citations on valid query with results', async () => {
    vi.mocked(searchLegalArticles).mockResolvedValueOnce({
      matches: [
        {
          id: 'art-1',
          title: 'Código de Comercio',
          content: 'Son actos de comercio los que la ley declare como tales.',
          similarity: 0.92,
          law_code: 'CCom',
          article_number: '1',
          module: 'mercantil',
          type: 'statute',
        },
      ],
      queryExpansion: {} as any,
      dbPath: '',
      durationMs: 10,
    });

    vi.mocked(rerankLegalArticles).mockResolvedValueOnce({
      matches: [
        {
          id: 'art-1',
          title: 'Código de Comercio',
          content: 'Son actos de comercio los que la ley declare como tales.',
          similarity: 0.92,
          law_code: 'CCom',
          article_number: '1',
          module: 'mercantil',
          type: 'statute',
        },
      ],
      status: 'applied',
      provider: 'gemini',
      model: 'gemini-3.7-flash',
    });

    const result = await processRagSearch({
      query: 'actos de comercio',
      module: 'mercantil',
    });

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].id).toBe('art-1');
    expect(result.context).toContain('Son actos de comercio');
    expect(logLegalExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'search',
        module: 'mercantil',
        hasFallback: false,
      })
    );
  });

  it('differentiates legitimate zero results from failures without throwing', async () => {
    vi.mocked(searchLegalArticles).mockResolvedValueOnce({
      matches: [],
      queryExpansion: {} as any,
      dbPath: '',
      durationMs: 5,
    });

    vi.mocked(rerankLegalArticles).mockResolvedValueOnce({
      matches: [],
      status: 'disabled',
    });

    const result = await processRagSearch({
      query: 'termino_inexistente_en_corpus',
      module: 'fiscal',
    });

    expect(result.citations).toEqual([]);
    expect(result.context).toBe('');
    expect(logLegalExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'search',
        module: 'fiscal',
        sources: [],
      })
    );
  });

  it('throws an observable error and logs to traceability when searchLegalArticles fails', async () => {
    vi.mocked(searchLegalArticles).mockRejectedValueOnce(
      new Error('LanceDB table legal_knowledge not found / corrupted')
    );

    await expect(
      processRagSearch({
        query: 'materialidad fiscal',
        module: 'fiscal',
      })
    ).rejects.toThrow('[IPC RAG] Fallo en la búsqueda del corpus legal: LanceDB table legal_knowledge not found / corrupted');

    expect(logLegalExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'search',
        module: 'fiscal',
        fallbackReason: expect.stringContaining('rag_search_error: LanceDB table legal_knowledge not found / corrupted'),
      })
    );
  });

  it('rejects invalid payloads with observable validation errors and traceability', async () => {
    await expect(
      processRagSearch({
        query: '', // Empty query violates min(1)
        module: 'invalido',
      })
    ).rejects.toThrow('[IPC RAG] Fallo en la búsqueda del corpus legal');

    expect(logLegalExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'search',
        fallbackReason: expect.stringContaining('rag_search_error:'),
      })
    );
  });
});
