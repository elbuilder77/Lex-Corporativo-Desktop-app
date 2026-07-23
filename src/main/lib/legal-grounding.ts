export interface GroundingSource {
  law_code?: string;
  article_number?: string;
  content?: string;
}

export interface GroundingValidation {
  valid: boolean;
  cited: string[];
  unsupported: string[];
  unsupportedClaims?: string[];
  reason?: 'missing_citation' | 'unsupported_citation' | 'unsupported_claim';
}

export interface GroundingValidationOptions {
  requireCitation?: boolean;
  validateClaims?: boolean;
}

export interface GroundingRepairOutcome {
  output: string;
  validation: GroundingValidation;
  repaired: boolean;
  initialValidation?: GroundingValidation;
}

const LAW_CODES = 'CFF|LISR|RLISR|LIVA|RLIVA|RMF|CCOM|LGSM|LGTOC';
const ARTICLE_ID = String.raw`\d+(?:o|º|°)?(?:\s*-\s*[A-Z])?(?:\s+(?:Bis|Ter|Qu[aá]ter|Quinquies|Sexies|Septies|Octies|Nonies))?`;
const RULE_ID = String.raw`\d+(?:\.\d+){1,3}`;
const CLAIM_STOPWORDS = new Set([
  'como', 'con', 'contra', 'cuando', 'debe', 'del', 'desde', 'donde', 'este', 'esta', 'estos', 'estas',
  'para', 'pero', 'porque', 'puede', 'segun', 'sobre', 'tiene', 'todo', 'toda', 'entre', 'hasta', 'cada',
  'el', 'la', 'los', 'las', 'de', 'en', 'un', 'una', 'unos', 'unas', 'por', 'al', 'su', 'sus', 'es',
  'se', 'lo', 'y', 'o', 'si', 'no', 'que', 'más', 'mas', 'menos', 'fundamento', 'recuperado',
]);
const LEGAL_CLAIM_TRIGGER = /(?:^|[^\p{L}\p{N}_])(?:acredita|autoridad|cfdi|contribuyente|deduci|derecho|debe(?:r[áa])?|establece|fiscal|impuesto|multa|obliga|permite|plazo|proh[ií]be|requisito|retenci[oó]n|sat|sanci[oó]n)(?=$|[^\p{L}\p{N}_])/iu;

function normalizeLawCode(value: string): string {
  return value.toUpperCase() === 'CCOM' ? 'CCOM' : value.toUpperCase();
}

function normalizeProvisionId(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(\d)\s*(?:o|º|°)\.?/g, '$1')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[.,;:]+$/g, '')
    .trim();
}

function sourceKey(source: GroundingSource): string | null {
  const label = String(source.article_number || '').trim();
  const match = label.match(/^(Artículo|Regla)\s+(.+)$/i);
  if (!source.law_code || !match) return null;
  const kind = match[1].toLowerCase() === 'regla' ? 'rule' : 'article';
  return `${normalizeLawCode(source.law_code)}:${kind}:${normalizeProvisionId(match[2])}`;
}

function claimTerms(value: string): string[] {
  return [...new Set(String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length >= 3 && !CLAIM_STOPWORDS.has(term)))];
}

function unsupportedClaims(output: string, sources: GroundingSource[]): string[] {
  const evidence = sources.map(source => `${source.law_code || ''} ${source.article_number || ''} ${(source.content || '').slice(0, 1500)}`).join(' ');
  const evidenceTerms = new Set(claimTerms(evidence));
  const unsupported: string[] = [];
  const claims = output.split(/(?<=[.!?])\s+|\n+/u).map(value => value.trim()).filter(Boolean);

  for (const claim of claims) {
    if (!LEGAL_CLAIM_TRIGGER.test(claim)) continue;
    const terms = claimTerms(claim);
    if (terms.length === 0) continue;
    const supportedTerms = terms.filter(term => evidenceTerms.has(term));
    const coverage = supportedTerms.length / terms.length;
    const quantifiedClaims = claim.match(/\b\d+(?:[.,]\d+)?\s*(?:%|d[ií]as?|mes(?:es)?|a[nñ]os?|pesos?|udis?)\b/giu) || [];
    const unsupportedQuantity = quantifiedClaims.some(quantity => !normalizeForClaim(evidence).includes(normalizeForClaim(quantity)));
    if (coverage < 0.45 || supportedTerms.length < 2 || unsupportedQuantity) unsupported.push(claim.slice(0, 240));
  }
  return unsupported;
}

function normalizeForClaim(value: string): string {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function validateGroundedLegalOutput(
  output: string,
  sources: GroundingSource[],
  options: GroundingValidationOptions = {},
): GroundingValidation {
  const requireCitation = options.requireCitation !== false;
  const shouldValidateClaims = options.validateClaims !== false;
  const allowed = new Set(sources.map(sourceKey).filter((key): key is string => Boolean(key)));
  const allowedGeneric = new Set([...allowed].map(key => key.split(':').slice(1).join(':')));
  const cited = new Set<string>();
  const unsupported = new Set<string>();

  const explicitPatterns = [
    new RegExp(String.raw`\b(${LAW_CODES})\b[^\n.]{0,45}\b(Artículo)\s+(${ARTICLE_ID})`, 'giu'),
    new RegExp(String.raw`\b(${LAW_CODES})\b[^\n.]{0,45}\b(Regla)\s+(${RULE_ID})`, 'giu'),
    new RegExp(String.raw`\b(Artículo)\s+(${ARTICLE_ID})[^\n.]{0,45}\b(?:del|de la)\s+(${LAW_CODES})\b`, 'giu'),
    new RegExp(String.raw`\b(Regla)\s+(${RULE_ID})[^\n.]{0,45}\b(?:de la\s+)?(${LAW_CODES})\b`, 'giu'),
  ];

  for (let patternIndex = 0; patternIndex < explicitPatterns.length; patternIndex += 1) {
    const lawFirst = patternIndex < 2;
    for (const match of output.matchAll(explicitPatterns[patternIndex])) {
      const lawCode = normalizeLawCode(lawFirst ? match[1] : match[3]);
      const kindLabel = lawFirst ? match[2] : match[1];
      const id = lawFirst ? match[3] : match[2];
      const kind = kindLabel.toLowerCase() === 'regla' ? 'rule' : 'article';
      const key = `${lawCode}:${kind}:${normalizeProvisionId(id)}`;
      cited.add(key);
      if (!allowed.has(key)) unsupported.add(key);
    }
  }

  const genericPatterns = [
    { kind: 'article', regex: new RegExp(String.raw`\bArtículo\s+(${ARTICLE_ID})`, 'giu') },
    { kind: 'rule', regex: new RegExp(String.raw`\bRegla\s+(${RULE_ID})`, 'giu') },
  ];
  for (const pattern of genericPatterns) {
    for (const match of output.matchAll(pattern.regex)) {
      const genericKey = `${pattern.kind}:${normalizeProvisionId(match[1])}`;
      if (![...cited].some(key => key.endsWith(`:${genericKey}`))) {
        cited.add(genericKey);
        if (!allowedGeneric.has(genericKey)) unsupported.add(genericKey);
      }
    }
  }

  if (unsupported.size > 0) {
    return {
      valid: false,
      cited: [...cited],
      unsupported: [...unsupported],
      unsupportedClaims: [],
      reason: 'unsupported_citation',
    };
  }
  if (requireCitation && cited.size === 0) {
    return {
      valid: false,
      cited: [],
      unsupported: [],
      unsupportedClaims: [],
      reason: 'missing_citation',
    };
  }

  const claims = shouldValidateClaims ? unsupportedClaims(output, sources) : [];
  if (claims.length > 0) {
    return { valid: false, cited: [...cited], unsupported: [], unsupportedClaims: claims, reason: 'unsupported_claim' };
  }

  return { valid: true, cited: [...cited], unsupported: [], unsupportedClaims: [] };
}

/**
 * Gives a remote provider one constrained correction pass before the caller
 * applies the fail-closed rejection. Local execution can omit `repair` and
 * retains the existing single-pass behavior.
 */
export async function validateOrRepairGroundedOutput(
  initialOutput: string,
  sources: GroundingSource[],
  options: GroundingValidationOptions = {},
  repair?: (validation: GroundingValidation, rejectedOutput: string) => Promise<string>,
): Promise<GroundingRepairOutcome> {
  const initialValidation = validateGroundedLegalOutput(initialOutput, sources, options);
  if (initialValidation.valid || !repair) {
    return { output: initialOutput, validation: initialValidation, repaired: false };
  }

  const repairedOutput = (await repair(initialValidation, initialOutput)).trim();
  const repairedValidation = validateGroundedLegalOutput(repairedOutput, sources, options);
  return {
    output: repairedOutput,
    validation: repairedValidation,
    repaired: true,
    initialValidation,
  };
}
