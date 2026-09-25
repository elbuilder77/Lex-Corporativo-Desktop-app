import { ipcMain } from 'electron';
import * as crypto from 'crypto';
import { z } from 'zod';
import { formatRAGContext, searchLegalArticles } from '../lib/rag';
import { rerankLegalArticles } from '../lib/legal-reranker';
import { logLegalExecution } from '../lib/traceability';
import { LEGAL_ECOSYSTEMS } from '../../shared/legal-contracts';

const RAGPayloadSchema = z.object({
  query: z.string().trim().min(1).max(500),
  module: z.union([z.enum(LEGAL_ECOSYSTEMS), z.literal('todos')]),
  limit: z.number().int().min(1).max(12).default(8).optional(),
  useReranker: z.boolean().default(true).optional(),
});

export async function processRagSearch(rawPayload: unknown): Promise<{
  context: string;
  citations: Array<{
    id: string | number;
    title: string;
    subtitle?: string;
    content: string;
    law_code?: string;
    article_number?: string;
    module?: string;
  }>;
}> {
  let parsedPayload: z.infer<typeof RAGPayloadSchema> | null = null;
  try {
    parsedPayload = RAGPayloadSchema.parse(rawPayload);
    const localResult = await searchLegalArticles(parsedPayload.query, parsedPayload.module, 24);
    const rerankResult = parsedPayload.useReranker === false
      ? { matches: localResult.matches, status: 'disabled' as const }
      : await rerankLegalArticles(parsedPayload.query, parsedPayload.module, localResult.matches);
    const sources = rerankResult.matches.slice(0, parsedPayload.limit || 8);
    const publicCitations = sources.map((source) => ({
      id: source.id,
      title: source.title,
      subtitle: source.subtitle,
      content: source.content,
      law_code: source.law_code,
      article_number: source.article_number,
      module: source.module,
    }));
    const context = formatRAGContext(sources, parsedPayload.module);
    const finalModelUsed = rerankResult.status === 'applied'
      ? `${rerankResult.provider}:${rerankResult.model}`
      : 'extractive-hybrid-search';

    logLegalExecution({
      requestId: crypto.randomUUID(),
      operation: 'search',
      module: parsedPayload.module,
      primaryModel: 'lancedb-minilm-fts',
      finalModelUsed,
      hasFallback: rerankResult.status === 'fallback',
      fallbackReason: rerankResult.fallbackReason,
      prompt: parsedPayload.query,
      ragContext: context,
      output: context,
      sources,
    });

    return {
      context,
      citations: publicCitations,
    };
  } catch (err: any) {
    console.error('[IPC RAG] Search handler failed:', err);
    const rawModule = (typeof rawPayload === 'object' && rawPayload && 'module' in rawPayload)
      ? String((rawPayload as any).module)
      : 'unknown';
    const rawQuery = (typeof rawPayload === 'object' && rawPayload && 'query' in rawPayload)
      ? String((rawPayload as any).query).slice(0, 500)
      : '';
    const errorMessage = err?.message || 'Error desconocido en búsqueda jurídica';

    try {
      logLegalExecution({
        requestId: crypto.randomUUID(),
        operation: 'search',
        module: (parsedPayload?.module || 'todos') as any,
        primaryModel: 'lancedb-minilm-fts',
        finalModelUsed: 'none',
        hasFallback: false,
        fallbackReason: `rag_search_error: ${errorMessage}`,
        prompt: parsedPayload?.query || rawQuery,
        ragContext: '',
        output: `ERROR: ${errorMessage}`,
        sources: [],
      });
    } catch {
      // Traceability fallback logging
    }

    throw new Error(`[IPC RAG] Fallo en la búsqueda del corpus legal: ${errorMessage}`);
  }
}

export function registerRagHandlers(): void {
  // IPC vector search proxy
  ipcMain.handle('ipc:rag-search', async (_event, rawPayload: unknown) => {
    return processRagSearch(rawPayload);
  });
}
