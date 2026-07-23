#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import * as lancedb from '@lancedb/lancedb';
import { CORPUS_DIR, LANCEDB_DIR, LAWS } from './legal-corpus-config.mjs';

const args = new Set(process.argv.slice(2));
const overwrite = args.has('--overwrite');
const selectedCodes = [...args]
  .filter(arg => arg.startsWith('--laws='))
  .flatMap(arg => arg.slice('--laws='.length).split(','))
  .map(code => code.trim().toUpperCase())
  .filter(Boolean);

function escapeSqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function normalizeContent(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatHeading(article) {
  const value = String(article || '').trim().replace(/\s+/g, ' ');
  return value.endsWith('.') ? value : `${value}.`;
}

function articleSortKey(row) {
  const value = String(row.article || '');
  const numeric = value.match(/\d+(?:\.\d+)*/)?.[0] || '999999';
  const parts = numeric.split('.').map(part => Number(part) || 0);
  const suffix = value.toLowerCase();

  return {
    parts,
    suffix,
  };
}

function compareArticles(a, b) {
  const left = articleSortKey(a);
  const right = articleSortKey(b);
  const length = Math.max(left.parts.length, right.parts.length);

  for (let i = 0; i < length; i++) {
    const diff = (left.parts[i] || 0) - (right.parts[i] || 0);
    if (diff !== 0) return diff;
  }

  return left.suffix.localeCompare(right.suffix, 'es');
}

function buildMarkdown(law, rows) {
  const entries = rows
    .sort(compareArticles)
    .map(row => `**${formatHeading(row.article)}** ${normalizeContent(row.content)}`)
    .join('\n\n');

  return [
    `# ${law.name}`,
    '',
    `> Código: ${law.code}`,
    `> Módulo: ${law.module}`,
    `> Fuente: ${law.url}`,
    '> Generado desde src-rust/lance_data/legal_knowledge.lance para reconstrucción offline.',
    '',
    entries,
    '',
  ].join('\n');
}

async function main() {
  const tablePath = path.join(LANCEDB_DIR, 'legal_knowledge.lance');
  if (!fs.existsSync(tablePath)) {
    throw new Error(`No existe legal_knowledge.lance en ${LANCEDB_DIR}`);
  }

  const db = await lancedb.connect(LANCEDB_DIR);
  const table = await db.openTable('legal_knowledge');
  const selectedLaws = selectedCodes.length
    ? LAWS.filter(law => selectedCodes.includes(law.code.toUpperCase()))
    : LAWS;

  fs.mkdirSync(CORPUS_DIR, { recursive: true });

  for (const law of selectedLaws) {
    const outputPath = path.join(CORPUS_DIR, law.corpus);
    if (fs.existsSync(outputPath) && !overwrite) {
      console.log(`${law.code}: existe ${law.corpus}; use --overwrite para regenerar.`);
      continue;
    }

    const rows = await table
      .query()
      .where(`law_code = '${escapeSqlLiteral(law.code)}'`)
      .limit(20000)
      .toArray();

    if (rows.length === 0) {
      console.warn(`${law.code}: sin filas en LanceDB; no se generó corpus.`);
      continue;
    }

    fs.writeFileSync(outputPath, buildMarkdown(law, rows), 'utf-8');
    console.log(`${law.code}: ${rows.length} entradas exportadas a ${outputPath}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
