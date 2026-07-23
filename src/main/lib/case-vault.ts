import { app, safeStorage } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { sanitizeForLocalCache } from './sanitizer';

export interface CaseMetadata {
  caseId: string;
  name: string;
  module: 'engineering' | 'fiscal' | 'mercantil';
  createdAt: string;
  updatedAt: string;
  retentionUntil?: string | null;
}

export interface VaultCase {
  metadata: CaseMetadata;
  documents: Array<{ fileName: string; mimeType: string }>;
  analyses: any[];
  drafts: any[];
  state: Record<string, unknown> | null;
}

type CaseModule = CaseMetadata['module'];

const CASE_NOT_FOUND_MESSAGE = 'Selecciona un portafolio compatible o crea una nueva actividad.';
const CASE_MODULE_MISMATCH_MESSAGE = 'Este portafolio pertenece a otro ecosistema. Selecciona una actividad compatible o crea una nueva.';

function getSafeCaseLabel(caseId: string): string {
  return `${caseId.slice(0, 8)}...`;
}

function getVaultRoot(): string {
  // Use a fallback directory if app is not available (e.g. during testing)
  const root = app ? path.join(app.getPath('userData'), 'CaseVault') : path.join(process.cwd(), '.test-vault');
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  return root;
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  const vaultRoot = getVaultRoot();
  const dbPath = path.join(vaultRoot, 'vault.db');
  db = new Database(dbPath);

  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      caseId TEXT PRIMARY KEY,
      name TEXT,
      module TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      retentionUntil TEXT
    );
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caseId TEXT,
      fileName TEXT,
      mimeType TEXT,
      payload TEXT,
      FOREIGN KEY(caseId) REFERENCES cases(caseId) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caseId TEXT,
      analysisId TEXT,
      payload TEXT,
      FOREIGN KEY(caseId) REFERENCES cases(caseId) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caseId TEXT,
      draftId TEXT,
      payload TEXT,
      FOREIGN KEY(caseId) REFERENCES cases(caseId) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS case_state (
      caseId TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(caseId) REFERENCES cases(caseId) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_cases_updated_at ON cases(updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(caseId);
    CREATE INDEX IF NOT EXISTS idx_analyses_case_id ON analyses(caseId);
    CREATE INDEX IF NOT EXISTS idx_drafts_case_id ON drafts(caseId);
  `);

  const caseColumns = db.pragma('table_info(cases)') as Array<{ name: string }>;
  if (!caseColumns.some(column => column.name === 'retentionUntil')) {
    db.exec('ALTER TABLE cases ADD COLUMN retentionUntil TEXT');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_cases_retention_until ON cases(retentionUntil)');

  // Existing installations can contain duplicates from retries. Keep the newest
  // payload before adding idempotency constraints.
  db.exec(`
    DELETE FROM analyses
    WHERE id NOT IN (SELECT MAX(id) FROM analyses GROUP BY caseId, analysisId);
    DELETE FROM drafts
    WHERE id NOT IN (SELECT MAX(id) FROM drafts GROUP BY caseId, draftId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_case_analysis ON analyses(caseId, analysisId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_drafts_case_draft ON drafts(caseId, draftId);
  `);
  
  return db;
}

// Encrypt payload safely
function encryptPayload(plainText: string): string {
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(plainText).toString('base64');
  }
  return 'obfuscated:' + Buffer.from(plainText, 'utf-8').toString('base64');
}

// Decrypt payload safely
function decryptPayload(encryptedText: string): string {
  if (encryptedText.startsWith('obfuscated:')) {
    const base64Part = encryptedText.slice('obfuscated:'.length);
    return Buffer.from(base64Part, 'base64').toString('utf-8');
  }
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(encryptedText, 'base64'));
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Vault] Local protection read failed.');
      }
      throw new Error('No se pudo descifrar el registro del portafolio.');
    }
  }
  throw new Error('Cifrado local del Sistema Operativo no disponible y el registro no está ofuscado.');
}

function readCaseMetadata(caseId: string): CaseMetadata {
  const row = getDb().prepare('SELECT * FROM cases WHERE caseId = ?').get(caseId) as CaseMetadata | undefined;
  if (!row) {
    throw new Error(CASE_NOT_FOUND_MESSAGE);
  }
  return row;
}

function assertCaseModule(caseId: string, expectedModule?: CaseModule): CaseMetadata {
  const metadata = readCaseMetadata(caseId);
  if (expectedModule && metadata.module !== expectedModule) {
    throw new Error(CASE_MODULE_MISMATCH_MESSAGE);
  }
  return metadata;
}

function updateCaseTimestamp(caseId: string): void {
  const timestamp = new Date().toISOString();
  getDb().prepare('UPDATE cases SET updatedAt = ? WHERE caseId = ?').run(timestamp, caseId);
}

export async function createCase(
  caseId: string,
  name: string,
  module: CaseModule,
  retentionUntil?: string,
): Promise<CaseMetadata> {
  const timestamp = new Date().toISOString();
  const existed = Boolean(getDb().prepare('SELECT 1 FROM cases WHERE caseId = ?').get(caseId));
  getDb().prepare(`
    INSERT INTO cases (caseId, name, module, createdAt, updatedAt, retentionUntil)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(caseId) DO UPDATE SET
      name = excluded.name,
      module = excluded.module,
      updatedAt = excluded.updatedAt,
      retentionUntil = COALESCE(excluded.retentionUntil, cases.retentionUntil)
  `).run(caseId, name, module, timestamp, timestamp, retentionUntil ?? null);

  if (!existed) {
    console.info(`[Vault] Local activity initialized (SQLite): ${getSafeCaseLabel(caseId)}`);
  }
  return readCaseMetadata(caseId);
}

export async function listCases(): Promise<CaseMetadata[]> {
  const rows = getDb().prepare('SELECT * FROM cases ORDER BY updatedAt DESC').all() as CaseMetadata[];
  return rows;
}

export async function renameCase(caseId: string, name: string, expectedModule?: CaseModule): Promise<CaseMetadata> {
  assertCaseModule(caseId, expectedModule);

  const timestamp = new Date().toISOString();
  getDb()
    .prepare('UPDATE cases SET name = ?, updatedAt = ? WHERE caseId = ?')
    .run(name, timestamp, caseId);

  console.info(`[Vault] Local activity renamed (SQLite): ${getSafeCaseLabel(caseId)}.`);
  return readCaseMetadata(caseId);
}

export async function saveDocument(caseId: string, fileName: string, mimeType: string, base64: string, expectedModule?: CaseModule): Promise<void> {
  assertCaseModule(caseId, expectedModule);
  
  const payloadStr = JSON.stringify({ fileName, mimeType, base64 });
  const encryptedPayload = encryptPayload(payloadStr);
  
  const stmt = getDb().prepare('INSERT INTO documents (caseId, fileName, mimeType, payload) VALUES (?, ?, ?, ?)');
  stmt.run(caseId, fileName, mimeType, encryptedPayload);
  
  updateCaseTimestamp(caseId);
  console.info(`[Vault] Document saved locally (SQLite) for activity ${getSafeCaseLabel(caseId)}.`);
}

export async function saveAnalysis(caseId: string, analysisId: string, analysisData: any, expectedModule?: CaseModule): Promise<void> {
  assertCaseModule(caseId, expectedModule);
  
  const cleanData = sanitizeForLocalCache(analysisData);
  const encryptedPayload = encryptPayload(JSON.stringify(cleanData));
  
  getDb().prepare(`
    INSERT INTO analyses (caseId, analysisId, payload) VALUES (?, ?, ?)
    ON CONFLICT(caseId, analysisId) DO UPDATE SET payload = excluded.payload
  `).run(caseId, analysisId, encryptedPayload);
         
  updateCaseTimestamp(caseId);
  console.info(`[Vault] Analysis saved locally (SQLite) for activity ${getSafeCaseLabel(caseId)}.`);
}

export async function saveDraft(caseId: string, draftId: string, draftData: any, expectedModule?: CaseModule): Promise<void> {
  assertCaseModule(caseId, expectedModule);

  const cleanData = sanitizeForLocalCache(draftData);
  const encryptedPayload = encryptPayload(JSON.stringify(cleanData));

  getDb().prepare(`
    INSERT INTO drafts (caseId, draftId, payload) VALUES (?, ?, ?)
    ON CONFLICT(caseId, draftId) DO UPDATE SET payload = excluded.payload
  `).run(caseId, draftId, encryptedPayload);

  updateCaseTimestamp(caseId);
  console.info(`[Vault] Draft saved locally (SQLite) for activity ${getSafeCaseLabel(caseId)}.`);
}

function removeArtifactFromSavedState(
  caseId: string,
  artifactId: string,
  historyKeys: string[],
  deletedPayload?: Record<string, any>,
): void {
  const stateRow = getDb().prepare('SELECT payload FROM case_state WHERE caseId = ?').get(caseId) as { payload: string } | undefined;
  if (!stateRow) return;

  try {
    const state = JSON.parse(decryptPayload(stateRow.payload)) as Record<string, any>;
    for (const historyKey of historyKeys) {
      if (Array.isArray(state[historyKey])) {
        state[historyKey] = state[historyKey].filter((item: any) => String(item?.id || item?.requestId || '') !== artifactId);
      }
    }
    if (state.fiscalDraftState?.linkedAnalysisId === artifactId) {
      state.fiscalDraftState = { ...state.fiscalDraftState, linkedAnalysisId: undefined };
    }
    if (deletedPayload?.generatedDoc) {
      for (const draftStateKey of ['engineeringDraftState', 'fiscalDraftState']) {
        if (state[draftStateKey]?.generatedDoc === deletedPayload.generatedDoc) {
          state[draftStateKey] = { ...state[draftStateKey], generatedDoc: '' };
        }
      }
    }
    const updatedAt = new Date().toISOString();
    getDb().prepare('UPDATE case_state SET payload = ?, updatedAt = ? WHERE caseId = ?')
      .run(encryptPayload(JSON.stringify(sanitizeForLocalCache(state))), updatedAt, caseId);
  } catch {
    // A corrupt legacy state must not prevent deletion from the authoritative tables.
  }
}

export async function deleteAnalysis(caseId: string, analysisId: string, expectedModule?: CaseModule): Promise<boolean> {
  assertCaseModule(caseId, expectedModule);
  const result = getDb().prepare('DELETE FROM analyses WHERE caseId = ? AND analysisId = ?').run(caseId, analysisId);
  if (result.changes > 0) {
    removeArtifactFromSavedState(caseId, analysisId, ['fiscalAnalysisHistory']);
    updateCaseTimestamp(caseId);
    console.info(`[Vault] Analysis deleted locally (SQLite) for activity ${getSafeCaseLabel(caseId)}.`);
  }
  return result.changes > 0;
}

export async function deleteDraft(caseId: string, draftId: string, expectedModule?: CaseModule): Promise<boolean> {
  assertCaseModule(caseId, expectedModule);
  const row = getDb().prepare('SELECT payload FROM drafts WHERE caseId = ? AND draftId = ?').get(caseId, draftId) as { payload: string } | undefined;
  let deletedPayload: Record<string, any> | undefined;
  if (row) {
    try {
      deletedPayload = JSON.parse(decryptPayload(row.payload));
    } catch {
      deletedPayload = undefined;
    }
  }
  const result = getDb().prepare('DELETE FROM drafts WHERE caseId = ? AND draftId = ?').run(caseId, draftId);
  if (result.changes > 0) {
    removeArtifactFromSavedState(caseId, draftId, ['engineeringDraftingHistory', 'fiscalDraftingHistory'], deletedPayload);
    updateCaseTimestamp(caseId);
    console.info(`[Vault] Draft deleted locally (SQLite) for activity ${getSafeCaseLabel(caseId)}.`);
  }
  return result.changes > 0;
}

export async function saveCaseState(
  caseId: string,
  stateData: Record<string, unknown>,
  expectedModule?: CaseModule,
): Promise<void> {
  assertCaseModule(caseId, expectedModule);

  const cleanData = sanitizeForLocalCache(stateData);
  const encryptedPayload = encryptPayload(JSON.stringify(cleanData));
  const updatedAt = new Date().toISOString();

  getDb().prepare(`
    INSERT INTO case_state (caseId, payload, updatedAt) VALUES (?, ?, ?)
    ON CONFLICT(caseId) DO UPDATE SET payload = excluded.payload, updatedAt = excluded.updatedAt
  `).run(caseId, encryptedPayload, updatedAt);

  updateCaseTimestamp(caseId);
}

export async function exportCase(caseId: string, expectedModule?: CaseModule): Promise<string> {
  const metadata = assertCaseModule(caseId, expectedModule);
  
  const result: VaultCase = {
    metadata,
    documents: [],
    analyses: [],
    drafts: [],
    state: null,
  };
  
  const docs = getDb().prepare('SELECT payload FROM documents WHERE caseId = ?').all(caseId) as any[];
  for (const doc of docs) {
    try {
      const dec = decryptPayload(doc.payload);
      const parsed = JSON.parse(dec);
      result.documents.push(parsed); // contains fileName, mimeType, base64
    } catch {}
  }
  
  const analyses = getDb().prepare('SELECT payload FROM analyses WHERE caseId = ?').all(caseId) as any[];
  for (const a of analyses) {
    try {
      result.analyses.push(JSON.parse(decryptPayload(a.payload)));
    } catch {}
  }

  const drafts = getDb().prepare('SELECT payload FROM drafts WHERE caseId = ?').all(caseId) as any[];
  for (const d of drafts) {
    try {
      result.drafts.push(JSON.parse(decryptPayload(d.payload)));
    } catch {}
  }

  const stateRow = getDb().prepare('SELECT payload FROM case_state WHERE caseId = ?').get(caseId) as { payload: string } | undefined;
  if (stateRow) {
    try {
      result.state = JSON.parse(decryptPayload(stateRow.payload));
    } catch {
      result.state = null;
    }
  }
  
  (result as any).exportMetadata = {
    timestamp: new Date().toISOString(),
    version: '2.0.0', // SQLite vault version
  };

  const packageString = JSON.stringify(result);
  const exportHash = crypto.createHash('sha256').update(packageString).digest('hex');
  
  (result as any).exportMetadata.packageHash = exportHash;
  return JSON.stringify(result);
}

export async function deleteCase(caseId: string, expectedModule?: CaseModule): Promise<void> {
  assertCaseModule(caseId, expectedModule);
  
  getDb().prepare('DELETE FROM cases WHERE caseId = ?').run(caseId);
  console.info(`[Vault] Local activity deleted (SQLite): ${getSafeCaseLabel(caseId)}`);
}

export async function purgeExpiredCases(nowIso = new Date().toISOString()): Promise<number> {
  const result = getDb()
    .prepare('DELETE FROM cases WHERE retentionUntil IS NOT NULL AND retentionUntil <= ?')
    .run(nowIso);
  if (result.changes > 0) {
    console.info(`[Vault] Purged ${result.changes} expired local activities.`);
  }
  return result.changes;
}

export async function deleteAllCases(): Promise<number> {
  const result = getDb().prepare('DELETE FROM cases').run();
  console.info(`[Vault] Deleted ${result.changes} local activities.`);
  return result.changes;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
