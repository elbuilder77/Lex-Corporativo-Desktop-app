import crypto from 'crypto';

const ARTICLE_SUFFIX_WORDS = 'BIS|TER|QU[AÁ]TER|QUINQUIES|SEXIES|SEPTIES|OCTIES|NONIES';
const ARTICLE_HEADER_SOURCE = String.raw`^\s*Art[íi]culo\s+(\d+(?:o|º|°)?(?:(?:\.-|-)(?:${ARTICLE_SUFFIX_WORDS}|[A-Z]))?(?:\s+(?:${ARTICLE_SUFFIX_WORDS}))?)\s*(?:\.\s*-\s*|[.\-–—])?\s*`;
const RULE_HEADER_SOURCE = String.raw`^\s*(\d+(?:\.\d+){1,3})\.\s+(?=\S)`;

function regexFrom(source) {
  return new RegExp(source, 'gimu');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function normalizeForComparison(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeProvisionId(value, kind) {
  const normalized = String(value)
    .normalize('NFC')
    .trim()
    .replace(/[–—]/g, '-')
    .replace(/(\d)\s*(?:o|º|°)\.?/gi, '$1')
    .replace(/\.\s*-\s*/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/g, '');

  if (kind === 'rule') return normalized;

  return normalized.replace(/\b(bis|ter|qu[aá]ter|quinquies|sexies|septies|octies|nonies)\b/gi, word => (
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ));
}

function isBoilerplateLine(line, source) {
  const compact = line.replace(/\s+/g, ' ').trim();
  if (!compact) return false;

  const patterns = [
    /^--\s*\d+\s+of\s+\d+\s*--$/i,
    /^\d+\s+de\s+\d+$/i,
    /C[ÁA]MARA DE DIPUTADOS DEL H\. CONGRESO DE LA UNI[ÓO]N/i,
    /^Secretar[íi]a General$/i,
    /^Secretar[íi]a de Servicios Parlamentarios$/i,
    /^Última Reforma DOF\s+/i,
    /^DIARIO OFICIAL\s+/i,
    /\s+DIARIO OFICIAL$/i,
  ];

  if (patterns.some(pattern => pattern.test(compact))) return true;
  return Boolean(source?.repeatedHeader && compact.toUpperCase() === source.repeatedHeader.toUpperCase());
}

function isEditorialAnnotationLine(line) {
  const compact = line.replace(/\s+/g, ' ').trim();
  if (!compact) return false;

  return /^(?:Art[íi]culo|P[áa]rrafo|Fracci[óo]n|Inciso|Numeral|Cap[íi]tulo|Secci[óo]n|Denominaci[óo]n|T[íi]tulo)\s+(?:reformad[oa]|adicionad[oa]|derogad[oa]|recorrid[oa]).*\bDOF\b/i.test(compact)
    || /^Fe de erratas\b.*\bDOF\b/i.test(compact);
}

export function cleanPageText(text, source = {}) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .filter(line => !isBoilerplateLine(line, source))
    .filter(line => !isEditorialAnnotationLine(line))
    .join('\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeBody(value) {
  return String(value || '')
    .replace(/\[\[PAGE:\d+]]/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\s+(?:Art[íi]culo|P[áa]rrafo|Fracci[óo]n|Inciso|Numeral|Cap[íi]tulo|Secci[óo]n|Denominaci[óo]n|T[íi]tulo)\s+(?:reformad[oa]|adicionad[oa]|derogad[oa]|recorrid[oa]).*?\bDOF\b\s+\d{2}-\d{2}-\d{4}/giu, '')
    .replace(/\n(?:DISPOSICIONES\s+(?:DE\s+VIGENCIA\s+TEMPORAL|TRANSITORIAS)[^\n]*|ART[ÍI]CULOS?\s+TRANSITORIOS?[^\n]*|TRANSITORIOS)\b[\s\S]*$/iu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildMainBody(pages, source, kind) {
  const headerSource = kind === 'rule' ? RULE_HEADER_SOURCE : ARTICLE_HEADER_SOURCE;
  const cleanedPages = pages.map(page => ({
    num: page.num,
    text: cleanPageText(page.text, source),
    headings: page.headings || [],
  }));
  const hasStyledHeadings = cleanedPages.some(page => page.headings.length > 0);
  const firstProvisionIndex = cleanedPages.findIndex(page => (
    hasStyledHeadings ? page.headings.length > 0 : regexFrom(headerSource).test(page.text)
  ));

  if (firstProvisionIndex < 0) {
    return { text: '', ranges: [], firstProvisionPage: null, transitoryPage: null };
  }

  const selected = [];
  let transitoryPage = null;

  for (let index = firstProvisionIndex; index < cleanedPages.length; index += 1) {
    const page = cleanedPages[index];
    const transitoryMatch = page.text.match(/^\s*TRANSITORIOS\s*:?\s*$/imu);
    if (transitoryMatch) {
      transitoryPage = page.num;
      const beforeHeading = page.text.slice(0, transitoryMatch.index).trim();
      if (beforeHeading) selected.push({ ...page, text: beforeHeading });
      break;
    }
    selected.push(page);
  }

  let text = '';
  const ranges = [];
  const headingMatches = [];
  for (const page of selected) {
    const marker = `\n[[PAGE:${page.num}]]\n`;
    text += marker;
    const start = text.length;
    text += page.text;
    ranges.push({ page: page.num, start, end: text.length });

    if (hasStyledHeadings) {
      const candidates = [...page.text.matchAll(regexFrom(headerSource))];
      let cursor = 0;
      for (const heading of page.headings) {
        const expectedId = normalizeProvisionId(heading.id, kind);
        const candidate = candidates.find(item => {
          const itemStart = item.index ?? 0;
          return itemStart >= cursor && normalizeProvisionId(item[1], kind) === expectedId;
        });
        if (!candidate) continue;
        const localIndex = candidate.index ?? 0;
        headingMatches.push({
          id: expectedId,
          index: start + localIndex,
          length: candidate[0].length,
        });
        cursor = localIndex + candidate[0].length;
      }
    }
  }

  return {
    text,
    ranges,
    headingMatches,
    firstProvisionPage: cleanedPages[firstProvisionIndex].num,
    transitoryPage,
  };
}

function pageForOffset(ranges, offset) {
  const range = ranges.find(item => offset >= item.start && offset <= item.end);
  if (range) return range.page;
  const previous = [...ranges].reverse().find(item => offset >= item.end);
  return previous?.page ?? ranges[0]?.page ?? null;
}

function parseProvisions(pages, source, kind) {
  const main = buildMainBody(pages, source, kind);
  const headerRegex = regexFrom(kind === 'rule' ? RULE_HEADER_SOURCE : ARTICLE_HEADER_SOURCE);
  const matches = main.headingMatches.length
    ? main.headingMatches
    : [...main.text.matchAll(headerRegex)].map(match => ({
      id: normalizeProvisionId(match[1], kind),
      index: match.index ?? 0,
      length: match[0].length,
    }));
  const provisions = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = match.index;
    const bodyStart = start + match.length;
    const end = matches[index + 1]?.index ?? main.text.length;
    const body = normalizeBody(main.text.slice(bodyStart, end));
    const id = match.id;
    const startPage = pageForOffset(main.ranges, start);
    const endPage = pageForOffset(main.ranges, Math.max(bodyStart, end - 1));

    if (!body) continue;
    provisions.push({
      kind,
      id,
      label: `${kind === 'rule' ? 'Regla' : 'Artículo'} ${id}`,
      content: body,
      contentSha256: sha256(body),
      sourcePages: startPage === endPage ? [startPage] : [startPage, endPage],
    });
  }

  return { ...main, provisions };
}

export function extractLawArticles(pages, source = {}) {
  return parseProvisions(pages, source, 'article');
}

export function extractRmfRules(pages, source = {}) {
  return parseProvisions(pages, source, 'rule');
}

function compareNumericIds(left, right) {
  const leftParts = String(left).split('.').map(Number);
  const rightParts = String(right).split('.').map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

export function validateProvisions(provisions, policy = {}) {
  const failures = [];
  const warnings = [];
  const byId = new Map();

  for (const provision of provisions) {
    const normalizedId = normalizeForComparison(normalizeProvisionId(provision.id, provision.kind || 'article'));
    const group = byId.get(normalizedId) || [];
    group.push(provision);
    byId.set(normalizedId, group);
  }

  const duplicates = [...byId.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([id, group]) => ({
      id,
      occurrences: group.length,
      conflicting: new Set(group.map(item => item.contentSha256)).size > 1,
    }));
  if (duplicates.length) failures.push(`Se detectaron ${duplicates.length} identificadores duplicados.`);

  const artifacts = provisions.filter(item => /--\s*\d+\s+of\s+\d+\s*--|\uFFFD|C[ÁA]MARA DE DIPUTADOS/i.test(item.content));
  if (artifacts.length) failures.push(`${artifacts.length} disposiciones conservan artefactos de extracción.`);

  const short = provisions.filter(item => item.content.length < (policy.minimumContentLength || 30));
  if (short.length) warnings.push(`${short.length} disposiciones tienen texto inusualmente corto.`);

  if (policy.minimumEntries && provisions.length < policy.minimumEntries) {
    failures.push(`Se extrajeron ${provisions.length}; el mínimo esperado es ${policy.minimumEntries}.`);
  }
  if (policy.maximumEntries && provisions.length > policy.maximumEntries) {
    failures.push(`Se extrajeron ${provisions.length}; el máximo esperado es ${policy.maximumEntries}.`);
  }

  const anchorResults = (policy.anchors || []).map(anchor => {
    const provision = provisions.find(item => normalizeForComparison(item.id) === normalizeForComparison(anchor.id));
    const normalizedContent = normalizeForComparison(provision?.content);
    const missingTerms = (anchor.terms || []).filter(term => !normalizedContent.includes(normalizeForComparison(term)));
    return {
      id: anchor.id,
      found: Boolean(provision),
      missingTerms,
      status: provision && missingTerms.length === 0 ? 'pass' : 'fail',
    };
  });
  const failedAnchors = anchorResults.filter(result => result.status !== 'pass');
  if (failedAnchors.length) failures.push(`Fallaron ${failedAnchors.length} anclas normativas.`);

  let regressions = 0;
  for (let index = 1; index < provisions.length; index += 1) {
    const previousBase = provisions[index - 1].id.match(/^\d+(?:\.\d+)*/)?.[0];
    const currentBase = provisions[index].id.match(/^\d+(?:\.\d+)*/)?.[0];
    if (previousBase && currentBase && compareNumericIds(currentBase, previousBase) < 0) regressions += 1;
  }
  if (regressions && !policy.allowNumericRegressions) failures.push(`La secuencia normativa retrocede ${regressions} veces.`);

  return {
    status: failures.length === 0 ? 'pass' : 'fail',
    failures,
    warnings,
    duplicates,
    regressions,
    anchors: anchorResults,
  };
}

export function extractRmfAmendmentSummary(pages, source = {}) {
  const text = pages.map(page => cleanPageText(page.text, source)).join('\n\n');
  const directiveMatch = text.match(/PRIMERO\.\s+([\s\S]+?)\s+para quedar de la siguiente manera:/i);
  const directive = normalizeBody(directiveMatch?.[1] || '');
  const provisionIds = [...directive.matchAll(/\b(\d+(?:\.\d+){1,3})\.?\b/g)]
    .map(match => match[1]);
  const uniqueProvisionIds = [...new Set(provisionIds)];

  const sections = {
    reformed: directive.match(/Se reforman?\s+([\s\S]+?)(?=;\s*se adicionan?|;\s*se deroga|$)/i)?.[1] || '',
    added: directive.match(/se adicionan?\s+([\s\S]+?)(?=;\s*(?:as[íi]\s+como|y\s+)?se deroga|$)/i)?.[1] || '',
    repealed: directive.match(/se deroga\s+([\s\S]+?)$/i)?.[1] || '',
  };

  const idsFor = value => [...new Set([...value.matchAll(/\b(\d+(?:\.\d+){1,3})\.?\b/g)].map(match => match[1]))];
  return {
    directive,
    mentionedProvisionIds: uniqueProvisionIds,
    operations: {
      reformed: idsFor(sections.reformed),
      added: idsFor(sections.added),
      repealed: idsFor(sections.repealed),
    },
    contentSha256: sha256(text),
    status: directive ? 'parsed_directive_requires_patch_application' : 'directive_not_found',
  };
}

export const RMF_2026_FIRST_AMENDMENT = Object.freeze({
  reformed: Object.freeze({
    '2.1.6': 'primer párrafo',
    '2.4.1': 'tercer párrafo, fracción I, inciso a)',
    '2.7.1.48': 'primer párrafo',
    '2.7.3.1': 'tercer párrafo',
    '2.7.3.2': 'tercer párrafo',
    '2.7.3.3': 'tercer párrafo',
    '2.7.3.4': 'tercer párrafo',
    '2.7.3.5': 'cuarto párrafo',
    '2.7.3.7': 'sexto párrafo',
    '2.7.3.8': 'tercer párrafo',
    '2.7.3.9': 'tercer párrafo',
    '2.7.4.1': 'sexto párrafo',
    '2.7.5.8': 'regla completa',
    '2.10.10': 'segundo párrafo',
    '2.11.3': 'primer párrafo, fracción II, segundo párrafo, y segundo y tercer párrafos de la regla',
    '2.14.3': 'segundo párrafo',
    '2.14.9': 'fracciones III y IV, segundo párrafo',
    '2.14.11': 'primer párrafo',
    '3.15.14': 'regla completa',
    '3.16.11': 'regla completa',
    '5.2.7': 'primer párrafo',
    '5.2.8': 'segundo párrafo',
    '5.2.48': 'primer párrafo',
    '9.4.6': 'fracciones I, primer párrafo y II',
    '10.16': 'primer párrafo, fracción VI',
    '11.7.1': 'apartado A, fracciones II, primer párrafo y III, inciso g), numeral 3',
    '11.9.13': 'primer párrafo',
    '12.1.2': 'regla completa',
    '12.1.9': 'regla completa',
    '12.1.11': 'regla completa',
  }),
  added: Object.freeze({
    '3.5.23': 'regla completa',
    '9.1.23': 'regla completa',
    '9.1.24': 'regla completa',
    '11.7.3': 'regla completa',
    '11.18.1': 'regla completa',
    '11.18.2': 'regla completa',
    '11.18.3': 'regla completa',
  }),
  repealed: Object.freeze({
    '2.12.4': 'regla completa',
  }),
});

function cleanAmendmentProvisionContent(content, id) {
  let value = String(content || '').trim();
  if (id === '12.1.11') value = value.replace(/\nSEGUNDO\.[\s\S]*$/u, '').replace(/[”"]\s*$/u, '').trim();
  if (id === '2.12.4') value = value.replace(/^(Se deroga\.)[\s\S]*$/iu, '$1');
  return value;
}

export function extractRmfAmendmentProvisions(pages, source = {}) {
  const extracted = extractRmfRules(pages, source);
  const expected = new Set([
    ...Object.keys(RMF_2026_FIRST_AMENDMENT.reformed),
    ...Object.keys(RMF_2026_FIRST_AMENDMENT.added),
    ...Object.keys(RMF_2026_FIRST_AMENDMENT.repealed),
  ]);
  const byId = new Map();

  for (const provision of extracted.provisions) {
    if (!expected.has(provision.id) || byId.has(provision.id)) continue;
    const content = cleanAmendmentProvisionContent(provision.content, provision.id);
    byId.set(provision.id, { ...provision, content, contentSha256: sha256(content) });
  }

  const missing = [...expected].filter(id => !byId.has(id));
  return {
    provisions: [...byId.values()],
    expectedProvisionIds: [...expected],
    missingProvisionIds: missing,
    status: missing.length === 0 ? 'pass' : 'fail',
  };
}

function overlayPacket(baseContent, amendment, operation, scope, metadata) {
  const officialNotice = [
    '[ACTUALIZACIÓN OFICIAL VIGENTE — PRIMERA RESOLUCIÓN DE MODIFICACIONES 2026]',
    `Operación: ${operation}. Alcance publicado: ${scope}.`,
    `Publicación: ${metadata.publishedAt}. Vigencia general: ${metadata.effectiveFrom}.`,
    `Fuente modificatoria: ${metadata.url}`,
    `SHA-256 fuente modificatoria: ${metadata.sourceSha256}`,
    'El siguiente bloque es el texto literal publicado para el alcance reformado y prevalece sobre el texto base en ese alcance:',
    amendment.content,
  ].join('\n');

  if (operation === 'adición' || operation === 'derogación' || scope === 'regla completa') return officialNotice;

  return [
    officialNotice,
    '',
    '[TEXTO BASE OFICIAL — CONSERVA VIGENCIA FUERA DEL ALCANCE REFORMADO]',
    'No se deben completar los puntos suspensivos del bloque modificatorio por inferencia. Para una respuesta se recuperan conjuntamente esta superposición y el texto base:',
    baseContent,
  ].join('\n');
}

export function consolidateRmfProvisions(baseProvisions, amendmentProvisions, metadata) {
  const byId = new Map(baseProvisions.map(item => [item.id, { ...item }]));
  const amendmentById = new Map(amendmentProvisions.map(item => [item.id, item]));
  const failures = [];
  const patches = [];

  for (const [operationKey, operationLabel] of [['reformed', 'reforma'], ['added', 'adición'], ['repealed', 'derogación']]) {
    for (const [id, scope] of Object.entries(RMF_2026_FIRST_AMENDMENT[operationKey])) {
      const amendment = amendmentById.get(id);
      const base = byId.get(id);
      if (!amendment) {
        failures.push(`Falta el bloque oficial modificatorio de la regla ${id}.`);
        continue;
      }
      if (operationKey !== 'added' && !base) {
        failures.push(`Falta la regla base ${id} requerida por la modificación.`);
        continue;
      }
      if (operationKey === 'added' && base) {
        failures.push(`La regla adicionada ${id} ya existe en el texto base.`);
        continue;
      }

      const content = overlayPacket(base?.content || '', amendment, operationLabel, scope, metadata);
      const consolidated = {
        ...(base || amendment),
        id,
        label: `Regla ${id}`,
        content,
        contentSha256: sha256(content),
        sourcePages: [...new Set([...(base?.sourcePages || []), ...(amendment.sourcePages || [])])],
      };
      byId.set(id, consolidated);
      patches.push({
        id,
        operation: operationLabel,
        scope,
        baseContentSha256: base?.contentSha256 || null,
        amendmentContentSha256: amendment.contentSha256,
        consolidatedContentSha256: consolidated.contentSha256,
        amendmentSourcePages: amendment.sourcePages,
      });
    }
  }

  const provisions = [...byId.values()].sort((left, right) => compareNumericIds(left.id, right.id));
  return {
    provisions,
    patches,
    failures,
    status: failures.length === 0 && patches.length === 38 ? 'pass' : 'fail',
  };
}

export function renderCorpusMarkdown(source, provisions, metadata) {
  const header = [
    `# ${source.name}`,
    '',
    `> Código: ${source.code}`,
    `> Módulo: ${source.module || 'fiscal'}`,
    `> Fuente oficial: ${source.url}`,
    `> SHA-256 fuente: ${metadata.sourceSha256}`,
    `> Verificación oficial: ${metadata.checkedAt}`,
    metadata.lastReform ? `> Última reforma indicada en la fuente: ${metadata.lastReform}` : null,
    '',
  ].filter(line => line !== null);

  const blocks = provisions.map(provision => `**${provision.label}**\n${provision.content}`);
  return `${header.join('\n')}${blocks.join('\n\n')}\n`;
}
