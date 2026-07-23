import { ipcMain } from 'electron';
import * as crypto from 'crypto';
import { z } from 'zod';
import { getHybridLegalContext, isLocalRagAvailable } from '../lib/rag';
import { logLegalExecution } from '../lib/traceability';

const RAGPayloadSchema = z.object({
  query: z.string().min(1),
  module: z.enum(['mercantil', 'fiscal']),
  limit: z.number().optional()
});

export function registerRagHandlers(): void {
  // IPC vector search proxy
  ipcMain.handle('ipc:rag-search', async (_event, rawPayload: unknown) => {
    try {
      const payload = RAGPayloadSchema.parse(rawPayload);
      const { context, sources } = await getHybridLegalContext(
        payload.query, 
        payload.module, 
        payload.limit
      );

      logLegalExecution({
        requestId: crypto.randomUUID(),
        operation: 'search',
        module: payload.module,
        primaryModel: 'lancedb-minilm',
        finalModelUsed: 'extractive-rag',
        prompt: payload.query,
        ragContext: context,
        output: context,
        sources,
      });
      
      return { context, citations: sources };
    } catch (err: any) {
      console.error('[IPC RAG] Search handler failed:', err);
      return { context: '', citations: [] };
    }
  });
}
