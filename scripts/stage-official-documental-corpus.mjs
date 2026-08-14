#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CORPUS_DIR } from './legal-corpus-config.mjs';
import {
  cleanPageText,
  extractLawArticles,
  extractRmfRules,
  renderCorpusMarkdown,
  sha256,
  validateProvisions,
} from './official-fiscal-parser.mjs';
import { parseOfficialPdf } from './official-pdf-reader.mjs';

const args = process.argv.slice(2);
const valueArg = name => args.find(arg => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const sourceDir = path.resolve(valueArg('--source-dir') || 'tmp/pdfs');
const outputDir = path.resolve(valueArg('--output-dir') || 'tmp/documental-corpus-stage');
const checkedAt = valueArg('--checked-at') || new Date().toISOString().slice(0, 10);
const shouldPromote = args.includes('--promote');
const shouldDownload = args.includes('--download');

const SOURCES = [
  {
    code: 'LFT',
    name: 'Ley Federal del Trabajo',
    module: 'laboral',
    file: 'LFT.pdf',
    corpus: 'lft.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf',
    authority: 'Camara de Diputados del H. Congreso de la Union',
    publishedAt: '1970-04-01',
    lastReform: '2026-05-14',
    repeatedHeader: 'LEY FEDERAL DEL TRABAJO',
    parser: 'law',
    policy: {
      minimumEntries: 900,
      maximumEntries: 1300,
      anchors: [
        { id: '20', terms: ['relacion de trabajo', 'contrato individual de trabajo'] },
        { id: '25', terms: ['condiciones de trabajo'] },
        { id: '283 Quáter', terms: ['certificado de cumplimiento', 'obligaciones laborales'] },
      ],
    },
  },
  {
    code: 'LCE',
    name: 'Ley de Comercio Exterior',
    module: 'comercio_exterior',
    file: 'LCE.pdf',
    corpus: 'lce.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LCE.pdf',
    authority: 'Camara de Diputados del H. Congreso de la Union',
    publishedAt: '1993-07-27',
    lastReform: '2026-05-01',
    repeatedHeader: 'LEY DE COMERCIO EXTERIOR',
    parser: 'law',
    policy: {
      minimumEntries: 90,
      maximumEntries: 110,
      anchors: [
        { id: '1', terms: ['regular y promover', 'comercio exterior'] },
        { id: '15', terms: ['medidas de regulacion', 'restriccion no arancelarias'] },
      ],
    },
  },
  {
    code: 'RLCE',
    name: 'Reglamento de la Ley de Comercio Exterior',
    module: 'comercio_exterior',
    file: 'Reg_LCE.pdf',
    corpus: 'rlce.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LCE.pdf',
    authority: 'Camara de Diputados del H. Congreso de la Union',
    publishedAt: '1993-12-30',
    lastReform: '2014-05-22',
    repeatedHeader: 'REGLAMENTO DE LA LEY DE COMERCIO EXTERIOR',
    parser: 'law',
    policy: {
      minimumEntries: 185,
      maximumEntries: 220,
      anchors: [
        { id: '1', terms: ['Ley de Comercio Exterior'] },
        { id: '2', terms: ['Comision', 'Secretaria de Economia'] },
      ],
    },
  },
  {
    code: 'LA',
    name: 'Ley Aduanera',
    module: 'aduanal',
    file: 'LAdua.pdf',
    corpus: 'ley_aduanera.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LAdua.pdf',
    authority: 'Camara de Diputados del H. Congreso de la Union',
    publishedAt: '1995-12-15',
    lastReform: '2025-11-19',
    repeatedHeader: 'LEY ADUANERA',
    parser: 'law',
    policy: {
      minimumEntries: 200,
      maximumEntries: 275,
      anchors: [
        { id: '1', terms: ['despacho aduanero'] },
        { id: '36', terms: ['pedimento'] },
        { id: '59', terms: ['valor en aduana'] },
      ],
    },
  },
  {
    code: 'RLA',
    name: 'Reglamento de la Ley Aduanera',
    module: 'aduanal',
    file: 'Reg_LAdua.pdf',
    corpus: 'rla.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LAdua.pdf',
    authority: 'Camara de Diputados del H. Congreso de la Union',
    publishedAt: '2015-04-20',
    lastReform: '2026-02-23',
    repeatedHeader: 'REGLAMENTO DE LA LEY ADUANERA',
    parser: 'law',
    policy: {
      minimumEntries: 240,
      maximumEntries: 290,
      anchors: [
        { id: '1', terms: ['Ley Aduanera'] },
        { id: '6-B', terms: ['expediente electronico'] },
      ],
    },
  },
  {
    code: 'LIGIE',
    name: 'Ley de los Impuestos Generales de Importacion y de Exportacion',
    module: 'aduanal',
    file: 'LIGIE.pdf',
    corpus: 'ligie.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LIGIE_2022.pdf',
    authority: 'Camara de Diputados del H. Congreso de la Union',
    publishedAt: '2022-06-07',
    lastReform: '2025-12-29',
    repeatedHeader: 'LEY DE LOS IMPUESTOS GENERALES DE IMPORTACION Y DE EXPORTACION',
    parser: 'ligie',
    policy: {
      minimumEntries: 95,
      maximumEntries: 110,
      allowNumericRegressions: true,
      anchors: [
        { id: '1-Capitulo-01', terms: ['animales vivos'] },
        { id: '1-Capitulo-87', terms: ['vehiculos automoviles'] },
        { id: '2', terms: ['reglas generales'] },
      ],
    },
  },
  {
    code: 'RGCE',
    name: 'Reglas Generales de Comercio Exterior para 2026',
    module: 'aduanal',
    file: 'RGCE_2026_compilada_1ra.pdf',
    corpus: 'rgce_2026.md',
    url: 'https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/compiladas/1raRMRGCEpara2026.pdf',
    authority: 'Servicio de Administracion Tributaria',
    publishedAt: '2025-12-27',
    lastReform: '2026-05-14',
    repeatedHeader: 'REGLAS GENERALES DE COMERCIO EXTERIOR PARA 2026',
    parser: 'rule',
    policy: {
      minimumEntries: 500,
      maximumEntries: 1300,
      allowNumericRegressions: true,
      anchors: [
        { id: '1.1.1', terms: ['objeto'] },
        { id: '1.5.1', terms: ['valor en aduana'] },
        { id: '3.1.8', terms: ['pedimento'] },
      ],
    },
  },
];

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function verifyPdf(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Falta la fuente local: ${filePath}`);
  const handle = fs.openSync(filePath, 'r');
  const magic = Buffer.alloc(5);
  fs.readSync(handle, magic, 0, magic.length, 0);
  fs.closeSync(handle);
  if (magic.toString('ascii') !== '%PDF-') throw new Error(`La fuente no es un PDF valido: ${filePath}`);
}

async function ensureSourceAvailable(source) {
  const filePath = path.join(sourceDir, source.file);
  if (fs.existsSync(filePath)) {
    verifyPdf(filePath);
    return;
  }
  if (!shouldDownload) {
    throw new Error(`Falta la fuente local: ${filePath}. Ejecuta con --download para obtenerla de la URL oficial.`);
  }

  console.log(`Descargando ${source.code} desde ${source.url}...`);
  const response = await fetch(source.url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Descarga fallida para ${source.code}: HTTP ${response.status}.`);
  const data = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data);
  verifyPdf(filePath);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function extractLastReform(text) {
  const match = String(text || '').match(/Ultima Reforma(?: publicada)?\s+DOF\s+(\d{2})-(\d{2})-(\d{4})/i)
    || String(text || '').match(/Última Reforma(?: publicada)?\s+DOF\s+(\d{2})-(\d{2})-(\d{4})/i);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function normalizeForTermMatching(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBody(value) {
  return String(value || '')
    .replace(/\[\[PAGE:\d+]]/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function titleCaseArticleSuffix(rawSuffix) {
  const normalized = String(rawSuffix || '').toLowerCase();
  if (normalized === 'quater') return 'Quáter';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function repairSplitSuffixArticles(provisions) {
  return provisions.map(provision => {
    if (provision.kind !== 'article' || !/^\d+$/.test(String(provision.id))) return provision;

    const match = provision.content.match(/^(Bis|Ter|Qu[aá]ter|Quinquies|Sexies|Septies|Octies|Nonies|[A-ZÑ])\.-\s*/iu);
    if (!match) return provision;

    const rawSuffix = match[1];
    const suffix = rawSuffix.length === 1
      ? rawSuffix.toUpperCase()
      : titleCaseArticleSuffix(rawSuffix);
    const id = rawSuffix.length === 1 ? `${provision.id}-${suffix}` : `${provision.id} ${suffix}`;
    const content = provision.content.slice(match[0].length).trim();

    return {
      ...provision,
      id,
      label: `Artículo ${id}`,
      content,
      contentSha256: sha256(content),
    };
  });
}

function slugProvisionId(value) {
  return String(value || '')
    .replace(/ñ/g, 'enie')
    .replace(/Ñ/g, 'enie')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sanitizePages(pdf, source) {
  return pdf.pages.map(page => {
    let text = page.text;
    if (source.code === 'RGCE') {
      text = text
        .split('\n')
        .filter(line => {
          const compact = line.replace(/\s+/g, ' ').trim();
          return compact
            && !/^NOTA: Este documento constituye/i.test(compact)
            && !/^de dar a conocer el texto actualizado/i.test(compact)
            && !/^de los Derechos del Contribuyente/i.test(compact)
            && !/^la Federaci[oó]n\.$/i.test(compact)
            && !/^P[aá]gina\s+\d+\s+de\s+\d+$/i.test(compact);
        })
        .join('\n');
    }

    return {
      ...page,
      text,
    };
  });
}

function pageForOffset(ranges, offset) {
  const range = ranges.find(item => offset >= item.start && offset <= item.end);
  if (range) return range.page;
  const previous = [...ranges].reverse().find(item => offset >= item.end);
  return previous?.page ?? ranges[0]?.page ?? null;
}

function extractLigieProvisions(pages, source) {
  const cleanedPages = pages.map(page => ({
    num: page.num,
    text: cleanPageText(page.text, source),
  }));
  let text = '';
  const ranges = [];

  for (const page of cleanedPages) {
    const marker = `\n[[PAGE:${page.num}]]\n`;
    text += marker;
    const start = text.length;
    text += page.text;
    ranges.push({ page: page.num, start, end: text.length });
  }

  const article1 = text.search(/^\s*Art[íi]culo\s+1(?:o|º|°)?[.\-–—]/imu);
  const article2 = text.search(/^\s*Art[íi]culo\s+2(?:o|º|°)?[.\-–—]/imu);
  const transitory = text.search(/^\s*TRANSITORIOS\s*:?\s*$/imu);
  const tariffStart = text.search(/^\s*TARIFA\s*$/imu);
  const tariffEnd = article2 > tariffStart ? article2 : (transitory > tariffStart ? transitory : text.length);
  const sliceStart = tariffStart >= 0 ? tariffStart : article1;
  const tariffText = sliceStart >= 0 ? text.slice(sliceStart, tariffEnd) : '';

  const chapterMatches = [...tariffText.matchAll(/^\s*Cap[íi]tulo\s+(\d{2})\s*$/gimu)];
  const provisions = [];

  for (let index = 0; index < chapterMatches.length; index += 1) {
    const match = chapterMatches[index];
    const start = sliceStart + (match.index ?? 0);
    const bodyStart = start + match[0].length;
    const end = sliceStart + (chapterMatches[index + 1]?.index ?? tariffText.length);
    const body = normalizeBody(text.slice(bodyStart, end));
    if (!body || body.length < 80) continue;
    const id = `1-Capitulo-${match[1]}`;
    const startPage = pageForOffset(ranges, start);
    const endPage = pageForOffset(ranges, Math.max(bodyStart, end - 1));
    provisions.push({
      kind: 'article',
      id,
      label: `Artículo 1o - Capítulo ${match[1]}`,
      content: body,
      contentSha256: sha256(body),
      sourcePages: startPage === endPage ? [startPage] : [startPage, endPage],
    });
  }

  const legalArticles = repairSplitSuffixArticles(extractLawArticles(pages, source).provisions)
    .filter(provision => normalizeForTermMatching(provision.id) !== '1');

  return {
    firstProvisionPage: pageForOffset(ranges, article1 >= 0 ? article1 : sliceStart),
    transitoryPage: transitory >= 0 ? pageForOffset(ranges, transitory) : null,
    provisions: [...provisions, ...legalArticles],
  };
}

function extractSourceProvisions(pdf, source) {
  const pages = sanitizePages(pdf, source);
  if (source.parser === 'rule') return extractRmfRules(pages, source);
  if (source.parser === 'ligie') return extractLigieProvisions(pages, source);
  const extracted = extractLawArticles(pages, source);
  return {
    ...extracted,
    provisions: repairSplitSuffixArticles(extracted.provisions),
  };
}

function validateSource(source, extracted, reportedLastReform) {
  const validation = validateProvisions(extracted.provisions, source.policy);
  if (source.lastReform && reportedLastReform !== source.lastReform) {
    validation.status = 'fail';
    validation.failures.push(
      `La fuente reporta ultima reforma ${reportedLastReform || 'no identificada'}; el snapshot espera ${source.lastReform}.`,
    );
  }
  return validation;
}

async function stage(source) {
  const filePath = path.join(sourceDir, source.file);
  verifyPdf(filePath);
  const pdf = await parseOfficialPdf(filePath, source.parser === 'rule' ? 'rule' : 'article');
  const extracted = extractSourceProvisions(pdf, source);
  const reportedLastReform = extractLastReform(pdf.pages[0]?.text) || source.lastReform;
  const validation = validateSource(source, extracted, reportedLastReform);
  const sourceSha256 = sha256File(filePath);
  const candidatePath = path.join(outputDir, 'candidates', source.corpus);
  fs.mkdirSync(path.dirname(candidatePath), { recursive: true });
  fs.writeFileSync(candidatePath, renderCorpusMarkdown(source, extracted.provisions, {
    checkedAt,
    lastReform: reportedLastReform,
    sourceSha256,
  }), 'utf8');

  return {
    code: source.code,
    name: source.name,
    module: source.module,
    authority: source.authority,
    url: source.url,
    localFile: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
    candidateFile: path.relative(process.cwd(), candidatePath).replace(/\\/g, '/'),
    sourceSha256,
    candidateSha256: sha256File(candidatePath),
    bytes: fs.statSync(filePath).size,
    pages: pdf.total,
    publishedAt: source.publishedAt,
    lastReform: reportedLastReform,
    checkedAt,
    firstProvisionPage: extracted.firstProvisionPage,
    transitoryPage: extracted.transitoryPage,
    provisions: extracted.provisions.length,
    validation,
    promotionEligible: validation.status === 'pass',
    provisionRegistry: extracted.provisions.map(item => ({
      provisionKey: `${source.code.toLowerCase()}:${item.kind}:${slugProvisionId(item.id)}`,
      label: item.label,
      sourcePages: item.sourcePages,
      contentSha256: item.contentSha256,
    })),
  };
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const source of SOURCES) await ensureSourceAvailable(source);

  const sources = [];
  for (const source of SOURCES) {
    const result = await stage(source);
    sources.push(result);
    console.log(`${source.code}: ${result.provisions} disposiciones; validacion ${result.validation.status}.`);
  }

  const registry = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    checkedAt,
    policy: {
      officialPdfOnly: true,
      duplicateProvisionPolicy: 'block',
      unsupportedClaimsAllowed: false,
      ligieTariffChunking: 'chapter_under_article_1',
    },
    sources: sources.map(({ provisionRegistry, ...source }) => source),
    provisions: sources.flatMap(source => source.provisionRegistry),
  };
  writeJson(path.join(outputDir, 'documental-source-registry.json'), registry);

  if (shouldPromote) {
    if (sources.some(source => !source.promotionEligible)) {
      throw new Error('Promocion bloqueada por validacion documental fallida.');
    }
    for (const source of SOURCES) {
      fs.copyFileSync(path.join(outputDir, 'candidates', source.corpus), path.join(CORPUS_DIR, source.corpus));
    }
    writeJson(path.join(CORPUS_DIR, 'documental-source-registry.json'), registry);
    console.log(`Promovidos al corpus canonico: ${SOURCES.map(source => source.code).join(', ')}.`);
  }

  if (sources.some(source => source.validation.status !== 'pass')) process.exitCode = 1;
}

main().catch(error => {
  console.error(`Fatal: ${error.stack || error.message || error}`);
  process.exit(1);
});
