#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { CORPUS_DIR } from './legal-corpus-config.mjs';
import {
  extractLawArticles,
  consolidateRmfProvisions,
  extractRmfAmendmentProvisions,
  extractRmfAmendmentSummary,
  extractRmfRules,
  renderCorpusMarkdown,
  validateProvisions,
} from './official-fiscal-parser.mjs';

const args = process.argv.slice(2);
const valueArg = name => args.find(arg => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const sourceDir = path.resolve(valueArg('--source-dir') || 'tmp/pdfs');
const outputDir = path.resolve(valueArg('--output-dir') || 'tmp/fiscal-corpus-stage');
const checkedAt = valueArg('--checked-at') || new Date().toISOString().slice(0, 10);
const shouldPromote = args.includes('--promote');
const shouldDownload = args.includes('--download');

const SOURCES = [
  {
    code: 'CFF',
    name: 'Código Fiscal de la Federación',
    file: 'CFF.pdf',
    corpus: 'cff.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf',
    authority: 'Cámara de Diputados del H. Congreso de la Unión',
    publishedAt: null,
    lastReform: '2026-04-09',
    repeatedHeader: 'CÓDIGO FISCAL DE LA FEDERACIÓN',
    parser: 'law',
    policy: {
      minimumEntries: 220,
      maximumEntries: 450,
      anchors: [
        { id: '1', terms: ['personas físicas', 'las morales'] },
        { id: '69-B', terms: ['comprobantes fiscales', 'inexistencia'] },
      ],
    },
  },
  {
    code: 'LISR',
    name: 'Ley del Impuesto sobre la Renta',
    file: 'LISR.pdf',
    corpus: 'lisr.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf',
    authority: 'Cámara de Diputados del H. Congreso de la Unión',
    publishedAt: '2013-12-11',
    lastReform: '2024-04-01',
    repeatedHeader: 'LEY DEL IMPUESTO SOBRE LA RENTA',
    parser: 'law',
    policy: {
      minimumEntries: 215,
      maximumEntries: 245,
      anchors: [
        { id: '1', terms: ['residentes en México'] },
        { id: '27', terms: ['deducciones autorizadas'] },
        { id: '215', terms: ['personas morales', 'liquidación'] },
      ],
    },
  },
  {
    code: 'RLISR',
    name: 'Reglamento de la Ley del Impuesto sobre la Renta',
    file: 'Reg_LISR.pdf',
    corpus: 'rlisr.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LISR_060516.pdf',
    authority: 'Cámara de Diputados del H. Congreso de la Unión',
    publishedAt: '2015-10-08',
    lastReform: '2016-05-06',
    repeatedHeader: 'REGLAMENTO DE LA LEY DEL IMPUESTO SOBRE LA RENTA',
    parser: 'law',
    policy: {
      minimumEntries: 313,
      maximumEntries: 313,
      anchors: [
        { id: '1', terms: ['Ley del Impuesto sobre la Renta'] },
        { id: '313', terms: ['certificados bursátiles', 'SAT'] },
      ],
    },
  },
  {
    code: 'LIVA',
    name: 'Ley del Impuesto al Valor Agregado',
    file: 'LIVA.pdf',
    corpus: 'liva.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf',
    authority: 'Cámara de Diputados del H. Congreso de la Unión',
    publishedAt: '1978-12-29',
    lastReform: '2021-11-12',
    repeatedHeader: 'LEY DEL IMPUESTO AL VALOR AGREGADO',
    parser: 'law',
    policy: {
      minimumEntries: 55,
      maximumEntries: 79,
      anchors: [
        { id: '1', terms: ['tasa del 16%'] },
        { id: '5', terms: ['acreditable'] },
        { id: '43', terms: ['entidades federativas'] },
      ],
    },
  },
  {
    code: 'RLIVA',
    name: 'Reglamento de la Ley del Impuesto al Valor Agregado',
    file: 'Reg_LIVA.pdf',
    corpus: 'rliva.md',
    url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LIVA_250914.pdf',
    authority: 'Cámara de Diputados del H. Congreso de la Unión',
    publishedAt: '2006-12-04',
    lastReform: '2014-09-25',
    repeatedHeader: 'REGLAMENTO DE LA LEY DEL IMPUESTO AL VALOR AGREGADO',
    parser: 'law',
    policy: {
      minimumEntries: 84,
      maximumEntries: 84,
      anchors: [
        { id: '1', terms: ['acreditamiento'] },
        { id: '79', terms: ['cantidades acreditables', 'documentación'] },
      ],
    },
  },
  {
    code: 'RMF',
    name: 'Resolución Miscelánea Fiscal para 2026',
    file: 'RMF_2026.pdf',
    corpus: 'rmf.md',
    url: 'https://wwwnp.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/RMF_2026-DOF-28122025.pdf',
    authority: 'Servicio de Administración Tributaria / Diario Oficial de la Federación',
    publishedAt: '2025-12-28',
    lastReform: null,
    parser: 'rmf',
    policy: {
      minimumEntries: 900,
      maximumEntries: 1500,
      allowNumericRegressions: true,
      anchors: [
        { id: '1.1', terms: ['SAT', 'documentos'] },
        { id: '3.16.11', terms: ['factor de acumulación', 'Reglamento de la Ley del ISR'] },
      ],
    },
  },
];

const RMF_AMENDMENT = {
  code: 'RMF-2026-1RM',
  name: 'Primera Resolución de Modificaciones a la RMF para 2026',
  file: 'RMF_2026_1a_mod.pdf',
  url: 'https://wwwnp.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/1aRM_RMF2026.pdf',
  authority: 'Servicio de Administración Tributaria / Diario Oficial de la Federación',
  publishedAt: '2026-07-09',
};

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function verifyPdf(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Falta la fuente local: ${filePath}`);
  const handle = fs.openSync(filePath, 'r');
  const magic = Buffer.alloc(5);
  fs.readSync(handle, magic, 0, magic.length, 0);
  fs.closeSync(handle);
  if (magic.toString('ascii') !== '%PDF-') throw new Error(`La fuente no es un PDF válido: ${filePath}`);
}

async function ensureSourceAvailable(source) {
  const filePath = path.join(sourceDir, source.file);
  if (fs.existsSync(filePath)) return;
  if (!shouldDownload) {
    throw new Error(`Falta la fuente local: ${filePath}. Ejecuta el comando con --download para obtenerla de la URL oficial.`);
  }

  console.log(`Descargando ${source.code} desde ${source.url}...`);
  const response = await fetch(source.url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Descarga fallida para ${source.code}: HTTP ${response.status}.`);
  const data = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data);
  verifyPdf(filePath);
}

function extractLastReform(text) {
  const match = String(text || '').match(/Última Reforma(?: publicada)?\s+DOF\s+(\d{2})-(\d{2})-(\d{4})/i);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function groupTextItemsByLine(items) {
  const lines = [];
  for (const item of items.filter(candidate => 'str' in candidate)) {
    const y = item.transform?.[5] ?? 0;
    let line = lines.find(candidate => Math.abs(candidate.y - y) < 0.6);
    if (!line) {
      line = { y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }

  return lines
    .map(line => ({ ...line, items: line.items.sort((left, right) => left.transform[4] - right.transform[4]) }))
    .sort((left, right) => right.y - left.y);
}

function headingIdFromLine(line, parserKind) {
  const text = line.items.map(item => item.str).join('').replace(/\s+/g, ' ').trim();
  const match = parserKind === 'rmf'
    ? text.match(/^(\d+(?:\.\d+){1,3})\.\s+/)
    : text.match(/^Art[íi]culo\s+(\d+(?:o|º|°)?(?:(?:\.-|-)(?:BIS|TER|QU[AÁ]TER|QUINQUIES|SEXIES|SEPTIES|OCTIES|NONIES|[A-Z]))?(?:\s+(?:BIS|TER|QU[AÁ]TER|QUINQUIES|SEXIES|SEPTIES|OCTIES|NONIES))?)(?:\.\s*-|[.\-–—])/i);
  return match?.[1] || null;
}

async function extractStyledHeadings(filePath, parserKind) {
  const document = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(filePath)) }).promise;
  const headingsByPage = new Map();
  let headingFont = null;

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const lines = groupTextItemsByLine(textContent.items);

      if (!headingFont) {
        const firstHeading = lines.find(line => {
          const id = headingIdFromLine(line, parserKind);
          const firstTextItem = line.items.find(item => item.str.trim());
          const x = firstTextItem?.transform?.[4] ?? Number.POSITIVE_INFINITY;
          return id === '1' || id === '1o' || (parserKind === 'rmf' && id === '1.1' && x < 120);
        });
        headingFont = firstHeading?.items.find(item => item.str.trim())?.fontName || null;
      }

      if (!headingFont) continue;
      const pageHeadings = lines.flatMap(line => {
        const firstTextItem = line.items.find(item => item.str.trim());
        const id = headingIdFromLine(line, parserKind);
        const x = firstTextItem?.transform?.[4] ?? Number.POSITIVE_INFINITY;
        if (!id || firstTextItem?.fontName !== headingFont || x > 120) return [];
        return [{ id }];
      });
      if (pageHeadings.length) headingsByPage.set(pageNumber, pageHeadings);
    }
  } finally {
    await document.destroy();
  }

  return headingsByPage;
}

async function parsePdf(filePath, parserKind) {
  const parser = new PDFParse({ url: filePath });
  try {
    const [textResult, headingsByPage] = await Promise.all([
      parser.getText(),
      extractStyledHeadings(filePath, parserKind),
    ]);
    return {
      ...textResult,
      pages: textResult.pages.map(page => ({
        ...page,
        headings: headingsByPage.get(page.num) || [],
      })),
    };
  } finally {
    await parser.destroy();
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function stageSource(source) {
  const filePath = path.join(sourceDir, source.file);
  verifyPdf(filePath);
  const pdf = await parsePdf(filePath, source.parser);
  const extracted = source.parser === 'rmf'
    ? extractRmfRules(pdf.pages, source)
    : extractLawArticles(pdf.pages, source);
  const validation = validateProvisions(extracted.provisions, source.policy);
  const reportedLastReform = extractLastReform(pdf.pages[0]?.text);
  if (source.lastReform && reportedLastReform !== source.lastReform) {
    validation.status = 'fail';
    validation.failures.push(
      `La fuente reporta última reforma ${reportedLastReform || 'no identificada'}; el snapshot configurado espera ${source.lastReform}.`,
    );
  }
  const sourceSha256 = sha256File(filePath);
  const candidatePath = path.join(outputDir, 'candidates', source.corpus);
  fs.mkdirSync(path.dirname(candidatePath), { recursive: true });
  fs.writeFileSync(candidatePath, renderCorpusMarkdown(source, extracted.provisions, {
    checkedAt,
    lastReform: reportedLastReform || source.lastReform,
    sourceSha256,
  }), 'utf8');

  const result = {
    code: source.code,
    name: source.name,
    authority: source.authority,
    url: source.url,
    localFile: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
    candidateFile: path.relative(process.cwd(), candidatePath).replace(/\\/g, '/'),
    sourceSha256,
    bytes: fs.statSync(filePath).size,
    pages: pdf.total,
    publishedAt: source.publishedAt,
    lastReform: reportedLastReform || source.lastReform,
    checkedAt,
    firstProvisionPage: extracted.firstProvisionPage,
    transitoryPage: extracted.transitoryPage,
    provisions: extracted.provisions.length,
    candidateSha256: sha256File(candidatePath),
    validation,
    promotionEligible: validation.status === 'pass' && source.code !== 'RMF',
    promotionBlocker: source.code === 'RMF'
      ? 'La primera resolución de modificaciones debe aplicarse como parche verificable antes de declarar vigente el corpus consolidado.'
      : validation.status === 'pass' ? null : 'La extracción no superó los controles estructurales.',
    provisionRegistry: extracted.provisions.map(item => ({
      provisionKey: `${source.code.toLowerCase()}:${item.kind}:${item.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: item.label,
      sourcePages: item.sourcePages,
      contentSha256: item.contentSha256,
    })),
  };
  Object.defineProperty(result, '_extractedProvisions', { value: extracted.provisions, enumerable: false });
  return result;
}

async function stageAmendment() {
  const filePath = path.join(sourceDir, RMF_AMENDMENT.file);
  verifyPdf(filePath);
  const pdf = await parsePdf(filePath, 'amendment');
  const summary = extractRmfAmendmentSummary(pdf.pages, RMF_AMENDMENT);
  const extracted = extractRmfAmendmentProvisions(pdf.pages, RMF_AMENDMENT);
  const result = {
    ...RMF_AMENDMENT,
    localFile: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
    sourceSha256: sha256File(filePath),
    bytes: fs.statSync(filePath).size,
    pages: pdf.total,
    checkedAt,
    ...summary,
    parsedBlocks: extracted.provisions.length,
    missingProvisionIds: extracted.missingProvisionIds,
    patchExtractionStatus: extracted.status,
  };
  Object.defineProperty(result, '_extractedProvisions', { value: extracted.provisions, enumerable: false });
  return result;
}

function consolidateStagedRmf(sources, amendment) {
  const rmf = sources.find(item => item.code === 'RMF');
  if (!rmf) throw new Error('No se encontró el texto base RMF entre las fuentes preparadas.');

  const consolidated = consolidateRmfProvisions(rmf._extractedProvisions, amendment._extractedProvisions, {
    publishedAt: amendment.publishedAt,
    effectiveFrom: '2026-07-10',
    url: amendment.url,
    sourceSha256: amendment.sourceSha256,
  });
  if (consolidated.status !== 'pass') {
    throw new Error(`No fue posible consolidar la RMF: ${consolidated.failures.join(' ') || 'número de parches inesperado'}`);
  }

  const definition = SOURCES.find(item => item.code === 'RMF');
  const candidatePath = path.join(outputDir, 'candidates', definition.corpus);
  const baseSha256 = rmf.sourceSha256;
  fs.writeFileSync(candidatePath, renderCorpusMarkdown({
    ...definition,
    url: `${definition.url} + ${amendment.url}`,
  }, consolidated.provisions, {
    checkedAt,
    lastReform: amendment.publishedAt,
    sourceSha256: `${baseSha256}; amendment=${amendment.sourceSha256}`,
  }), 'utf8');

  const validation = validateProvisions(consolidated.provisions, definition.policy);
  if (validation.status !== 'pass') {
    throw new Error(`La RMF consolidada no superó validación: ${validation.failures.join(' ')}`);
  }

  Object.assign(rmf, {
    candidateSha256: sha256File(candidatePath),
    provisions: consolidated.provisions.length,
    validation,
    promotionEligible: true,
    promotionBlocker: null,
    corpusProvenance: 'official_base_with_published_amendment_overlay',
    effectiveFrom: '2026-07-10',
    amendmentCode: amendment.code,
    amendmentSourceSha256: amendment.sourceSha256,
    appliedPatches: consolidated.patches,
    provisionRegistry: consolidated.provisions.map(item => ({
      provisionKey: `rmf:${item.kind}:${item.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: item.label,
      sourcePages: item.sourcePages,
      contentSha256: item.contentSha256,
    })),
  });
  return consolidated;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const source of [...SOURCES, RMF_AMENDMENT]) await ensureSourceAvailable(source);
  const sources = [];
  for (const source of SOURCES) {
    const staged = await stageSource(source);
    sources.push(staged);
    console.log(`${source.code}: ${staged.provisions} disposiciones, validación ${staged.validation.status}.`);
  }
  const amendment = await stageAmendment();
  console.log(`${amendment.code}: ${amendment.parsedBlocks}/38 bloques modificatorios extraídos.`);
  const rmfConsolidation = consolidateStagedRmf(sources, amendment);
  console.log(`RMF: ${rmfConsolidation.patches.length} parches oficiales aplicados mediante superposición verificable.`);

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    checkedAt,
    policy: {
      canonicalOverwriteDuringStaging: false,
      duplicateProvisionPolicy: 'block',
      rmfAmendmentsMustBeAppliedDeterministically: true,
      partialAmendmentsUseAuthoritativeOverlay: true,
      unsupportedClaimsAllowed: false,
    },
    summary: {
      officialSources: sources.length + 1,
      stagedBaseSources: sources.length,
      passedStructuralValidation: sources.filter(item => item.validation.status === 'pass').map(item => item.code),
      promotionEligible: sources.filter(item => item.promotionEligible).map(item => item.code),
      blocked: sources.filter(item => !item.promotionEligible).map(item => item.code),
      totalProvisions: sources.reduce((total, item) => total + item.provisions, 0),
    },
    sources,
    amendments: [amendment],
  };

  const registry = {
    schemaVersion: 1,
    checkedAt,
    sources: sources.map(({ provisionRegistry, ...source }) => ({
      ...source,
      validation: {
        status: source.validation.status,
        failures: source.validation.failures,
        warnings: source.validation.warnings,
      },
    })),
    amendments: [amendment],
    provisions: sources.flatMap(item => item.provisionRegistry),
  };

  writeJson(path.join(outputDir, 'reconciliation.json'), report);
  writeJson(path.join(outputDir, 'fiscal-source-registry.json'), registry);

  if (shouldPromote) {
    const promotedSources = sources.filter(item => item.promotionEligible);
    for (const source of promotedSources) {
      const definition = SOURCES.find(item => item.code === source.code);
      fs.copyFileSync(path.join(outputDir, 'candidates', definition.corpus), path.join(CORPUS_DIR, definition.corpus));
    }

    writeJson(path.join(CORPUS_DIR, 'fiscal-source-registry.json'), {
      ...registry,
      canonicalPromotions: promotedSources.map(item => item.code),
      provisions: promotedSources.flatMap(item => item.provisionRegistry),
    });
    console.log(`Promovidos al corpus canónico: ${promotedSources.map(item => item.code).join(', ')}.`);
  }

  if (sources.some(item => item.validation.status !== 'pass') || amendment.status === 'directive_not_found' || amendment.patchExtractionStatus !== 'pass') {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(`Fatal: ${error.stack || error.message || error}`);
  process.exit(1);
});
