import { app } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as lancedb from '@lancedb/lancedb';
import * as path from 'path';
import type { DocumentChunk } from './chunking';
import { MODULE_ALLOWED_LAW_CODES, getModuleLabel, isLawAllowedForModule, normalizeLawCode, type LegalModule } from './prompts';
import { assessLegalEvidence, getExplicitProvisionTarget, getPreferredLawCodes } from './legal-relevance';

function resolveRuntimeOverride(value: string): string {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(app.getAppPath(), value);
}

function getConfiguredModelRoot(): string | null {
  const configuredModelPath = process.env.LEX_EMBEDDING_MODEL_PATH?.trim();
  return configuredModelPath ? path.dirname(resolveRuntimeOverride(configuredModelPath)) : null;
}

function getConfiguredLancePath(): string | null {
  const configured = process.env.LEX_ENGINE_LANCE_PATH?.trim();
  if (!configured) return null;
  const resolved = resolveRuntimeOverride(configured);
  return path.basename(resolved).toLowerCase() === 'legal_knowledge.lance'
    ? path.dirname(resolved)
    : resolved;
}

export interface RAGMatch {
  id: string | number;
  type: 'statute' | 'jurisprudence';
  title: string;
  subtitle?: string;
  content: string;
  similarity: number;
  law_code?: string;
  article_number?: string;
  citation_label?: string;
  source_url?: string;
  module?: LegalModule;
  verification_status?: 'verified_against_official_source';
}

export interface UserDocumentMatch {
  id: string | number;
  fileName: string;
  content: string;
  similarity: number;
  module: LegalModule;
  requestId: string;
  contentHash: string;
  chunkIndex: number;
  pageNumber?: number;
}

export interface IndexUserDocumentInput {
  requestId: string;
  fileName: string;
  contentHash: string;
  module: LegalModule;
  chunks: DocumentChunk[];
}

export interface IndexedUserDocument {
  fileName: string;
  contentHash: string;
  chunkCount: number;
}

export const USER_DOCUMENT_TTL_MS = 24 * 60 * 60 * 1000;

export interface AnalysisContextResult {
  context: string;
  legalSources: RAGMatch[];
  documentSources: UserDocumentMatch[];
}

import { pipeline, env } from '@xenova/transformers';

// Global cached model to avoid reloading on each query
let extractorModel: any = null;

async function getExtractor() {
  if (!extractorModel) {
    if (app.isPackaged) {
      env.allowRemoteModels = false;
      env.localModelPath = getConfiguredModelRoot() || path.join(process.resourcesPath, 'legal-runtime', 'models');
    } else {
      env.allowRemoteModels = false; // Disable remote lookup to prevent hangs when offline
      env.localModelPath = getConfiguredModelRoot() || path.join(app.getAppPath(), 'legal-runtime', 'models');
      env.cacheDir = env.localModelPath;
    }
    
    try {
      extractorModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    } catch (err) {
      console.error('[RAG Local] Failed to load embedding model. Ensure the model is bundled in extraResources.', err);
      throw err;
    }
  }
  return extractorModel;
}

async function createEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data) as number[];
}

const SEARCH_STOPWORDS = new Set([
  'como', 'cual', 'cuales', 'dame', 'definicion', 'define', 'dime', 'donde', 'para', 'porque',
  'puede', 'puedo', 'que', 'quien', 'sobre', 'tiene', 'tengo', 'una', 'uno', 'unas', 'unos',
  'el', 'la', 'los', 'las', 'de', 'del', 'en', 'un', 'con', 'por', 'al', 'su', 'sus', 'es',
  'se', 'lo', 'y', 'o', 'si', 'no', 'te', 'me', 'le', 'les', 'nos', 'ya'
]);

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getQueryTerms(query: string): string[] {
  return [...new Set(
    normalizeForSearch(query)
      .split(' ')
      // Allow terms >= 1 char so article numbers and acronyms like SA, CV, 51 are not dropped.
      .filter(term => term.length >= 1 && !SEARCH_STOPWORDS.has(term))
  )];
}

function scoreLexicalMatch(row: any, terms: string[]): number {
  if (terms.length === 0) return 0;

  const lawCode = normalizeLawCode(row.law_code || row.title) || '';
  const article = normalizeForSearch(String(row.article || ''));
  const content = normalizeForSearch(`${row.title || ''} ${row.article || ''} ${row.content || ''}`);
  
  const contentWords = new Set(content.split(' '));
  const articleWords = new Set(article.split(' '));
  let score = 0;

  for (const term of terms) {
    if (contentWords.has(term)) score += 4;
    if (articleWords.has(term)) score += 2;
    if (lawCode === 'LGTOC' && ['pagare', 'cheque', 'endoso', 'aval', 'letra'].includes(term)) score += 5;
    if (lawCode === 'LGSM' && ['sociedad', 'sociedades', 'asamblea', 'accion', 'acciones', 'disolucion', 'liquidador', 'disolver'].includes(term)) score += 5;
    if (lawCode === 'CFF' && ['materialidad', 'deducibilidad', 'cfdi', '69b', '69'].includes(term)) score += 5;
    if (lawCode === 'LFT' && ['trabajador', 'trabajadora', 'patron', 'salario', 'jornada', 'prestaciones', 'laboral', 'contrato'].includes(term)) score += 5;
    if (lawCode === 'LCE' && ['comercio', 'exterior', 'exportacion', 'importacion', 'cuota', 'compensatoria', 'arancelaria'].includes(term)) score += 5;
    if (lawCode === 'RLCE' && ['comision', 'secretaria', 'permiso', 'cupo', 'certificado', 'origen'].includes(term)) score += 5;
    if (lawCode === 'LA' && ['aduana', 'aduanal', 'pedimento', 'despacho', 'mercancias', 'regimen', 'valor'].includes(term)) score += 5;
    if (lawCode === 'RLA' && ['aduana', 'aduanal', 'expediente', 'electronico', 'agente', 'mandatario', 'prevalidacion'].includes(term)) score += 5;
    if (lawCode === 'RGCE' && ['rgce', 'regla', 'anexo', 'pedimento', 'aduana', 'valor', 'despacho'].includes(term)) score += 5;
    if (lawCode === 'LIGIE' && ['ligie', 'tigie', 'fraccion', 'arancelaria', 'tarifa', 'capitulo', 'arancel'].includes(term)) score += 5;
  }

  if (terms.includes('pagare') && lawCode === 'LGTOC' && articleWords.has('170')) score += 20;
  if (terms.includes('sa') || terms.includes('cv') || terms.includes('anonima')) {
    if (lawCode === 'LGSM') score += 10;
  }
  if (terms.includes('pedimento') && lawCode === 'LA' && articleWords.has('36')) score += 20;
  if (terms.includes('valor') && lawCode === 'RGCE' && articleWords.has('1') && articleWords.has('5')) score += 12;
  
  return score;
}

async function getLexicalMatches(
  table: lancedb.Table,
  query: string,
  module: LegalModule,
  limit: number
): Promise<any[]> {
  const terms = getQueryTerms(query);
  if (terms.length === 0) return [];

  try {
    const lawFilter = getModuleLawFilter(module);
    const rows = await table
      .query()
      .where(lawFilter)
      .limit(5000)
      .toArray();

    return rows
      .map((row: any) => ({ row, score: scoreLexicalMatch(row, terms) }))
      .filter(({ row, score }: { row: any; score: number }) => score > 0 && isLawAllowedForModule(row.law_code || row.title, module))
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, limit)
      .map(({ row, score }: { row: any; score: number }) => ({ ...row, _lexicalScore: score }));
  } catch (err: any) {
    console.warn(`[RAG Local] Lexical rerank failed for ${module}:`, err.message || err);
    return [];
  }
}

function getRagCandidatePaths(): string[] {
  const configuredPath = getConfiguredLancePath();
  if (configuredPath) return [configuredPath];
  const userDataPath = path.join(app.getPath('userData'), 'lance_data');
  const bundledPath = app.isPackaged
    ? path.join(process.resourcesPath, 'legal-runtime', 'lance_data')
    : path.join(app.getAppPath(), 'legal-runtime', 'lance_data');

  return [...new Set([userDataPath, bundledPath])];
}

function hasLegalKnowledgeTable(dbPath: string): boolean {
  return fs.existsSync(path.join(dbPath, 'legal_knowledge.lance'));
}

function getLocalRagPath(): string {
  const configuredPath = getConfiguredLancePath();
  if (configuredPath) return configuredPath;
  const userDataPath = path.join(app.getPath('userData'), 'lance_data');
  const bundledPath = app.isPackaged
    ? path.join(process.resourcesPath, 'legal-runtime', 'lance_data')
    : path.join(app.getAppPath(), 'legal-runtime', 'lance_data');

  if (!app.isPackaged) return bundledPath;

  return synchronizePackagedLegalKnowledge(userDataPath, bundledPath)
    ? userDataPath
    : path.join(app.getPath('userData'), 'legal-retrieval-disabled');
}

export function getLegalKnowledgeRuntimePath(): string {
  return getLocalRagPath();
}

function getUserDocumentsRagPath(): string {
  const userDocumentsPath = path.join(app.getPath('userData'), 'lance_data');
  fs.mkdirSync(userDocumentsPath, { recursive: true });
  return userDocumentsPath;
}

function hasUserDocumentsTable(dbPath: string): boolean {
  return fs.existsSync(path.join(dbPath, 'user_documents.lance'));
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function toStoredLawCode(code: string): string {
  return code === 'CCOM' ? 'CCom' : code;
}

function getModuleLawFilter(module: LegalModule): string {
  return MODULE_ALLOWED_LAW_CODES[module]
    .map(code => `law_code = '${escapeSqlLiteral(toStoredLawCode(code))}'`)
    .join(' OR ');
}

function getCorpusManifestPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'legal-runtime', 'corpus-manifest.json')
    : path.join(app.getAppPath(), 'legal-runtime', 'corpus', 'corpus-manifest.json');
}

function getVerifiedLawCodes(): Set<string> {
  const manifestPath = getCorpusManifestPath();
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return new Set(
      (Array.isArray(manifest?.laws) ? manifest.laws : [])
        .filter((law: any) => (
          law?.source?.verificationStatus === 'verified_against_official_source'
          && law?.structure?.duplicateRows === 0
          && law?.structure?.extractionArtifacts?.total === 0
        ))
        .map((law: any) => normalizeLawCode(law.code))
        .filter(Boolean),
    );
  } catch (error: any) {
    console.error('[RAG Local] Corpus governance manifest is missing or invalid; legal retrieval is disabled.', error.message || error);
    return new Set();
  }
}

function getBundledVectorSignature(): string | null {
  try {
    const manifest = JSON.parse(fs.readFileSync(getCorpusManifestPath(), 'utf8'));
    return typeof manifest?.vectorStore?.sha256 === 'string' ? manifest.vectorStore.sha256 : null;
  } catch {
    return null;
  }
}

function synchronizePackagedLegalKnowledge(userDataPath: string, bundledPath: string): boolean {
  const signature = getBundledVectorSignature();
  const sourceTable = path.join(bundledPath, 'legal_knowledge.lance');
  const targetTable = path.join(userDataPath, 'legal_knowledge.lance');
  const stagingTable = path.join(userDataPath, 'legal_knowledge.lance.next');
  const backupTable = path.join(userDataPath, 'legal_knowledge.lance.previous');
  const markerPath = path.join(userDataPath, 'legal_knowledge.version.json');

  if (!signature || !fs.existsSync(sourceTable)) return false;

  try {
    const marker = fs.existsSync(markerPath) ? JSON.parse(fs.readFileSync(markerPath, 'utf8')) : null;
    if (fs.existsSync(targetTable) && marker?.vectorStoreSha256 === signature) return true;

    fs.mkdirSync(userDataPath, { recursive: true });
    if (!fs.existsSync(targetTable) && fs.existsSync(backupTable)) fs.renameSync(backupTable, targetTable);
    fs.rmSync(stagingTable, { recursive: true, force: true });
    fs.cpSync(sourceTable, stagingTable, { recursive: true, force: true });
    fs.rmSync(backupTable, { recursive: true, force: true });
    if (fs.existsSync(targetTable)) fs.renameSync(targetTable, backupTable);

    try {
      fs.renameSync(stagingTable, targetTable);
      fs.writeFileSync(markerPath, `${JSON.stringify({ vectorStoreSha256: signature })}\n`, 'utf8');
      fs.rmSync(backupTable, { recursive: true, force: true });
      return true;
    } catch (error) {
      fs.rmSync(stagingTable, { recursive: true, force: true });
      if (!fs.existsSync(targetTable) && fs.existsSync(backupTable)) fs.renameSync(backupTable, targetTable);
      throw error;
    }
  } catch (error: any) {
    console.error('[RAG Local] Packaged legal corpus synchronization failed; retrieval is disabled.', error.message || error);
    return false;
  }
}

async function listUserDocumentRows(table: lancedb.Table): Promise<any[]> {
  return table.query().where('id IS NOT NULL').limit(1_000_000).toArray();
}

async function deleteUserDocumentRowsById(table: lancedb.Table, ids: string[]): Promise<void> {
  for (let index = 0; index < ids.length; index += 100) {
    const predicate = ids
      .slice(index, index + 100)
      .map(id => `id = '${escapeSqlLiteral(id)}'`)
      .join(' OR ');
    await table.delete(predicate);
  }
}

export async function isLocalRagAvailable(): Promise<boolean> {
  const dbPath = getLocalRagPath();

  if (!hasLegalKnowledgeTable(dbPath) || getVerifiedLawCodes().size === 0) return false;

  try {
    const db = await lancedb.connect(dbPath);
    await db.openTable('legal_knowledge');
    return true;
  } catch (err: any) {
    console.warn('[RAG Local] LanceDB availability check failed:', err.message || err);
    return false;
  }
}

async function searchLegalKnowledge(
  query: string,
  module: LegalModule,
  vector: number[],
  limit: number
): Promise<{ matches: RAGMatch[]; dbPath: string }> {
  const dbPath = getLocalRagPath();
  const db = await lancedb.connect(dbPath);
  const table = await db.openTable('legal_knowledge');
  const verifiedLawCodes = getVerifiedLawCodes();
  if (verifiedLawCodes.size === 0) return { matches: [], dbPath };
  const rawLimit = Math.max(limit * 4, 20);
  const lawFilter = getModuleLawFilter(module);

  const explicitTarget = getExplicitProvisionTarget(query);
  const preferredLawCodes = getPreferredLawCodes(query);
  let explicitResults: any[] = [];
  if (explicitTarget.lawCode && explicitTarget.id) {
    const storedLawCode = toStoredLawCode(explicitTarget.lawCode);
    const label = `${explicitTarget.kind === 'rule' || ['RMF', 'RGCE'].includes(explicitTarget.lawCode) ? 'Regla' : 'Artículo'} ${explicitTarget.id}`;
    explicitResults = await table
      .query()
      .where(`law_code = '${escapeSqlLiteral(storedLawCode)}' AND article = '${escapeSqlLiteral(label)}' AND (${lawFilter})`)
      .limit(1)
      .toArray();
  }

  let searchResults: any[] = [];
  try {
    searchResults = await table
      .vectorSearch(vector)
      .where(lawFilter)
      .limit(rawLimit)
      .toArray();
  } catch (err: any) {
    console.warn(`[RAG Local] Module filter failed for ${module}; using post-filter fallback:`, err.message || err);
  }

  if (searchResults.length === 0) {
    searchResults = await table
      .vectorSearch(vector)
      .limit(rawLimit)
      .toArray();
  }

  const lexicalResults = (await getLexicalMatches(table, query, module, limit))
    .filter((row: any) => verifiedLawCodes.has(normalizeLawCode(row.law_code || row.title) || ''));
  const combinedResults = [...explicitResults.map(row => ({ ...row, _explicitMatch: true })), ...lexicalResults, ...searchResults];
  const seenIds = new Set<string>();

  const matches: RAGMatch[] = combinedResults
    .filter((r: any) => {
      const lawCode = r.law_code || r.title;
      const id = String(r.id || `${r.law_code}-${r.article}`);
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      const normalizedCode = normalizeLawCode(lawCode) || '';
      return verifiedLawCodes.has(normalizedCode)
        && isLawAllowedForModule(lawCode, module)
        && (preferredLawCodes.size === 0 || preferredLawCodes.has(normalizedCode));
    })
    .map((r: any) => {
      const normalizedCode = normalizeLawCode(r.law_code || r.title) || r.law_code || r.title;
      return {
        id: r.id || crypto.randomUUID(),
        type: 'statute' as const,
        title: r.title,
        subtitle: r.article,
        content: r.content,
        similarity: r._explicitMatch ? 1 : typeof r._distance === 'number' ? 1.0 - r._distance : Math.min(0.95, 0.35 + Number(r._lexicalScore || 0) / 100),
        law_code: normalizedCode,
        article_number: r.article,
        citation_label: r.citation_label,
        source_url: r.source_url,
        module,
        verification_status: 'verified_against_official_source' as const,
      };
    })
    .filter(match => assessLegalEvidence(query, match).sufficient)
    .slice(0, limit);

  return { matches, dbPath };
}

/**
 * Executes a local vector search over Mexican statutes using LanceDB.
 */
export async function getHybridLegalContext(
  query: string,
  module: LegalModule,
  limit = 6,
  isDrafting = false,
  executionMode: 'local' | 'byok' | 'balanced' = 'balanced',
): Promise<{ context: string; sources: RAGMatch[] }> {
  const startMs = Date.now();

  try {
    const vector = await createEmbedding(query);
    const { matches, dbPath } = await searchLegalKnowledge(query, module, vector, limit);

    console.info(`[RAG Local] Vector search resolved ${matches.length} ${module} sources in ${Date.now() - startMs}ms from ${dbPath}`);

    const preparedSources = prepareLegalSourcesForEngine(matches, executionMode);
    const context = formatRAGContext(preparedSources, module, isDrafting);
    return { context, sources: preparedSources };
  } catch (err: any) {
    console.warn('[RAG Local] Search failed — Operating without verified RAG database context:', err.message || err);
    return { context: '', sources: [] };
  }
}

/**
 * Keeps the same authoritative retrieval lane for every engine while adapting
 * context density to the engine that must consume it. Explicit/high-scoring
 * provisions remain first and a second pass adds cross-law coverage.
 */
export function prepareLegalSourcesForEngine(
  matches: RAGMatch[],
  executionMode: 'local' | 'byok' | 'balanced',
): RAGMatch[] {
  const policy = executionMode === 'local'
    ? { maxSources: 4, maxCharsPerSource: 1_400 }
    : executionMode === 'byok'
      ? { maxSources: 8, maxCharsPerSource: 3_200 }
      : { maxSources: 6, maxCharsPerSource: 2_200 };
  const selected: RAGMatch[] = [];
  const selectedIds = new Set<string>();
  const selectedLaws = new Set<string>();

  const add = (source: RAGMatch) => {
    const id = String(source.id);
    if (selectedIds.has(id) || selected.length >= policy.maxSources) return;
    selectedIds.add(id);
    selectedLaws.add(String(source.law_code || source.title).toUpperCase());
    selected.push({
      ...source,
      content: source.content.length > policy.maxCharsPerSource
        ? `${source.content.slice(0, policy.maxCharsPerSource)}\n[FRAGMENTO RECORTADO]`
        : source.content,
    });
  };

  // Preserve the strongest source, then favor one source per law before
  // filling remaining capacity by relevance.
  if (matches[0]) add(matches[0]);
  for (const source of matches) {
    const law = String(source.law_code || source.title).toUpperCase();
    if (!selectedLaws.has(law)) add(source);
  }
  for (const source of matches) add(source);
  return selected;
}

export async function getAnalysisContext(
  query: string,
  module: LegalModule,
  requestId: string,
  limit = 6
): Promise<AnalysisContextResult> {
  const startMs = Date.now();

  try {
    const vector = await createEmbedding(query);
    const [legalResult, documentSources] = await Promise.all([
      searchLegalKnowledge(query, module, vector, limit).catch((err: any) => {
        console.warn(`[RAG Local] Analysis legal lane failed for ${module}:`, err.message || err);
        return { matches: [], dbPath: '' };
      }),
      searchUserDocuments(query, module, requestId, vector, limit).catch((err: any) => {
        console.warn(`[RAG Local] Analysis document lane failed for ${module}:`, err.message || err);
        return [];
      }),
    ]);

    console.info(
      `[RAG Local] Analysis context resolved ${documentSources.length} document chunks and ${legalResult.matches.length} legal sources for ${module} in ${Date.now() - startMs}ms`
    );

    return {
      context: formatAnalysisContext(documentSources, legalResult.matches, module),
      legalSources: legalResult.matches,
      documentSources,
    };
  } catch (err: any) {
    console.warn('[RAG Local] Analysis context failed:', err.message || err);
    return {
      context: '',
      legalSources: [],
      documentSources: [],
    };
  }
}

async function searchUserDocuments(
  query: string,
  module: LegalModule,
  requestId: string,
  vector: number[],
  limit: number
): Promise<UserDocumentMatch[]> {
  const dbPath = getUserDocumentsRagPath();
  if (!hasUserDocumentsTable(dbPath)) return [];

  const db = await lancedb.connect(dbPath);
  const table = await db.openTable('user_documents');
  const rawLimit = Math.max(limit * 3, 12);
  const requestFilter = `"requestId" = '${escapeSqlLiteral(requestId)}' AND module = '${module}'`;
  const rows: any[] = await table
    .vectorSearch(vector)
    .where(requestFilter)
    .limit(rawLimit)
    .toArray();

  return rows
    .filter((row: any) => row.requestId === requestId && row.module === module)
    .slice(0, limit)
    .map((row: any) => ({
      id: row.id || crypto.randomUUID(),
      fileName: row.fileName || 'documento',
      content: row.content || '',
      similarity: 1.0 - (row._distance || 0),
      module,
      requestId,
      contentHash: row.contentHash || '',
      chunkIndex: Number(row.chunkIndex || 0),
      pageNumber: Number(row.pageNumber || 0) || undefined,
    }));
}

/**
 * Formats structured RAG citations into an LLM context block
 */
function formatRAGContext(matches: RAGMatch[], module: LegalModule, isDrafting = false): string {
  if (matches.length === 0) return '';

  const statuteLines = matches
    .filter(m => m.type === 'statute')
    .map(m => `— [FUENTE_ID=${String(m.id)}] [FUENTE OFICIAL VERIFICADA] ${m.law_code || m.title} ${m.article_number || ''}: "${m.content.slice(0, 1500)}"`);

  const jurLines = matches
    .filter(m => m.type === 'jurisprudence')
    .map(m => `— [FUENTE_ID=${String(m.id)}] JURISPRUDENCIA [${m.subtitle}]: "${m.content.slice(0, 2000)}"`);

  let instructionLines: string[];
  if (isDrafting) {
    instructionLines = [
      '1. Tu objetivo principal es REDACTAR EL INSTRUMENTO O DOCUMENTO solicitado por el usuario.',
      '2. Utiliza los artículos recuperados estrictamente como guía para asegurar que tu redacción cumpla los requisitos de ley.',
      '3. Bajo ninguna circunstancia rechaces la redacción. Si faltan datos geográficos o específicos en el texto legal, utiliza los datos del usuario o deja espacios en blanco (ej. [Ciudad]).',
      '4. Redacta de forma formal, profesional y completa.',
    ];
  } else {
    const moduleLabel = getModuleLabel(module);
    instructionLines = [
      `1. Fundamenta tu respuesta únicamente con fuentes de ${moduleLabel} del contexto verificado.`,
      '2. Usa los artículos o reglas recuperadas como base principal de la explicación.',
      '3. Responde únicamente con la información que se encuentre en el contexto proporcionado.',
      '4. Si hay contradicción, prioriza la fuente vigente y explica la tensión sin inventar fundamentos.',
    ];
  }

  return `
<CONTEXTO LEGAL>
ÁREA SOLICITADA: ${getModuleLabel(module)}

--- LEYES Y REGLAMENTOS ---
${statuteLines.join('\n\n') || 'No se encontraron artículos específicos.'}

--- CRITERIOS Y JURISPRUDENCIA ---
${jurLines.join('\n\n') || 'No se encontró jurisprudencia relevante.'}
</CONTEXTO LEGAL>

INSTRUCCIONES: 
${instructionLines.join('\n')}
`;
}

export function formatAnalysisContext(
  documentMatches: UserDocumentMatch[],
  legalMatches: RAGMatch[],
  module: LegalModule
): string {
  const documentLines = documentMatches.map(match => {
    const page = match.pageNumber ? ` página ${match.pageNumber}` : '';
    return `- ${match.fileName}${page}, fragmento ${match.chunkIndex + 1}: "${match.content.slice(0, 1500)}"`;
  });

  const legalLines = legalMatches.map(match => (
    `- [FUENTE_ID=${String(match.id)}] ${match.law_code || match.title} ${match.article_number || ''}: "${match.content.slice(0, 1500)}"`
  ));

  return `### DOCUMENTOS ANALIZADOS (Evidencia del Usuario)
${documentLines.join('\n\n') || 'No se recuperaron fragmentos relevantes de los documentos cargados.'}

### FUNDAMENTO LEGAL VERIFICADO (Leyes del Ecosistema)
Área solicitada: ${getModuleLabel(module)}

${legalLines.join('\n\n') || 'No se encontraron artículos específicos del ecosistema solicitado.'}

INSTRUCCIONES:
1. Tu tarea principal es analizar los "DOCUMENTOS ANALIZADOS". Extrae riesgos, obligaciones y datos clave del texto cargado.
2. Si el "FUNDAMENTO LEGAL VERIFICADO" no contiene artículos directamente aplicables, abstente de emitir conclusiones jurídicas; limita la salida a describir el documento y señalar qué fundamento falta.
3. Mantén el análisis dentro del ecosistema ${getModuleLabel(module)} salvo que el usuario pida expresamente impacto transversal.
`;
}

export async function getDynamicLawsForChunk(
  chunkText: string,
  module: LegalModule,
  limit = 3
): Promise<string> {
  try {
    const vector = await createEmbedding(chunkText);
    const { matches } = await searchLegalKnowledge(chunkText, module, vector, limit);
    if (matches.length === 0) return 'No se encontraron artículos específicos aplicables a este fragmento.';
    
    return matches.map(m => `- ${m.law_code || m.title} ${m.article_number || ''}: "${m.content.slice(0, 1500)}"`).join('\n\n');
  } catch (err: any) {
    console.warn(`[RAG Local] Dynamic RAG failed for chunk:`, err.message || err);
    return 'Error recuperando leyes para este fragmento.';
  }
}

/**
 * Indexa chunks ya extraídos del usuario en una tabla LanceDB local y escribible.
 */
export async function indexUserDocument(input: IndexUserDocumentInput): Promise<IndexedUserDocument> {
  const startMs = Date.now();
  const chunks = input.chunks.filter(chunk => chunk.text.trim().length > 0);

  if (chunks.length === 0) {
    throw new Error(`No hay contenido indexable en '${input.fileName}'.`);
  }

  const dbPath = getUserDocumentsRagPath();
  const db = await lancedb.connect(dbPath);
  const tableNames = await db.tableNames();
  const indexedAt = new Date().toISOString();
  const records = [];

  for (const chunk of chunks) {
    records.push({
      id: crypto.randomUUID(),
      requestId: input.requestId,
      fileName: input.fileName,
      content: chunk.text,
      module: input.module,
      contentHash: input.contentHash,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber ?? 0,
      source: 'analysis_upload',
      indexedAt,
      vector: await createEmbedding(chunk.text),
    });
  }

  if (tableNames.includes('user_documents')) {
    const table = await db.openTable('user_documents');
    try {
      const existingRows = await listUserDocumentRows(table);
      const duplicateIds = existingRows
        .filter((row: any) => row.requestId === input.requestId && row.contentHash === input.contentHash)
        .map((row: any) => String(row.id));
      await deleteUserDocumentRowsById(table, duplicateIds);
      await table.add(records);
    } catch (err: any) {
      console.warn('[RAG Local] Recreating user_documents due to incompatible schema:', err.message || err);
      await db.dropTable('user_documents');
      const recreated = await db.createTable('user_documents', records);
      await recreated.createIndex('requestId', { config: lancedb.Index.btree() }).catch(() => undefined);
      await recreated.createIndex('module', { config: lancedb.Index.btree() }).catch(() => undefined);
      await recreated.createIndex('contentHash', { config: lancedb.Index.btree() }).catch(() => undefined);
    }
  } else {
    const table = await db.createTable('user_documents', records);
    await table.createIndex('requestId', { config: lancedb.Index.btree() }).catch(() => undefined);
    await table.createIndex('module', { config: lancedb.Index.btree() }).catch(() => undefined);
    await table.createIndex('contentHash', { config: lancedb.Index.btree() }).catch(() => undefined);
  }

  console.info(`[RAG Local] User document '${input.fileName}' indexed for ${input.module}. ${chunks.length} chunks in ${Date.now() - startMs}ms from ${dbPath}`);

  return {
    fileName: input.fileName,
    contentHash: input.contentHash,
    chunkCount: chunks.length,
  };
}

export async function cleanupUserDocumentRequest(requestId: string): Promise<void> {
  const dbPath = getUserDocumentsRagPath();
  if (!hasUserDocumentsTable(dbPath)) return;

  try {
    const db = await lancedb.connect(dbPath);
    const table = await db.openTable('user_documents');
    const rows = await listUserDocumentRows(table);
    const ids = rows
      .filter((row: any) => row.requestId === requestId)
      .map((row: any) => String(row.id));
    await deleteUserDocumentRowsById(table, ids);
    console.info(`[RAG Local] Cleared ${ids.length} temporary chunks for request ${requestId.slice(0, 8)}...`);
  } catch (err: any) {
    console.warn('[RAG Local] Failed to clear temporary user document chunks:', err.message || err);
  }
}

export async function purgeExpiredUserDocuments(
  maxAgeMs = USER_DOCUMENT_TTL_MS,
  nowMs = Date.now(),
): Promise<number> {
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
    throw new Error('El TTL de documentos temporales debe ser mayor a cero.');
  }

  const dbPath = getUserDocumentsRagPath();
  if (!hasUserDocumentsTable(dbPath)) return 0;

  try {
    const db = await lancedb.connect(dbPath);
    const table = await db.openTable('user_documents');
    const cutoffMs = nowMs - maxAgeMs;
    const cutoff = new Date(cutoffMs).toISOString();
    const rows = await listUserDocumentRows(table);
    const expiredIds = rows
      .filter((row: any) => {
        const indexedAtMs = Date.parse(String(row.indexedAt || ''));
        // Legacy rows without a trustworthy timestamp cannot prove they are
        // within policy, so remove them instead of retaining them indefinitely.
        return !Number.isFinite(indexedAtMs) || indexedAtMs < cutoffMs;
      })
      .map((row: any) => String(row.id));

    await deleteUserDocumentRowsById(table, expiredIds);

    const deleted = expiredIds.length;
    if (deleted > 0) {
      console.info(`[RAG Local] Purged ${deleted} temporary user-document chunks older than ${cutoff}.`);
    }
    return deleted;
  } catch (err: any) {
    console.warn('[RAG Local] Failed to purge expired temporary chunks:', err.message || err);
    return 0;
  }
}
