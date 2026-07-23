#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  CORPUS_DIR,
  CORPUS_MANIFEST_PATH,
  CORPUS_SCHEMA_VERSION,
  CORPUS_VERSION,
  EMBEDDING_MODEL,
  LANCEDB_DIR,
  LAWS,
} from './legal-corpus-config.mjs';

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');
const shouldCheck = args.has('--check');
const strictMode = args.has('--strict');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function normalizeProvisionIdentifier(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[–—]/g, '-')
    .replace(/(\d)\s*(?:o|º|°)\.?/g, '$1')
    .replace(/\s*-\s*/g, '-')
    .replace(/[.,;:]+$/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

}

function normalizeBody(value) {
  return String(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseCorpusEntries(content, lawCode) {
  const headerRegex = /^\*\*((Artículo|Regla)\s+(.+?))\*\*/gim;
  const headers = [...content.matchAll(headerRegex)];
  const entries = [];
  let currentLine = 1;
  let previousIndex = 0;

  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    const start = header.index ?? 0;
    currentLine += (content.slice(previousIndex, start).match(/\n/g) || []).length;
    previousIndex = start;

    const end = headers[index + 1]?.index ?? content.length;
    const kind = header[2].toLowerCase() === 'regla' ? 'rule' : 'article';
    const identifier = normalizeProvisionIdentifier(header[3]);
    const body = normalizeBody(content.slice(start + header[0].length, end));

    entries.push({
      provisionKey: `${lawCode.toLowerCase()}:${kind}:${identifier}`,
      label: header[1].trim(),
      line: currentLine,
      contentSha256: sha256(body),
      contentLength: body.length,
    });
  }

  return entries;
}

function findDuplicateProvisions(entries) {
  const byKey = new Map();
  for (const entry of entries) {
    const group = byKey.get(entry.provisionKey) || [];
    group.push(entry);
    byKey.set(entry.provisionKey, group);
  }

  return [...byKey.entries()]
    .filter(([, group]) => group.length > 1)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([provisionKey, group]) => ({
      provisionKey,
      occurrences: group.length,
      conflictingContent: new Set(group.map(item => item.contentSha256)).size > 1,
      entries: group.map(({ label, line, contentSha256, contentLength }) => ({
        label,
        line,
        contentSha256,
        contentLength,
      })),
    }));
}

function countExtractionArtifacts(content) {
  const pageMarkers = [...content.matchAll(/--\s*\d+\s+of\s+\d+\s*--/gi)].length;
  const replacementCharacters = [...content.matchAll(/\uFFFD/g)].length;
  return { pageMarkers, replacementCharacters, total: pageMarkers + replacementCharacters };
}

function listFilesRecursively(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(absolutePath));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function hashDirectory(directory) {
  const files = listFilesRecursively(directory);
  const records = files.map(filePath => ({
    path: path.relative(directory, filePath).replace(/\\/g, '/'),
    bytes: fs.statSync(filePath).size,
    sha256: sha256File(filePath),
  }));
  const digestInput = records.map(record => `${record.path}\0${record.bytes}\0${record.sha256}\n`).join('');

  return {
    exists: fs.existsSync(directory),
    fileCount: records.length,
    totalBytes: records.reduce((total, record) => total + record.bytes, 0),
    sha256: records.length ? sha256(digestInput) : null,
  };
}

function buildManifest() {
  const laws = LAWS.map(law => {
    const filePath = path.join(CORPUS_DIR, law.corpus);
    const exists = fs.existsSync(filePath);
    const content = exists ? fs.readFileSync(filePath, 'utf8') : '';
    const entries = exists ? parseCorpusEntries(content, law.code) : [];
    const duplicates = findDuplicateProvisions(entries);
    const artifacts = countExtractionArtifacts(content);

    return {
      code: law.code,
      name: law.name,
      module: law.module,
      jurisdiction: law.jurisdiction,
      corpusFile: law.corpus,
      source: {
        authority: law.sourceAuthority,
        type: law.sourceType,
        url: law.url,
        provenance: law.corpusProvenance,
        verificationStatus: law.verificationStatus,
        effectiveFrom: law.effectiveFrom,
        effectiveTo: law.effectiveTo,
        officialLastCheckedAt: law.officialLastCheckedAt,
      },
      file: {
        exists,
        bytes: exists ? fs.statSync(filePath).size : 0,
        sha256: exists ? sha256File(filePath) : null,
      },
      structure: {
        entries: entries.length,
        uniqueProvisionKeys: new Set(entries.map(entry => entry.provisionKey)).size,
        duplicateProvisionKeys: duplicates.length,
        duplicateRows: duplicates.reduce((total, item) => total + item.occurrences - 1, 0),
        conflictingDuplicateKeys: duplicates.filter(item => item.conflictingContent).length,
        extractionArtifacts: artifacts,
        duplicates,
      },
    };
  });

  const missingFiles = laws.filter(law => !law.file.exists).map(law => law.code);
  const duplicateRows = laws.reduce((total, law) => total + law.structure.duplicateRows, 0);
  const duplicateProvisionKeys = laws.reduce((total, law) => total + law.structure.duplicateProvisionKeys, 0);
  const conflictingDuplicateKeys = laws.reduce((total, law) => total + law.structure.conflictingDuplicateKeys, 0);
  const extractionArtifacts = laws.reduce((total, law) => total + law.structure.extractionArtifacts.total, 0);
  const pendingOfficialVerification = laws
    .filter(law => law.source.verificationStatus !== 'verified_against_official_source')
    .map(law => law.code);
  const circularProvenance = laws
    .filter(law => law.source.provenance === 'reconstructed_from_lancedb')
    .map(law => law.code);
  const failures = [];

  if (missingFiles.length) failures.push(`Faltan archivos de corpus: ${missingFiles.join(', ')}.`);
  if (duplicateRows) failures.push(`Existen ${duplicateRows} filas duplicadas en ${duplicateProvisionKeys} identificadores normalizados.`);
  if (conflictingDuplicateKeys) failures.push(`${conflictingDuplicateKeys} identificadores duplicados contienen textos distintos.`);
  if (extractionArtifacts) failures.push(`Se detectaron ${extractionArtifacts} artefactos de extracción.`);
  if (pendingOfficialVerification.length) failures.push(`Falta conciliación con fuente oficial para: ${pendingOfficialVerification.join(', ')}.`);
  if (circularProvenance.length) failures.push(`El corpus fue reconstruido desde LanceDB para: ${circularProvenance.join(', ')}.`);

  const manifest = {
    schemaVersion: CORPUS_SCHEMA_VERSION,
    corpusVersion: CORPUS_VERSION,
    jurisdiction: 'MX-FED',
    embeddingModel: EMBEDDING_MODEL,
    policy: {
      unsupportedClaimsAllowed: false,
      duplicateProvisionPolicy: 'block_on_conflict',
      officialVerificationRequired: true,
      unknownDatesMustRemainNull: true,
    },
    summary: {
      configuredLaws: laws.length,
      corpusEntries: laws.reduce((total, law) => total + law.structure.entries, 0),
      uniqueProvisionKeys: laws.reduce((total, law) => total + law.structure.uniqueProvisionKeys, 0),
      duplicateProvisionKeys,
      duplicateRows,
      conflictingDuplicateKeys,
      extractionArtifacts,
      pendingOfficialVerification,
    },
    vectorStore: {
      engine: 'LanceDB',
      table: 'legal_knowledge',
      ...hashDirectory(LANCEDB_DIR),
    },
    laws,
    releaseGate: {
      releaseEligible: failures.length === 0,
      status: failures.length === 0 ? 'pass' : 'blocked',
      failures,
    },
  };

  return {
    ...manifest,
    artifactSha256: sha256(`${JSON.stringify(manifest)}\n`),
  };
}

const manifest = buildManifest();
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (shouldWrite) {
  fs.mkdirSync(path.dirname(CORPUS_MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(CORPUS_MANIFEST_PATH, serialized, 'utf8');
}

let checkFailed = false;
if (shouldCheck) {
  if (!fs.existsSync(CORPUS_MANIFEST_PATH)) {
    console.error(`Falta el manifiesto canónico: ${CORPUS_MANIFEST_PATH}`);
    checkFailed = true;
  } else if (fs.readFileSync(CORPUS_MANIFEST_PATH, 'utf8') !== serialized) {
    console.error('El manifiesto canónico no coincide con el corpus o LanceDB actuales. Ejecuta npm run manifest:legal-corpus.');
    checkFailed = true;
  }
}

console.log(JSON.stringify({
  corpusVersion: manifest.corpusVersion,
  configuredLaws: manifest.summary.configuredLaws,
  corpusEntries: manifest.summary.corpusEntries,
  duplicateProvisionKeys: manifest.summary.duplicateProvisionKeys,
  duplicateRows: manifest.summary.duplicateRows,
  conflictingDuplicateKeys: manifest.summary.conflictingDuplicateKeys,
  extractionArtifacts: manifest.summary.extractionArtifacts,
  releaseGate: manifest.releaseGate.status,
  manifest: CORPUS_MANIFEST_PATH,
}, null, 2));

for (const failure of manifest.releaseGate.failures) {
  console.warn(`- ${failure}`);
}

if (checkFailed || (strictMode && !manifest.releaseGate.releaseEligible)) {
  process.exitCode = 1;
}
