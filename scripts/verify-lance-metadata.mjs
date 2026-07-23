#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import * as lancedb from 'vectordb';
import { CORPUS_DIR, CORPUS_VERSION, LANCEDB_DIR, LAWS } from './legal-corpus-config.mjs';

const shouldWrite = process.argv.includes('--write');
const reportPath = path.resolve('reports/audits/lance_metadata_audit.json');
const requiredFields = [
  'provision_key', 'content_hash', 'source_authority', 'source_type', 'source_url',
  'corpus_version', 'provenance', 'verification_status', 'citation_label', 'last_checked_at',
];

function countCorpusEntries(corpusPath) {
  const content = fs.readFileSync(corpusPath, 'utf8');
  return [...content.matchAll(/^\*\*(?:Artículo|Regla)\s+.+?\*\*/gmu)].length;
}

async function main() {
  const db = await lancedb.connect(LANCEDB_DIR);
  const table = await db.openTable('legal_knowledge');
  const rows = await table.filter('id IS NOT NULL').limit(20000).execute();
  const failures = [];
  const laws = [];
  const provisionKeys = new Set();

  for (const law of LAWS) {
    const lawRows = rows.filter(row => row.law_code === law.code);
    const expectedRows = countCorpusEntries(path.join(CORPUS_DIR, law.corpus));
    const missingMetadata = Object.fromEntries(requiredFields.map(field => [
      field,
      lawRows.filter(row => row[field] === null || row[field] === undefined || String(row[field]).trim() === '').length,
    ]));
    const metadataMismatches = lawRows.filter(row => (
      row.module !== law.module
      || row.corpus_version !== CORPUS_VERSION
      || row.provenance !== law.corpusProvenance
      || row.verification_status !== law.verificationStatus
    )).length;
    const invalidVectors = lawRows.filter(row => !Array.isArray(row.vector) || row.vector.length !== 384).length;
    if (lawRows.length !== expectedRows) failures.push(`${law.code}: ${lawRows.length} filas; se esperaban ${expectedRows}.`);
    if (Object.values(missingMetadata).some(Boolean)) failures.push(`${law.code}: hay metadatos obligatorios vacíos.`);
    if (metadataMismatches) failures.push(`${law.code}: ${metadataMismatches} filas no coinciden con la configuración canónica.`);
    if (invalidVectors) failures.push(`${law.code}: ${invalidVectors} vectores no tienen 384 dimensiones.`);
    laws.push({ code: law.code, expectedRows, vectorRows: lawRows.length, missingMetadata, metadataMismatches, invalidVectors });
  }

  for (const row of rows) {
    if (provisionKeys.has(row.provision_key)) failures.push(`Clave normativa duplicada: ${row.provision_key}.`);
    provisionKeys.add(row.provision_key);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    corpusVersion: CORPUS_VERSION,
    table: 'legal_knowledge',
    totalRows: rows.length,
    uniqueProvisionKeys: provisionKeys.size,
    laws,
    status: failures.length === 0 ? 'pass' : 'fail',
    failures,
  };
  if (shouldWrite) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch(error => {
  console.error(`Fatal: ${error.stack || error.message || error}`);
  process.exit(1);
});
