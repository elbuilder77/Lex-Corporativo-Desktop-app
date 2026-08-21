import { normalizeLawCode } from './prompts.ts';

const RELEVANCE_STOPWORDS = new Set([
  'actual', 'acuerdo', 'ademas', 'alguna', 'alguno', 'ante', 'auditar', 'auditoria', 'como', 'cual', 'cuando', 'debe', 'dime',
  'donde', 'entre', 'esta', 'este', 'esto', 'hacer', 'hasta', 'ignora', 'indica', 'instruccion', 'legal',
  'articulo', 'art', 'codigo', 'reglamento', 'conforme', 'establece', 'menciona', 'disposicion', 'normatividad',
  'pena', 'penal', 'sancion',
  'ley', 'norma', 'para', 'pero', 'puede', 'quiero', 'regla', 'responde', 'respuesta', 'segun', 'sobre',
  'solo', 'toda', 'todo', 'vigente', 'el', 'la', 'los', 'las', 'de', 'del', 'en', 'un', 'una', 'con',
  'por', 'al', 'su', 'sus', 'es', 'se', 'lo', 'y', 'o', 'si', 'no', 'me', 'que', 'quien',
]);

function normalize(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function terms(value: string): string[] {
  return [...new Set(normalize(value).split(' ').filter(term => term.length >= 3 && !RELEVANCE_STOPWORDS.has(term)))];
}

function normalizeExplicitQuery(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const LAW_NAME_PATTERNS: Array<[RegExp, string]> = [
  [/\bREGLAMENTO DE LA LEY DEL IMPUESTO SOBRE LA RENTA\b/, 'RLISR'],
  [/\bREGLAMENTO DE LA LEY DEL IMPUESTO AL VALOR AGREGADO\b/, 'RLIVA'],
  [/\bREGLAMENTO DE LA LEY DE COMERCIO EXTERIOR\b/, 'RLCE'],
  [/\bREGLAMENTO DE LA LEY ADUANERA\b/, 'RLA'],
  [/\bLEY GENERAL DE TITULOS Y OPERACIONES DE CREDITO\b/, 'LGTOC'],
  [/\bLEY GENERAL DE SOCIEDADES MERCANTILES\b/, 'LGSM'],
  [/\bCODIGO FISCAL DE LA FEDERACION\b/, 'CFF'],
  [/\bLEY DEL IMPUESTO SOBRE LA RENTA\b/, 'LISR'],
  [/\bLEY DEL IMPUESTO AL VALOR AGREGADO\b/, 'LIVA'],
  [/\bLEY FEDERAL DEL TRABAJO\b/, 'LFT'],
  [/\bLEY DE COMERCIO EXTERIOR\b/, 'LCE'],
  [/\bLEY DE LOS IMPUESTOS GENERALES DE IMPORTACION Y DE EXPORTACION\b/, 'LIGIE'],
  [/\bREGLAS GENERALES DE COMERCIO EXTERIOR\b/, 'RGCE'],
  [/\bRESOLUCION MISCELANEA FISCAL\b/, 'RMF'],
  [/\bCODIGO DE COMERCIO\b/, 'CCOM'],
  [/\bLEY ADUANERA\b/, 'LA'],
];

function getExplicitLawCode(query: string, normalized: string): string | null {
  const generalCode = normalized.match(/\b(CFF|LISR|RLISR|LIVA|RLIVA|RMF|CCOM|LGSM|LGTOC|LFT|LCE|RLCE|RLA|LIGIE|TIGIE|RGCE)\b/)?.[1] || null;
  if (generalCode) return generalCode === 'TIGIE' ? 'LIGIE' : generalCode;

  const namedLaw = LAW_NAME_PATTERNS.find(([pattern]) => pattern.test(normalized))?.[1];
  if (namedLaw) return namedLaw;
  if (/\bLA\b/.test(query)) return 'LA';
  return null;
}

function termMatches(queryTerm: string, evidenceTerms: Set<string>): boolean {
  if (evidenceTerms.has(queryTerm)) return true;
  if (queryTerm === 'cfdi') {
    return [...evidenceTerms].some(term => term.startsWith('comprobant'))
      && [...evidenceTerms].some(term => term.startsWith('fiscal'))
      && [...evidenceTerms].some(term => term.startsWith('digital'));
  }
  if (queryTerm === 'iva') {
    return evidenceTerms.has('liva') || evidenceTerms.has('rliva')
      || (evidenceTerms.has('impuesto') && evidenceTerms.has('valor') && evidenceTerms.has('agregado'));
  }
  if (queryTerm === 'isr') return evidenceTerms.has('lisr') || evidenceTerms.has('rlisr');
  if (queryTerm.length < 6) return false;
  const prefix = queryTerm.slice(0, 6);
  return [...evidenceTerms].some(term => term.length >= 6 && term.startsWith(prefix));
}

export function getExplicitProvisionTarget(query: string): { lawCode: string | null; kind: 'article' | 'rule' | null; id: string | null } {
  const normalized = normalizeExplicitQuery(query);
  const law = getExplicitLawCode(query, normalized);
  const identifier = String.raw`(\d+(?:\.\d+){0,3}(?:\s*-\s*[A-Z]+)?(?:\s+(?:BIS|TER|QUATER|QUINQUIES|SEXIES|SEPTIES|OCTIES|NONIES))?)`;
  const labeled = normalized.match(new RegExp(`\\b(ART(?:ICULO)?\\.?|REGLA)\\s+${identifier}`));
  const compact = law ? normalized.match(new RegExp(`\\b${law}\\s+${identifier}`)) : null;
  const rawId = labeled?.[2] || compact?.[1] || null;
  const id = rawId
    ?.replace(/\s*-\s*/g, '-')
    .replace(/\s+(BIS|TER|QUATER|QUINQUIES|SEXIES|SEPTIES|OCTIES|NONIES)\b/, (_match, suffix: string) => (
      ` ${suffix.charAt(0)}${suffix.slice(1).toLowerCase()}`
    ))
    || null;

  return {
    lawCode: law,
    kind: labeled?.[1] === 'REGLA' ? 'rule' : labeled?.[1] ? 'article' : null,
    id,
  };
}

export interface EvidenceCandidate {
  law_code?: string;
  article_number?: string;
  title?: string;
  content?: string;
  similarity?: number;
}

export interface EvidenceAssessment {
  sufficient: boolean;
  reason: 'explicit_reference' | 'lexical_semantic' | 'insufficient_overlap';
  matchedTerms: string[];
  queryTerms: string[];
  coverage: number;
  similarity: number;
}

export function getPreferredLawCodes(query: string): Set<string> {
  const value = normalize(query);
  const preferred = new Set<string>();
  const explicitLawCode = getExplicitLawCode(query, normalizeExplicitQuery(query));
  if (explicitLawCode) preferred.add(explicitLawCode);

  if (/\b(?:iva|acredita\w*)\b/u.test(value) || value.includes('impuesto al valor agregado')) {
    preferred.add('LIVA');
    preferred.add('RLIVA');
  }
  if (/\b(?:cfdi|69-b|materialidad|operaciones inexistentes)\b/u.test(value)) preferred.add('CFF');
  if (/\b(?:rmf|miscelanea fiscal)\b/u.test(value)) preferred.add('RMF');
  if (/\b(?:pagare|endoso|aval|cheque|letra de cambio)\b/u.test(value)) preferred.add('LGTOC');
  if (/\b(?:sociedad anonima|asamblea|accionistas)\b/u.test(value)) preferred.add('LGSM');
  if (/\b(?:actos de comercio|codigo de comercio)\b/u.test(value)) preferred.add('CCOM');
  if (/\b(?:laboral|trabajador|trabajadora|patron|patronal|salario|jornada|prestaciones|relacion de trabajo|contrato individual)\b/u.test(value)) preferred.add('LFT');
  if (/\b(?:comercio exterior|exportacion|importacion|cuota compensatoria|practicas desleales|restriccion no arancelaria|permiso previo)\b/u.test(value)) {
    preferred.add('LCE');
    preferred.add('RLCE');
  }
  if (/\b(?:aduana|aduanal|pedimento|despacho aduanero|agente aduanal|valor en aduana|regimen aduanero)\b/u.test(value)) {
    preferred.add('LA');
    preferred.add('RLA');
    preferred.add('RGCE');
  }
  if (/\b(?:ligie|tigie|fraccion arancelaria|tarifa|arancel|nico|capitulo arancelario)\b/u.test(value)) preferred.add('LIGIE');
  return preferred;
}

export function assessLegalEvidence(query: string, candidate: EvidenceCandidate): EvidenceAssessment {
  const queryTerms = terms(query);
  const evidenceTerms = new Set(terms(`${candidate.law_code || ''} ${candidate.title || ''} ${candidate.article_number || ''} ${candidate.content || ''}`));
  const matchedTerms = queryTerms.filter(term => termMatches(term, evidenceTerms));
  const coverage = queryTerms.length ? matchedTerms.length / queryTerms.length : 0;
  const similarity = Number.isFinite(candidate.similarity) ? Number(candidate.similarity) : 0;
  const target = getExplicitProvisionTarget(query);
  const candidateCode = normalizeLawCode(candidate.law_code || candidate.title);
  const candidateId = String(candidate.article_number || '').match(/\d+(?:\.\d+){0,3}(?:\s*-\s*[A-Za-z]+)?(?:\s+(?:Bis|Ter|Qu[aá]ter|Quinquies|Sexies|Septies|Octies|Nonies))?/i)?.[0]
    ?.replace(/\s+/g, '')
    .toUpperCase() || null;
  const idMatches = Boolean(target.id && candidateId === target.id.replace(/\s+/g, '').toUpperCase());
  const explicitMatches = Boolean(target.lawCode && target.id && candidateCode === target.lawCode && idMatches);

  if (explicitMatches) {
    return { sufficient: true, reason: 'explicit_reference', matchedTerms, queryTerms, coverage, similarity };
  }

  if (target.lawCode && target.id) {
    return { sufficient: false, reason: 'insufficient_overlap', matchedTerms, queryTerms, coverage, similarity };
  }

  const sufficient = (
    (matchedTerms.length >= 2 && similarity >= 0.25 && coverage >= 0.25)
    || (matchedTerms.length >= 2 && coverage >= 0.40)
    || (queryTerms.length === 1 && matchedTerms.length === 1 && similarity >= 0.35)
  );
  return {
    sufficient,
    reason: sufficient ? 'lexical_semantic' : 'insufficient_overlap',
    matchedTerms,
    queryTerms,
    coverage,
    similarity,
  };
}
