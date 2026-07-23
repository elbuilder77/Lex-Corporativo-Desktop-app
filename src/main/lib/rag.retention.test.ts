import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as lancedb from 'vectordb';

const ragRoot = path.join(process.cwd(), '.tmp-rag-retention-test');

vi.mock('electron', () => ({
  app: {
    getPath: () => ragRoot,
    getAppPath: () => process.cwd(),
    isPackaged: false,
  },
}));

describe('temporary LanceDB document retention', () => {
  beforeEach(() => {
    fs.rmSync(ragRoot, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(ragRoot, { recursive: true, force: true });
  });

  it('purges only chunks older than the configured TTL', async () => {
    const dbPath = path.join(ragRoot, 'lance_data');
    fs.mkdirSync(dbPath, { recursive: true });
    const db = await lancedb.connect(dbPath);
    await db.createTable('user_documents', [
      {
        id: 'old',
        requestId: 'request-old',
        indexedAt: '2026-07-12T00:00:00.000Z',
        content: 'fragmento vencido',
        vector: [0.1, 0.2],
      },
      {
        id: 'fresh',
        requestId: 'request-fresh',
        indexedAt: '2026-07-14T00:00:00.000Z',
        content: 'fragmento vigente',
        vector: [0.2, 0.1],
      },
    ]);

    const { cleanupUserDocumentRequest, purgeExpiredUserDocuments, USER_DOCUMENT_TTL_MS } = await import('./rag');
    const deleted = await purgeExpiredUserDocuments(USER_DOCUMENT_TTL_MS, Date.parse('2026-07-14T12:00:00.000Z'));
    const verificationDb = await lancedb.connect(dbPath);
    const table = await verificationDb.openTable('user_documents');
    const remaining = await table.filter('id IS NOT NULL').limit(10).execute();

    expect(remaining.map(row => row.id)).toEqual(['fresh']);
    expect(deleted).toBe(1);

    await cleanupUserDocumentRequest('request-fresh');
    const cleanupDb = await lancedb.connect(dbPath);
    const cleanedTable = await cleanupDb.openTable('user_documents');
    expect(await cleanedTable.countRows()).toBe(0);
  });

  it('rejects invalid retention periods', async () => {
    const { purgeExpiredUserDocuments } = await import('./rag');
    await expect(purgeExpiredUserDocuments(0)).rejects.toThrow(/mayor a cero/);
  });
});
