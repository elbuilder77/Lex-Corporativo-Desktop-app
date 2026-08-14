import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { sanitizeForLogs } from './sanitizer';
import type { GroundedClaim } from './legal-grounding';
import type { LegalEcosystem } from '../../shared/legal-contracts';

export interface QueryTrace {
  requestId: string;
  operation: 'search' | 'consultation' | 'analysis' | 'drafting';
  moduleUsed: LegalEcosystem;
  ecosystemLegal: LegalEcosystem;
  primaryModel: string;
  finalModelUsed: string;
  hasFallback: boolean;
  fallbackReason?: string;
  promptHash: string;
  ragContextHash: string;
  outputHash: string;
  timestamp: string;
  sourcesCount: number;
  sourcesCitations: Array<{ id: string | number; type: string; title: string; subtitle?: string; similarity: number }>;
  groundingClaims: Array<{ claimId: string; claimHash: string; sourceIds: string[] }>;
  executionBoundary: 'local-only' | 'external-provider';
  externalProvider?: 'gemini' | 'openai' | 'anthropic';
  originalFilesTransmitted: false;
  vaultTransmitted: false;
}

interface LegalExecutionTraceInput {
  requestId: string;
  operation: QueryTrace['operation'];
  module: QueryTrace['moduleUsed'];
  primaryModel: string;
  finalModelUsed: string;
  hasFallback?: boolean;
  fallbackReason?: string;
  prompt: string;
  ragContext: string;
  output: string;
  sources?: Array<{
    id?: string | number;
    type?: string;
    title?: string;
    subtitle?: string;
    similarity?: number;
    law_code?: string;
    article_number?: string;
  }>;
  claims?: GroundedClaim[];
}

export function getTraceLedgerPath(): string {
  return path.join(app.getPath('userData'), 'logs', 'trace_ledger.jsonl');
}

export function getTraceLedgerStatus(): { path: string; exists: boolean; size: number } {
  const ledgerPath = getTraceLedgerPath();
  if (!fs.existsSync(ledgerPath)) {
    return { path: ledgerPath, exists: false, size: 0 };
  }

  return {
    path: ledgerPath,
    exists: true,
    size: fs.statSync(ledgerPath).size,
  };
}

/**
 * Renders a SHA-256 hash of plain text inputs for cryptographic validation without leaking original contents
 */
export function generateHash(text: string): string {
  if (!text) return 'empty_hash';
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Traces a legal query execution and registers sanitized details into a secure local ledger
 */
export function logTrace(trace: QueryTrace): void {
  const cleanTrace = sanitizeForLogs(trace);
  
  // Imprimir en consola de desarrollo
  console.info(`[TRACEABILITY] Request logged: ${cleanTrace.requestId} [module=${cleanTrace.moduleUsed}, sources=${cleanTrace.sourcesCount}]`);

  try {
    // Determinar la ruta segura de almacenamiento (AppData/Roaming en Windows, Application Support en Mac)
    const userDataPath = app.getPath('userData');
    const logsDir = path.join(userDataPath, 'logs');
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const ledgerPath = getTraceLedgerPath();
    
    // Anexar la traza como una línea JSON (JSONL) para auditoría
    const logLine = JSON.stringify(cleanTrace) + '\n';
    fs.appendFileSync(ledgerPath, logLine, 'utf-8');
  } catch (error) {
    console.error('[TRACEABILITY] Failed to write trace to secure ledger', error);
  }
}

export function logLegalExecution(input: LegalExecutionTraceInput): void {
  const sources = input.sources || [];
  const providerMatch = /^(gemini|openai|anthropic):/i.exec(input.finalModelUsed);
  const externalProvider = providerMatch?.[1]?.toLowerCase() as QueryTrace['externalProvider'];
  logTrace({
    requestId: input.requestId,
    operation: input.operation,
    moduleUsed: input.module,
    ecosystemLegal: input.module,
    primaryModel: input.primaryModel,
    finalModelUsed: input.finalModelUsed,
    hasFallback: Boolean(input.hasFallback),
    fallbackReason: input.fallbackReason,
    promptHash: generateHash(input.prompt),
    ragContextHash: generateHash(input.ragContext),
    outputHash: generateHash(input.output),
    timestamp: new Date().toISOString(),
    sourcesCount: sources.length,
    sourcesCitations: sources.map((source, index) => ({
      id: source.id ?? index,
      type: source.type || 'statute',
      title: source.title || source.law_code || 'Fuente local',
      subtitle: source.subtitle || source.article_number,
      similarity: Number.isFinite(source.similarity) ? Number(source.similarity) : 0,
    })),
    groundingClaims: (input.claims || []).map(claim => ({
      claimId: claim.claimId,
      claimHash: generateHash(claim.text),
      sourceIds: [...new Set(claim.sourceIds)],
    })),
    executionBoundary: externalProvider ? 'external-provider' : 'local-only',
    externalProvider,
    originalFilesTransmitted: false,
    vaultTransmitted: false,
  });
}
