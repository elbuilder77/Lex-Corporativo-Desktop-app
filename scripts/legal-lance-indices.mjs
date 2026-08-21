import * as lancedb from '@lancedb/lancedb';

export const REQUIRED_LEGAL_INDEX_COLUMNS = ['law_code', 'article', 'provision_key', 'content'];

function indexConfig(column) {
  if (column === 'law_code') return lancedb.Index.bitmap();
  if (column === 'article' || column === 'provision_key') return lancedb.Index.btree();
  return lancedb.Index.fts({
    baseTokenizer: 'simple',
    language: 'Spanish',
    lowercase: true,
    stem: true,
    removeStopWords: true,
    asciiFolding: true,
    withPosition: true,
  });
}

export async function ensureLegalLanceIndices(table, { replace = false } = {}) {
  const before = await table.listIndices();
  const indexedColumns = new Set(before.flatMap(index => index.columns));
  const created = [];

  for (const column of REQUIRED_LEGAL_INDEX_COLUMNS) {
    if (!replace && indexedColumns.has(column)) continue;
    await table.createIndex(column, {
      config: indexConfig(column),
      replace,
    });
    created.push(column);
  }

  const indices = await table.listIndices();
  const activeColumns = new Set(indices.flatMap(index => index.columns));
  const missing = REQUIRED_LEGAL_INDEX_COLUMNS.filter(column => !activeColumns.has(column));
  return { created, missing, indices };
}
