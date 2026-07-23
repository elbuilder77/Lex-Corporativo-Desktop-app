#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CORPUS_DIR } from './legal-corpus-config.mjs';
import { extractLawArticles, renderCorpusMarkdown, validateProvisions } from './official-fiscal-parser.mjs';
import { parseOfficialPdf } from './official-pdf-reader.mjs';

const args = process.argv.slice(2);
const valueArg = name => args.find(arg => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const sourceDir = path.resolve(valueArg('--source-dir') || 'tmp/pdfs');
const outputDir = path.resolve(valueArg('--output-dir') || 'tmp/mercantile-corpus-stage');
const checkedAt = valueArg('--checked-at') || new Date().toISOString().slice(0, 10);
const shouldPromote = args.includes('--promote');

const SOURCES = [
  {
    code: 'CCom', name: 'Código de Comercio', module: 'mercantil', file: 'CCom.pdf', corpus: 'codigo_comercio.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCom.pdf', repeatedHeader: 'CÓDIGO DE COMERCIO', expectedLastReform: '2025-11-14',
    policy: { minimumEntries: 1500, maximumEntries: 1700, anchors: [
      { id: '75', terms: ['actos de comercio'] }, { id: '89', terms: ['mensaje de datos'] }, { id: '1391', terms: ['procedimiento ejecutivo'] },
    ] },
  },
  {
    code: 'LGSM', name: 'Ley General de Sociedades Mercantiles', module: 'mercantil', file: 'LGSM.pdf', corpus: 'lgsm.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGSM.pdf', repeatedHeader: 'LEY GENERAL DE SOCIEDADES MERCANTILES', expectedLastReform: '2023-10-20',
    policy: { minimumEntries: 270, maximumEntries: 300, anchors: [
      { id: '1', terms: ['sociedades mercantiles'] }, { id: '87', terms: ['sociedad anónima'] }, { id: '260', terms: ['sociedad por acciones simplificada'] },
    ] },
  },
  {
    code: 'LGTOC', name: 'Ley General de Títulos y Operaciones de Crédito', module: 'mercantil', file: 'LGTOC.pdf', corpus: 'lgtoc.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGTOC.pdf', repeatedHeader: 'LEY GENERAL DE TÍTULOS Y OPERACIONES DE CRÉDITO', expectedLastReform: '2024-03-26',
    policy: { minimumEntries: 430, maximumEntries: 500, anchors: [
      { id: '5', terms: ['títulos de crédito', 'electrónicos'] }, { id: '170', terms: ['pagaré'] }, { id: '381', terms: ['fideicomiso'] },
    ] },
  },
];

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function extractLastReform(text) {
  const match = String(text || '').match(/Última Reforma(?: publicada)?\s+DOF\s+(\d{2})-(\d{2})-(\d{4})/i);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function stage(source) {
  const filePath = path.join(sourceDir, source.file);
  if (!fs.existsSync(filePath)) throw new Error(`Falta ${filePath}; descarga primero la fuente oficial.`);
  const pdf = await parseOfficialPdf(filePath, 'article');
  const extracted = extractLawArticles(pdf.pages, source);
  const validation = validateProvisions(extracted.provisions, source.policy);
  const lastReform = extractLastReform(pdf.pages[0]?.text);
  if (lastReform !== source.expectedLastReform) {
    validation.status = 'fail';
    validation.failures.push(`La fuente reporta ${lastReform || 'reforma no identificada'} y se esperaba ${source.expectedLastReform}.`);
  }
  const sourceSha256 = sha256File(filePath);
  const candidatePath = path.join(outputDir, 'candidates', source.corpus);
  fs.mkdirSync(path.dirname(candidatePath), { recursive: true });
  fs.writeFileSync(candidatePath, renderCorpusMarkdown(source, extracted.provisions, {
    checkedAt, lastReform, sourceSha256,
  }), 'utf8');
  return {
    code: source.code, name: source.name, authority: 'Cámara de Diputados del H. Congreso de la Unión', url: source.url,
    localFile: path.relative(process.cwd(), filePath).replace(/\\/g, '/'), candidateFile: path.relative(process.cwd(), candidatePath).replace(/\\/g, '/'),
    sourceSha256, candidateSha256: sha256File(candidatePath), bytes: fs.statSync(filePath).size, pages: pdf.total, checkedAt,
    lastReform, firstProvisionPage: extracted.firstProvisionPage, transitoryPage: extracted.transitoryPage,
    provisions: extracted.provisions.length, validation, promotionEligible: validation.status === 'pass',
    provisionRegistry: extracted.provisions.map(item => ({
      provisionKey: `${source.code.toLowerCase()}:${item.kind}:${item.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: item.label, sourcePages: item.sourcePages, contentSha256: item.contentSha256,
    })),
  };
}

async function main() {
  const sources = [];
  for (const source of SOURCES) {
    const result = await stage(source);
    sources.push(result);
    console.log(`${source.code}: ${result.provisions} disposiciones; validación ${result.validation.status}.`);
  }
  const registry = {
    schemaVersion: 1, checkedAt, policy: { officialPdfOnly: true, duplicateProvisionPolicy: 'block', unsupportedClaimsAllowed: false },
    sources: sources.map(({ provisionRegistry, ...source }) => source), provisions: sources.flatMap(source => source.provisionRegistry),
  };
  writeJson(path.join(outputDir, 'mercantile-source-registry.json'), registry);

  if (shouldPromote) {
    if (sources.some(source => !source.promotionEligible)) throw new Error('Promoción bloqueada por validación mercantil fallida.');
    for (const source of SOURCES) {
      fs.copyFileSync(path.join(outputDir, 'candidates', source.corpus), path.join(CORPUS_DIR, source.corpus));
    }
    writeJson(path.join(CORPUS_DIR, 'mercantile-source-registry.json'), registry);
    console.log(`Promovidos al corpus canónico: ${SOURCES.map(source => source.code).join(', ')}.`);
  }

  if (sources.some(source => source.validation.status !== 'pass')) process.exitCode = 1;
}

main().catch(error => {
  console.error(`Fatal: ${error.stack || error.message || error}`);
  process.exit(1);
});
