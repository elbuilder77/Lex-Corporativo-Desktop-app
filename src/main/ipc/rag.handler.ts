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

export function registerRagHandlers(): void {
  // IPC vector search proxy
  ipcMain.handle('ipc:rag-search', async (_event, rawPayload: unknown) => {
    try {
      const payload = RAGPayloadSchema.parse(rawPayload);
      const localResult = await searchLegalArticles(payload.query, payload.module, 24);
      const rerankResult = payload.useReranker === false
        ? { matches: localResult.matches, status: 'disabled' as const }
        : await rerankLegalArticles(payload.query, payload.module, localResult.matches);
      const sources = rerankResult.matches.slice(0, payload.limit || 8);
      const publicCitations = sources.map((source) => ({
        id: source.id,
        title: source.title,
        subtitle: source.subtitle,
        content: source.content,
        law_code: source.law_code,
        article_number: source.article_number,
        module: source.module,
      }));
      const context = formatRAGContext(sources, payload.module);
      const finalModelUsed = rerankResult.status === 'applied'
        ? `${rerankResult.provider}:${rerankResult.model}`
        : 'extractive-hybrid-search';

      logLegalExecution({
        requestId: crypto.randomUUID(),
        operation: 'search',
        module: payload.module,
        primaryModel: 'lancedb-minilm-fts',
        finalModelUsed,
        hasFallback: rerankResult.status === 'fallback',
        fallbackReason: rerankResult.fallbackReason,
        prompt: payload.query,
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
      return { context: '', citations: [] };
    }
  });
}
