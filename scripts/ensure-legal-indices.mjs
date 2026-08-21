#!/usr/bin/env node
import * as lancedb from '@lancedb/lancedb';
import { LANCEDB_DIR } from './legal-corpus-config.mjs';
import { ensureLegalLanceIndices } from './legal-lance-indices.mjs';

async function main() {
  const db = await lancedb.connect(LANCEDB_DIR);
  const table = await db.openTable('legal_knowledge');
  const result = await ensureLegalLanceIndices(table);
  console.log(JSON.stringify({
    table: 'legal_knowledge',
    created: result.created,
    missing: result.missing,
    indices: result.indices,
    status: result.missing.length === 0 ? 'pass' : 'fail',
  }, null, 2));
  process.exit(result.missing.length === 0 ? 0 : 1);
}

main().catch(error => {
  console.error(`Fatal: ${error.stack || error.message || error}`);
  process.exit(1);
});
