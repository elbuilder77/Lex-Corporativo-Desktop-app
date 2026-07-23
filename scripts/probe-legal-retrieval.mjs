#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import * as lancedb from 'vectordb';
import { CORPUS_MANIFEST_PATH, LANCEDB_DIR, RETRIEVAL_PROBE_PATH } from './legal-corpus-config.mjs';

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');

const ALLOWED_LAWS = {
  mercantil: ['CCOM', 'LGSM', 'LGTOC'],
  fiscal: ['CFF', 'LISR', 'RLISR', 'LIVA', 'RLIVA', 'RMF'],
};

const PROBES = [
  {
    id: 'mercantil_actos_comercio',
    module: 'mercantil',
    query: 'actos de comercio adquisiciones enajenaciones alquileres especulacion comercial',
    expected: [{ lawCode: 'CCOM', article: 'Artículo 75' }],
  },
  {
    id: 'mercantil_pagare_lgtoc',
    module: 'mercantil',
    query: 'requisitos del pagare mencion de ser pagare beneficiario firma',
    expected: [{ lawCode: 'LGTOC', article: 'Artículo 170' }],
  },
  {
    id: 'fiscal_cff_69b',
    module: 'fiscal',
    query: 'materialidad operaciones inexistentes comprobantes 69-B inexistencia',
    expected: [{ lawCode: 'CFF', article: 'Artículo 69-B' }],
  },
  {
    id: 'fiscal_rmf_11',
    module: 'fiscal',
    query: 'presentacion documentos SAT modulos servicios tributarios regla 1.1',
    expected: [{ lawCode: 'RMF', article: 'Regla 1.1' }],
  },
  {
    id: 'fiscal_lisr_deducciones_27',
    module: 'fiscal',
    query: 'requisitos deducciones autorizadas estrictamente indispensables comprobante fiscal',
    expected: [{ lawCode: 'LISR', article: 'Artículo 27' }],
  },
  {
    id: 'fiscal_liva_acreditamiento_5',
    module: 'fiscal',
    query: 'requisitos impuesto al valor agregado acreditable acreditamiento IVA artículo 5',
    expected: [{ lawCode: 'LIVA', article: 'Artículo 5' }],
  },
  {
    id: 'fiscal_rlisr_certificados_313',
    module: 'fiscal',
    query: 'certificados bursátiles fiduciarios fideicomiso intermediario financiero retención constancia SAT',
    expected: [{ lawCode: 'RLISR', article: 'Artículo 313' }],
  },
  {
    id: 'fiscal_rliva_cantidades_acreditables_79',
    module: 'fiscal',
    query: 'cantidades acreditables comprobación valor actos actividades determinación presuntiva documentación',
    expected: [{ lawCode: 'RLIVA', article: 'Artículo 79' }],
  },
  {
    id: 'mercantil_no_fiscal_bleed',
    module: 'mercantil',
    query: '69-B operaciones inexistentes comprobantes fiscales',
    expected: [],
  },
  {
    id: 'fiscal_no_mercantil_bleed',
    module: 'fiscal',
    query: 'pagare endoso aval titulo de credito',
    expected: [],
  },
];

const BOOSTS = {
  CCOM: ['comercio', 'mercantil', 'actos', 'adquisiciones', 'enajenaciones', 'alquileres'],
  LGTOC: ['pagare', 'pagaré', 'endoso', 'aval', 'cheque', 'credito', 'crédito'],
  LGSM: ['sociedad', 'sociedades', 'asamblea', 'accion', 'acciones'],
  CFF: ['69-b', '69b', 'materialidad', 'inexistencia', 'comprobantes', 'fiscales'],
  LISR: ['deducibilidad', 'renta', 'ingresos', 'deducciones'],
  LIVA: ['iva', 'acreditamiento', 'valor', 'agregado'],
  RMF: ['rmf', 'sat', 'regla', 'servicios', 'tributarios'],
};

function escapeSqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLawCode(value) {
  const normalized = String(value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized === 'CCOM' || normalized === 'CODIGO DE COMERCIO') return 'CCOM';
  return normalized;
}

function normalizeArticle(value) {
  return normalize(value).replace(/\.$/, '');
}

function queryTerms(query) {
  return normalize(query)
    .split(' ')
    .filter(term => term.length >= 3);
}

function scoreRow(row, terms) {
  const lawCode = normalizeLawCode(row.law_code);
  const article = normalize(row.article);
  const content = normalize(`${row.title || ''} ${row.article || ''} ${row.content || ''}`);
  let score = 0;

  for (const term of terms) {
    if (content.includes(term)) score += 4;
    if (article.includes(term)) score += 3;
    if ((BOOSTS[lawCode] || []).includes(term)) score += 6;
  }

  if (lawCode === 'CCOM' && article.includes('75') && terms.includes('actos')) score += 30;
  if (lawCode === 'LGTOC' && article.includes('170') && terms.includes('pagare')) score += 30;
  if (lawCode === 'CFF' && article.includes('69-b')) score += 30;
  if (lawCode === 'RMF' && article.includes('1 1')) score += 30;
  if (lawCode === 'LISR' && article.includes('27') && terms.includes('deducciones')) score += 30;
  if (lawCode === 'LIVA' && article.includes('5') && terms.includes('acreditamiento')) score += 30;
  if (lawCode === 'RLISR' && article.includes('313') && terms.includes('certificados')) score += 30;
  if (lawCode === 'RLIVA' && article.includes('79') && terms.includes('acreditables')) score += 30;

  return score;
}

function matchesExpected(row, expected) {
  return normalizeLawCode(row.law_code) === expected.lawCode
    && normalizeArticle(row.article) === normalizeArticle(expected.article);
}

function hasForbiddenLaw(rows, module) {
  const allowed = new Set(ALLOWED_LAWS[module]);
  return rows.some(row => !allowed.has(normalizeLawCode(row.lawCode || row.law_code)));
}

async function runProbe(table, probe) {
  const rows = await table
    .filter(`module = '${escapeSqlLiteral(probe.module)}'`)
    .limit(20000)
    .execute();

  const terms = queryTerms(probe.query);
  const matches = rows
    .map(row => ({ row, score: scoreRow(row, terms) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(item => ({
      lawCode: normalizeLawCode(item.row.law_code),
      article: item.row.article,
      score: item.score,
      citation: `${item.row.law_code} ${item.row.article}`,
      excerpt: String(item.row.content || '').slice(0, 240),
    }));

  const expectedPass = probe.expected.every(expected => rows.some(row => matchesExpected(row, expected)));
  const expectedInTop = probe.expected.length === 0
    || probe.expected.every(expected => matches.some(row => row.lawCode === expected.lawCode && normalizeArticle(row.article) === normalizeArticle(expected.article)));
  const forbiddenLawFound = hasForbiddenLaw(matches, probe.module);
  const status = expectedPass && expectedInTop && !forbiddenLawFound ? 'pass' : 'fail';

  return {
    id: probe.id,
    module: probe.module,
    query: probe.query,
    expected: probe.expected,
    status,
    expectedPresentInModule: expectedPass,
    expectedInTop,
    forbiddenLawFound,
    matches,
  };
}

async function main() {
  const tablePath = path.join(LANCEDB_DIR, 'legal_knowledge.lance');
  if (!fs.existsSync(tablePath)) {
    throw new Error(`No existe legal_knowledge.lance en ${LANCEDB_DIR}`);
  }

  const db = await lancedb.connect(LANCEDB_DIR);
  const table = await db.openTable('legal_knowledge');
  const probes = [];

  for (const probe of PROBES) {
    probes.push(await runProbe(table, probe));
  }

  const failures = probes
    .filter(probe => probe.status !== 'pass')
    .map(probe => `${probe.id}: expectedInTop=${probe.expectedInTop}, forbiddenLawFound=${probe.forbiddenLawFound}`);

  let governance = null;
  if (fs.existsSync(CORPUS_MANIFEST_PATH)) {
    const manifest = JSON.parse(fs.readFileSync(CORPUS_MANIFEST_PATH, 'utf8'));
    governance = {
      corpusVersion: manifest.corpusVersion,
      releaseEligible: Boolean(manifest.releaseGate?.releaseEligible),
      releaseStatus: manifest.releaseGate?.status || 'unknown',
      pendingOfficialVerification: manifest.summary?.pendingOfficialVerification || [],
      failures: manifest.releaseGate?.failures || [],
    };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    lanceDbPath: LANCEDB_DIR,
    status: failures.length === 0 ? 'pass' : 'fail',
    scope: 'retrieval_regression_only_not_legal_release_approval',
    failures,
    governance,
    probes,
  };

  if (shouldWrite) {
    fs.mkdirSync(path.dirname(RETRIEVAL_PROBE_PATH), { recursive: true });
    fs.writeFileSync(RETRIEVAL_PROBE_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
    console.log(`Probe escrito: ${RETRIEVAL_PROBE_PATH}`);
  }

  console.log(JSON.stringify(report, null, 2));

  if (failures.length > 0) {
    console.error(`Legal retrieval probe failed:\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
