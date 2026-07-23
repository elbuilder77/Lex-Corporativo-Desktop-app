#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pipeline } from '@xenova/transformers';
import { PDFParse } from 'pdf-parse';
import * as lancedb from 'vectordb';
import { CORPUS_DIR, CORPUS_VERSION, EMBEDDING_MODEL, LANCEDB_DIR, LAWS } from './legal-corpus-config.mjs';

const args = new Set(process.argv.slice(2));
const offlineOnly = args.has('--offline');
const dryRun = args.has('--dry-run');
const selectedCodes = [...args]
  .filter(arg => arg.startsWith('--laws='))
  .flatMap(arg => arg.slice('--laws='.length).split(','))
  .map(code => code.trim().toUpperCase())
  .filter(Boolean);

function normalizeWhitespace(text) {
  return text
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function parseMarkdownArticles(content, law) {
  const articleRegex = /\*\*((?:Artículo|Regla)\s+.+?)\*\*\s+([\s\S]+?)(?=\n\*\*(?:Artículo|Regla)\s+|$)/g;
  const articles = [];
  let match;

  while ((match = articleRegex.exec(content)) !== null) {
    const articleNumber = match[1].trim().replace(/\s+/g, ' ').replace(/\.$/, '');
    const body = normalizeWhitespace(match[2]);
    if (!body) continue;

    articles.push(toArticleRecord(law, articleNumber, body, {
      provenance: law.corpusProvenance,
      verificationStatus: law.verificationStatus,
      lastCheckedAt: law.officialLastCheckedAt,
    }));
  }

  return dedupeArticles(articles);
}

function escapeSqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function parsePdfArticles(text, law, sourceContext = {}) {
  const cleanText = normalizeWhitespace(text)
    .replace(/^\s*\d+\s*$/gm, '')
    .replace(/Cámara de Diputados.*?\n/gi, '')
    .replace(/Secretaría General.*?\n/gi, '')
    .replace(/Última Reforma.*?\n/gi, '');

  if (law.code === 'RMF') {
    return parseRmfRules(cleanText, law, sourceContext);
  }

  const articleRegex = /(?:Art[íi]culo\s+(\d+[\s]?(?:o|º)?\.?(?:\s*[-–—]\s*[A-Z])?(?:\s*(?:Bis|Ter|Qu[aá]ter|Quinquies|Sexies|Septies|Octies|Nonies))?)\s*[\.\-–—]+)/gi;
  const matches = [...cleanText.matchAll(articleRegex)];
  const articles = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const nextMatch = matches[i + 1];
    const startIdx = match.index ?? 0;
    const endIdx = nextMatch?.index ?? cleanText.length;
    const content = normalizeWhitespace(cleanText.slice(startIdx, endIdx));
    if (content.length < 40) continue;

    const normalizedNumber = match[1]
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*[-–—]\s*/g, '-')
      .replace(/o\b|º/g, '');

    const article = `Artículo ${normalizedNumber}`;
    articles.push(toArticleRecord(law, article, content, sourceContext));
  }

  return dedupeArticles(articles);
}

function parseRmfRules(cleanText, law, sourceContext = {}) {
  const ruleRegex = /(?:^|\n)\s*(\d+(?:\.\d+){1,3}\.?)\s+([A-ZÁÉÍÓÚÑ][^\n]{8,})/g;
  const matches = [...cleanText.matchAll(ruleRegex)]
    .filter(match => !/^\d{4}\./.test(match[1]));
  const rules = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const nextMatch = matches[i + 1];
    const startIdx = match.index ?? 0;
    const endIdx = nextMatch?.index ?? cleanText.length;
    const content = normalizeWhitespace(cleanText.slice(startIdx, endIdx));
    if (content.length < 80) continue;

    const ruleNumber = match[1].trim().replace(/\.$/, '');
    rules.push(toArticleRecord(law, `Regla ${ruleNumber}`, content, sourceContext));
  }

  return dedupeArticles(rules);
}

function normalizeProvisionIdentity(article) {
  const kind = /^regla\s+/i.test(article) ? 'rule' : 'article';
  const identifier = String(article)
    .replace(/^(?:Artículo|Regla)\s+/i, '')
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

  return `${kind}:${identifier}`;
}

function dedupeArticles(articles) {
  const map = new Map();
  for (const article of articles) {
    const key = `${article.law_code}:${normalizeProvisionIdentity(article.article)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, article);
      continue;
    }

    if (existing.content_hash !== article.content_hash) {
      throw new Error(
        `Conflicto de identidad normativa ${key}: "${existing.article}" y "${article.article}" contienen textos distintos. `
        + 'La ingesta se bloqueó para evitar elegir una versión arbitraria.',
      );
    }
  }
  return [...map.values()];
}

function toArticleRecord(law, article, content, sourceContext = {}) {
  const contentHash = crypto.createHash('sha256').update(content).digest('hex');
  const sourceHash = crypto.createHash('sha256').update(`${law.code}:${article}:${content}`).digest('hex');
  const provisionKey = `${law.code.toLowerCase()}:${normalizeProvisionIdentity(article)}`;

  return {
    id: provisionKey.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    law_code: law.code,
    title: law.name,
    article,
    content,
    module: law.module,
    jurisdiction: law.jurisdiction,
    source_url: law.url,
    source_hash: sourceHash,
    source_authority: law.sourceAuthority,
    source_type: law.sourceType,
    corpus_version: CORPUS_VERSION,
    effective_from: law.effectiveFrom || '',
    effective_to: law.effectiveTo || '',
    last_checked_at: sourceContext.lastCheckedAt || '',
    provision_key: provisionKey,
    content_hash: contentHash,
    provenance: sourceContext.provenance || law.corpusProvenance,
    verification_status: sourceContext.verificationStatus || law.verificationStatus,
    citation_label: `${law.name}, ${article}`,
  };
}

async function readLawArticles(law) {
  const corpusPath = path.join(CORPUS_DIR, law.corpus);

  if (offlineOnly && fs.existsSync(corpusPath)) {
    const content = fs.readFileSync(corpusPath, 'utf-8');
    const articles = parseMarkdownArticles(content, law);
    return { source: law.corpus, articles };
  }

  if (law.url && !offlineOnly) {
    console.log(`Descargando ${law.code} desde fuente oficial...`);
    const parser = new PDFParse({ url: law.url });
    const result = await parser.getText();
    const sourceCheckedAt = new Date().toISOString();
    const articles = parsePdfArticles(result.text, law, {
      provenance: 'official_pdf_direct',
      verificationStatus: 'downloaded_from_official_source_unreconciled',
      lastCheckedAt: sourceCheckedAt,
    });
    return { source: law.url, articles };
  }

  if (fs.existsSync(corpusPath)) {
    const content = fs.readFileSync(corpusPath, 'utf-8');
    const articles = parseMarkdownArticles(content, law);
    return { source: law.corpus, articles };
  }

  if (offlineOnly || !law.url) {
    return { source: null, articles: [], skipped: true };
  }
}

async function createEmbedding(extractor, article) {
  const enrichedText = `[LEY: ${article.law_code}] [ARTICULO: ${article.article}] [ECOSISTEMA: ${article.module}]\n${article.title}\n${article.article}\n${article.content}`;
  const textToEmbed = enrichedText.slice(0, 8000);
  const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

async function main() {
  const selectedLaws = selectedCodes.length
    ? LAWS.filter(law => selectedCodes.includes(law.code.toUpperCase()))
    : LAWS;

  console.log('Lex Corporativo - ingesta local de legislación');
  console.log(`Modo: ${offlineOnly ? 'offline/corpus local' : 'corpus local + PDFs oficiales'}`);
  if (dryRun) {
    console.log('Dry-run: solo se parsean fuentes; no se generan embeddings ni se escribe LanceDB.');
  }
  console.log(`Leyes configuradas: ${selectedLaws.map(l => l.code).join(', ')}`);

  const allArticles = [];
  const skipped = [];

  for (const law of selectedLaws) {
    const { source, articles, skipped: wasSkipped } = await readLawArticles(law);
    if (wasSkipped) {
      skipped.push(law);
      console.warn(`Sin fuente disponible para ${law.code}; ley omitida.`);
      continue;
    }

    console.log(`${law.code}: ${articles.length} artículos desde ${source}`);
    allArticles.push(...articles);
  }

  if (allArticles.length === 0) {
    throw new Error('No hay artículos para ingestar. Agrega corpus markdown o ejecuta sin --offline para descargar PDFs oficiales.');
  }

  console.log(`Total de artículos por vectorizar: ${allArticles.length}`);
  if (dryRun) {
    console.log('Dry-run completado.');
    if (skipped.length) {
      console.log(`Pendientes sin corpus local: ${skipped.map(law => law.code).join(', ')}`);
    }
    return;
  }

  console.log(`Cargando modelo local de embeddings: ${EMBEDDING_MODEL}`);
  const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL);

  const data = [];
  for (let i = 0; i < allArticles.length; i++) {
    const article = allArticles[i];
    if ((i + 1) % 25 === 0 || i === 0) {
      console.log(`Embeddings ${i + 1}/${allArticles.length}`);
    }

    data.push({
      ...article,
      vector: await createEmbedding(extractor, article),
    });
  }

  if (!fs.existsSync(LANCEDB_DIR)) {
    fs.mkdirSync(LANCEDB_DIR, { recursive: true });
  }

  const db = await lancedb.connect(LANCEDB_DIR);
  const tablePath = path.join(LANCEDB_DIR, 'legal_knowledge.lance');

  if (selectedCodes.length && fs.existsSync(tablePath)) {
    const table = await db.openTable('legal_knowledge');
    const filter = selectedLaws
      .map(law => `law_code = '${escapeSqlLiteral(law.code)}'`)
      .join(' OR ');
    const originalRows = await table.filter(filter).limit(20000).execute();
    let deleted = false;

    try {
      await table.delete(filter);
      deleted = true;
      await table.add(data);

      const replacementRows = await table.countRows(filter);
      if (replacementRows !== data.length) {
        throw new Error(`Verificación posterior falló: se esperaban ${data.length} filas y quedaron ${replacementRows}.`);
      }
      console.log(`Reemplazo selectivo verificado: ${replacementRows} filas para ${selectedLaws.map(law => law.code).join(', ')}.`);
    } catch (error) {
      if (deleted) {
        try {
          await table.delete(filter);
          if (originalRows.length) await table.add(originalRows);
          console.error(`Rollback aplicado: se restauraron ${originalRows.length} filas previas.`);
        } catch (rollbackError) {
          throw new Error(`Falló el reemplazo (${error.message || error}) y también el rollback (${rollbackError.message || rollbackError}).`);
        }
      }
      throw error;
    }
  } else {
    try {
      await db.dropTable('legal_knowledge');
    } catch {
      // Table did not exist.
    }

    await db.createTable('legal_knowledge', data);
  }

  console.log('Ingesta completada.');
  console.log(`LanceDB: ${LANCEDB_DIR}`);
  console.log(`Artículos: ${data.length}`);
  if (skipped.length) {
    console.log(`Pendientes sin corpus local: ${skipped.map(law => law.code).join(', ')}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
