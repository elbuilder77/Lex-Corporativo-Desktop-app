#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import * as lancedb from '@lancedb/lancedb';
import {
  CORPUS_DIR,
  CORPUS_MANIFEST_PATH,
  EMBEDDING_MODEL,
  LANCEDB_DIR,
  LAWS,
  MANIFEST_PATH,
} from './legal-corpus-config.mjs';

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');
const strictMode = args.has('--strict');

const REQUIRED_ANCHORS = [
  { lawCode: 'CCom', article: 'Artículo 75', terms: ['actos de comercio'] },
  { lawCode: 'LGTOC', article: 'Artículo 170', terms: ['pagaré'] },
  { lawCode: 'LFT', article: 'Artículo 20', terms: ['relación de trabajo', 'contrato individual de trabajo'] },
  { lawCode: 'LCE', article: 'Artículo 15', terms: ['medidas de regulación', 'restricción no arancelarias'] },
  { lawCode: 'LA', article: 'Artículo 36', terms: ['pedimento'] },
  { lawCode: 'RGCE', article: 'Regla 1.5.1', terms: ['valor en aduana'] },
  { lawCode: 'LIGIE', article: 'Artículo 1o - Capítulo 87', terms: ['vehículos automóviles'] },
  { lawCode: 'CFF', article: 'Artículo 69-B', terms: ['inexistencia'] },
  { lawCode: 'RMF', article: 'Regla 1.1', terms: ['SAT'] },
];

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function countCorpusEntries(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf-8');
  return [...content.matchAll(/^\*\*(?:Artículo|Regla)\s+.+?\*\*/gim)].length;
}

function escapeSqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function normalizeForAudit(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.$/, '')
    .trim();
}

async function getTable() {
  if (!fs.existsSync(path.join(LANCEDB_DIR, 'legal_knowledge.lance'))) {
    return null;
  }

  const db = await lancedb.connect(LANCEDB_DIR);
  return db.openTable('legal_knowledge');
}

async function countRows(table, filter) {
  if (!table) return 0;
  try {
    return filter ? await table.countRows(filter) : await table.countRows();
  } catch (err) {
    console.warn(`No se pudo contar filas (${filter || 'total'}): ${err.message || err}`);
    return null;
  }
}

async function sampleCitation(table, lawCode) {
  if (!table) return null;
  try {
    const rows = await table
      .query()
      .where(`law_code = '${escapeSqlLiteral(lawCode)}'`)
      .limit(1)
      .toArray();
    const row = rows[0];
    return row ? `${row.law_code} ${row.article}` : null;
  } catch {
    return null;
  }
}

async function verifyAnchor(table, anchor) {
  if (!table) {
    return { ...anchor, found: false, termsPresent: false, status: 'missing_table' };
  }

  try {
    const rows = await table
      .query()
      .where(`law_code = '${escapeSqlLiteral(anchor.lawCode)}'`)
      .limit(20000)
      .toArray();
    const expectedArticle = normalizeForAudit(anchor.article);
    const row = rows.find(candidate => normalizeForAudit(candidate.article) === expectedArticle);
    const content = normalizeForAudit(row?.content || '');
    const missingTerms = anchor.terms.filter(term => !content.includes(normalizeForAudit(term)));

    return {
      ...anchor,
      found: Boolean(row),
      citation: row ? `${row.law_code} ${row.article}` : null,
      termsPresent: Boolean(row) && missingTerms.length === 0,
      missingTerms,
      status: row && missingTerms.length === 0 ? 'pass' : 'fail',
    };
  } catch (err) {
    return {
      ...anchor,
      found: false,
      termsPresent: false,
      missingTerms: anchor.terms,
      status: 'error',
      error: err.message || String(err),
    };
  }
}

function summarizeModules(laws) {
  return laws.reduce((summary, law) => {
    const current = summary[law.module] || { configuredLaws: 0, vectorRows: 0 };
    current.configuredLaws += 1;
    current.vectorRows += law.vectorRows || 0;
    summary[law.module] = current;
    return summary;
  }, {});
}

function collectGateFailures(manifest) {
  const failures = [];

  if (!manifest.table.exists) {
    failures.push('No existe la tabla legal_knowledge.lance.');
  }

  if (!manifest.summary.vectorDbComplete) {
    failures.push(`Faltan vectores para: ${manifest.summary.missingVectors.join(', ')}`);
  }

  if (!manifest.summary.offlineCorpusComplete) {
    failures.push(`Falta corpus markdown para: ${manifest.summary.missingCorpus.join(', ')}`);
  }

  if (manifest.summary.indexedLaws !== manifest.summary.configuredLaws) {
    failures.push(`Leyes indexadas incompletas: ${manifest.summary.indexedLaws}/${manifest.summary.configuredLaws}.`);
  }

  if (manifest.summary.localCorpusFiles !== manifest.summary.configuredLaws) {
    failures.push(`Corpus markdown incompleto: ${manifest.summary.localCorpusFiles}/${manifest.summary.configuredLaws}.`);
  }

  if (manifest.summary.localCorpusEntries !== manifest.table.totalRows) {
    failures.push(`Entradas markdown (${manifest.summary.localCorpusEntries}) no coinciden con vectores LanceDB (${manifest.table.totalRows}).`);
  }

  if (!manifest.summary.legalAnchorsPass) {
    const failedAnchors = manifest.anchors
      .filter(anchor => anchor.status !== 'pass')
      .map(anchor => `${anchor.lawCode} ${anchor.article}`)
      .join(', ');
    failures.push(`Anclas legales criticas fallaron: ${failedAnchors}`);
  }

  if (!manifest.governance) {
    failures.push('Falta el manifiesto canónico de gobernanza del corpus.');
  } else if (!manifest.governance.releaseGate.releaseEligible) {
    failures.push(...manifest.governance.releaseGate.failures.map(failure => `Gobernanza: ${failure}`));
  }

  for (const law of manifest.laws) {
    if (law.status !== 'ready') {
      failures.push(`${law.code}: estado ${law.status}.`);
    }

    if (law.vectorRows !== law.corpusEntries) {
      failures.push(`${law.code}: vectores (${law.vectorRows}) no coinciden con corpus (${law.corpusEntries}).`);
    }
  }

  return failures;
}

async function buildManifest() {
  const table = await getTable();
  const totalRows = await countRows(table);
  const anchors = [];

  const laws = [];
  for (const law of LAWS) {
    const corpusPath = path.join(CORPUS_DIR, law.corpus);
    const corpusExists = fs.existsSync(corpusPath);
    const corpusEntries = countCorpusEntries(corpusPath);
    const vectorRows = await countRows(table, `law_code = '${escapeSqlLiteral(law.code)}'`);

    laws.push({
      code: law.code,
      name: law.name,
      module: law.module,
      sourceUrl: law.url,
      corpusFile: law.corpus,
      corpusExists,
      corpusEntries,
      corpusSha256: corpusExists ? sha256File(corpusPath) : null,
      vectorRows,
      sampleCitation: await sampleCitation(table, law.code),
      status: vectorRows && vectorRows > 0 && corpusEntries > 0 ? 'ready' : 'incomplete',
    });
  }

  const missingVectors = laws.filter(law => !law.vectorRows).map(law => law.code);
  const missingCorpus = laws.filter(law => !law.corpusExists || law.corpusEntries === 0).map(law => law.code);

  for (const anchor of REQUIRED_ANCHORS) {
    anchors.push(await verifyAnchor(table, anchor));
  }

  let governance = null;
  if (fs.existsSync(CORPUS_MANIFEST_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(CORPUS_MANIFEST_PATH, 'utf8'));
      governance = {
        manifestPath: CORPUS_MANIFEST_PATH,
        schemaVersion: parsed.schemaVersion,
        corpusVersion: parsed.corpusVersion,
        artifactSha256: parsed.artifactSha256,
        summary: parsed.summary,
        releaseGate: parsed.releaseGate,
      };
    } catch (error) {
      governance = {
        manifestPath: CORPUS_MANIFEST_PATH,
        releaseGate: {
          releaseEligible: false,
          status: 'blocked',
          failures: [`El manifiesto canónico no es JSON válido: ${error.message || error}`],
        },
      };
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    embeddingModel: EMBEDDING_MODEL,
    lanceDbPath: LANCEDB_DIR,
    corpusPath: CORPUS_DIR,
    table: {
      name: 'legal_knowledge',
      exists: Boolean(table),
      totalRows,
    },
    summary: {
      configuredLaws: LAWS.length,
      indexedLaws: laws.filter(law => law.vectorRows && law.vectorRows > 0).length,
      localCorpusFiles: laws.filter(law => law.corpusExists && law.corpusEntries > 0).length,
      localCorpusEntries: laws.reduce((total, law) => total + law.corpusEntries, 0),
      missingVectors,
      missingCorpus,
      modules: summarizeModules(laws),
      vectorDbComplete: missingVectors.length === 0,
      offlineCorpusComplete: missingCorpus.length === 0,
      legalAnchorsPass: anchors.every(anchor => anchor.status === 'pass'),
      operationallyAvailable: Boolean(table)
        && missingVectors.length === 0
        && missingCorpus.length === 0
        && anchors.every(anchor => anchor.status === 'pass'),
      releaseEligible: Boolean(governance?.releaseGate?.releaseEligible),
    },
    governance,
    laws,
    anchors,
  };
}

const manifest = await buildManifest();
const gateFailures = collectGateFailures(manifest);
manifest.gate = {
  strict: strictMode,
  status: gateFailures.length === 0 ? 'pass' : 'fail',
  failures: gateFailures,
};

if (shouldWrite) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
  console.log(`Manifest escrito: ${MANIFEST_PATH}`);
}

console.log(JSON.stringify(manifest, null, 2));

if (strictMode && gateFailures.length > 0) {
  console.error(`Audit gate failed:\n- ${gateFailures.join('\n- ')}`);
  process.exit(1);
}
