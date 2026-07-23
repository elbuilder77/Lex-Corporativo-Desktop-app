#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pipeline } from '@xenova/transformers';
import * as lancedb from '@lancedb/lancedb';
import { CORPUS_DIR, EMBEDDING_MODEL, LANCEDB_DIR, LAWS } from './legal-corpus-config.mjs';

const REPAIRS = [
  {
    lawCode: 'CFF',
    article: 'Artículo 69-B',
    content: 'Cuando la autoridad fiscal detecte que un contribuyente ha estado emitiendo comprobantes sin contar con los activos, personal, infraestructura o capacidad material, directa o indirectamente, para prestar los servicios o producir, comercializar o entregar los bienes que amparan tales comprobantes, o bien, que dichos contribuyentes se encuentren no localizados, se presumirá la inexistencia de las operaciones amparadas en tales comprobantes.',
  },
];

function escapeSqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function sourceHash(lawCode, article, content) {
  return crypto.createHash('sha256').update(`${lawCode}:${article}:${content}`).digest('hex');
}

function recordId(lawCode, article) {
  return `${lawCode}-${article}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function createEmbedding(extractor, record) {
  const textToEmbed = `${record.title}\n${record.article}\n${record.content}`.slice(0, 8000);
  const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

function ensureCorpusEntry(law, repair) {
  const corpusPath = path.join(CORPUS_DIR, law.corpus);
  const heading = `**${repair.article}.**`;
  const entry = `${heading} ${repair.content}`;

  if (!fs.existsSync(corpusPath)) {
    fs.writeFileSync(corpusPath, `# ${law.name}\n\n${entry}\n`, 'utf-8');
    return true;
  }

  const current = fs.readFileSync(corpusPath, 'utf-8');
  if (current.includes(heading)) {
    return false;
  }

  fs.writeFileSync(corpusPath, `${current.trim()}\n\n${entry}\n`, 'utf-8');
  return true;
}

async function hasExactArticle(table, repair) {
  const rows = await table
    .query()
    .where(`law_code = '${escapeSqlLiteral(repair.lawCode)}'`)
    .limit(20000)
    .toArray();

  return rows.some(row => String(row.article || '').replace(/\.$/, '') === repair.article);
}

async function main() {
  const db = await lancedb.connect(LANCEDB_DIR);
  const table = await db.openTable('legal_knowledge');
  const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL);

  for (const repair of REPAIRS) {
    const law = LAWS.find(candidate => candidate.code === repair.lawCode);
    if (!law) {
      throw new Error(`Ley no configurada: ${repair.lawCode}`);
    }

    const corpusChanged = ensureCorpusEntry(law, repair);
    const exists = await hasExactArticle(table, repair);

    if (exists) {
      console.log(`${repair.lawCode} ${repair.article}: ya existe en LanceDB.`);
      continue;
    }

    const record = {
      id: recordId(repair.lawCode, repair.article),
      law_code: repair.lawCode,
      title: law.name,
      article: repair.article,
      content: repair.content,
      module: law.module,
      jurisdiction: 'MX',
      source_url: law.url,
      source_hash: sourceHash(repair.lawCode, repair.article, repair.content),
      citation_label: `${law.name}, ${repair.article}`,
    };

    await table.add([{ ...record, vector: await createEmbedding(extractor, record) }]);
    console.log(`${repair.lawCode} ${repair.article}: ancla reparada en LanceDB${corpusChanged ? ' y corpus' : ''}.`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
