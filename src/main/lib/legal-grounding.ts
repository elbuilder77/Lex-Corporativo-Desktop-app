import { z } from 'zod';

export type GroundingSourceKind = 'legal' | 'evidence' | 'instruction';

export interface GroundingSource {
  id?: string | number;
  sourceId?: string;
  kind?: GroundingSourceKind;
  law_code?: string;
  article_number?: string;
  title?: string;
  content?: string;
}

export const GroundedClaimSchema = z.object({
  claimId: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/),
  heading: z.string().trim().max(160),
  text: z.string().trim().min(1).max(80_000),
  sourceIds: z.array(z.string().trim().min(1).max(240)).min(1).max(24),
}).strict();

export const StructuredGroundedOutputSchema = z.object({
  claims: z.array(GroundedClaimSchema).min(1).max(200),
}).strict();

export type GroundedClaim = z.infer<typeof GroundedClaimSchema>;
export type StructuredGroundedOutput = z.infer<typeof StructuredGroundedOutputSchema>;

export const GROUNDED_CLAIM_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['claimId', 'heading', 'text', 'sourceIds'],
  properties: {
    claimId: { type: 'string', minLength: 1, maxLength: 120, pattern: '^[A-Za-z0-9._:-]+$' },
    heading: { type: 'string', maxLength: 160 },
    text: { type: 'string', minLength: 1, maxLength: 80_000 },
    sourceIds: {
      type: 'array',
      minItems: 1,
      maxItems: 24,
      items: { type: 'string', minLength: 1, maxLength: 240 },
    },
  },
};

export const STRUCTURED_GROUNDED_OUTPUT_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['claims'],
  properties: {
    claims: {
      type: 'array',
      minItems: 1,
      maxItems: 200,
      items: GROUNDED_CLAIM_JSON_SCHEMA,
    },
  },
};

export type GroundingFailureReason =
  | 'missing_citation'
  | 'unsupported_citation'
  | 'unsupported_claim'
  | 'missing_claim'
  | 'duplicate_claim'
  | 'unknown_source_id'
  | 'missing_required_claim';

export interface GroundingValidation {
  valid: boolean;
  cited: string[];
  unsupported: string[];
  unsupportedClaims?: string[];
  reason?: GroundingFailureReason;
}

export interface GroundingValidationOptions {
  requireCitation?: boolean;
}

export interface StructuredGroundingValidationOptions {
  requiredClaimTexts?: string[];
  requiredSourceKinds?: GroundingSourceKind[];
}

export interface GroundingRepairOutcome {
  output: string;
  validation: GroundingValidation;
  repaired: boolean;
  initialValidation?: GroundingValidation;
}

export interface StructuredGroundingRepairOutcome {
  output: StructuredGroundedOutput;
  validation: GroundingValidation;
  repaired: boolean;
  initialValidation?: GroundingValidation;
}

const LAW_CODES = 'CFF|LISR|RLISR|LIVA|RLIVA|RMF|CCOM|LGSM|LGTOC';
const ARTICLE_ID = String.raw`\d+(?:o|º|°)?(?:\s*-\s*[A-Z])?(?:\s+(?:Bis|Ter|Qu[aá]ter|Quinquies|Sexies|Septies|Octies|Nonies))?`;
const RULE_ID = String.raw`\d+(?:\.\d+){1,3}`;

function normalizeLawCode(value: string): string {
  return value.toUpperCase();
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

export function getGroundingSourceId(source: GroundingSource): string | null {
  const explicit = source.sourceId ?? source.id;
  if (explicit !== undefined && explicit !== null && String(explicit).trim()) {
    return String(explicit).trim();
  }

  return getProvisionSourceKey(source);
}

function getProvisionSourceKey(source: GroundingSource): string | null {
  const label = String(source.article_number || '').trim();
  const match = label.match(/^(Artículo|Regla)\s+(.+)$/i);
  if (!source.law_code || !match) return null;
  const kind = match[1].toLowerCase() === 'regla' ? 'rule' : 'article';
  return `${normalizeLawCode(source.law_code)}:${kind}:${normalizeProvisionId(match[2])}`;
}

function normalizeClaimText(value: string): string {
  return String(value || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

const CLAIM_STOPWORDS = new Set([
  'a', 'al', 'ante', 'bajo', 'como', 'con', 'contra', 'cuando', 'de', 'del', 'desde', 'durante',
  'e', 'el', 'ella', 'en', 'entre', 'es', 'esta', 'este', 'estos', 'hacia', 'hasta', 'la', 'las',
  'lo', 'los', 'mediante', 'o', 'para', 'por', 'que', 'se', 'segun', 'sin', 'sobre', 'su', 'sus', 'un',
  'una', 'uno', 'y', 'ya', 'articulo', 'regla', 'cff', 'lisr', 'rlisr', 'liva', 'rliva', 'rmf', 'ccom',
  'lgsm', 'lgtoc', 'establece', 'dispone', 'indica', 'senala', 'fundamento', 'norma', 'texto', 'legal',
]);

function normalizeForSupport(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getSupportTokens(value: string): string[] {
  return normalizeForSupport(value)
    .replace(new RegExp(String.raw`\b(?:${LAW_CODES})\b`, 'giu'), ' ')
    .replace(new RegExp(String.raw`\b(?:articulo|regla)\s+(?:${ARTICLE_ID}|${RULE_ID})`, 'giu'), ' ')
    .match(/[a-z][a-z0-9-]{2,}/g)
    ?.filter(token => !CLAIM_STOPWORDS.has(token)) || [];
}

function supportStem(token: string): string {
  return token.length > 6 ? token.slice(0, 6) : token;
}

function isTokenSupported(token: string, sourceTokens: Set<string>, sourceStems: Set<string>): boolean {
  return sourceTokens.has(token) || sourceStems.has(supportStem(token));
}

function getUnsupportedCitedClaims(output: string, sources: GroundingSource[]): string[] {
  const sourceByKey = new Map(sources
    .map(source => [getProvisionSourceKey(source), normalizeForSupport(source.content || '')] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1])));
  if (sourceByKey.size === 0) return [];

  const segments = output
    .split(/(?<=[.!?])\s+|\n+/)
    .map(segment => segment.trim())
    .filter(Boolean);
  const failures: string[] = [];

  for (const segment of segments) {
    const citedKeys = [...sourceByKey.keys()].filter(key => {
      const [lawCode, kind, provisionId] = key.split(':');
      const label = kind === 'rule' ? 'regla' : 'articulo';
      const normalizedSegment = normalizeForSupport(segment).replace(/\s+/g, ' ');
      const normalizedId = provisionId.replace(/-/g, String.raw`[\s-]*`);
      return new RegExp(String.raw`\b${lawCode.toLowerCase()}\b[^\n.]{0,55}\b${label}\s+${normalizedId}\b`, 'i').test(normalizedSegment)
        || new RegExp(String.raw`\b${label}\s+${normalizedId}\b[^\n.]{0,55}\b(?:del|de la)\s+${lawCode.toLowerCase()}\b`, 'i').test(normalizedSegment);
    });
    if (citedKeys.length === 0) continue;

    const claimTokens = [...new Set(getSupportTokens(segment))];
    if (claimTokens.length === 0) continue;
    const combinedSource = citedKeys.map(key => sourceByKey.get(key) || '').join(' ');
    const sourceTokens = new Set(getSupportTokens(combinedSource));
    const sourceStems = new Set([...sourceTokens].map(supportStem));
    const supportedCount = claimTokens.filter(token => isTokenSupported(token, sourceTokens, sourceStems)).length;

    const segmentWithoutCitations = normalizeForSupport(segment)
      .replace(new RegExp(String.raw`\b(?:${LAW_CODES})\b`, 'giu'), ' ')
      .replace(new RegExp(String.raw`\b(?:articulo|regla)\s+(?:${ARTICLE_ID}|${RULE_ID})`, 'giu'), ' ');
    const claimNumbers = segmentWithoutCitations.match(/\b\d+(?:[.,]\d+)?\b/g) || [];
    const unsupportedNumber = claimNumbers.some(number => !new RegExp(String.raw`\b${number.replace('.', String.raw`\.`)}\b`).test(combinedSource));
    const supportRatio = supportedCount / claimTokens.length;

    // Local free-form output is fail-closed: an exact citation is necessary,
    // but it is not enough if the accompanying factual language is absent
    // from the recovered provision.
    if (unsupportedNumber || supportedCount === 0 || (claimTokens.length >= 3 && supportRatio < 0.5)) {
      failures.push(segment.slice(0, 280));
    }
  }

  return failures;
}

/**
 * Compatibility gate for grounded model output. It validates exact provision
 * identifiers and then applies a conservative lexical/numeric support check
 * to each cited factual sentence. Structured BYOK output uses exact source IDs
 * through the contract below.
 */
export function validateGroundedLegalOutput(
  output: string,
  sources: GroundingSource[],
  options: GroundingValidationOptions = {},
): GroundingValidation {
  const requireCitation = options.requireCitation !== false;
  const allowed = new Set(sources.map(getProvisionSourceKey).filter((key): key is string => Boolean(key)));
  const allowedGeneric = new Set([...allowed]
    .filter(key => /:(?:article|rule):/.test(key))
    .map(key => key.split(':').slice(1).join(':')));
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
    return { valid: false, cited: [...cited], unsupported: [...unsupported], reason: 'unsupported_citation' };
  }
  if (requireCitation && cited.size === 0) {
    return { valid: false, cited: [], unsupported: [], reason: 'missing_citation' };
  }

  const unsupportedClaims = getUnsupportedCitedClaims(output, sources);
  if (unsupportedClaims.length > 0) {
    return {
      valid: false,
      cited: [...cited],
      unsupported: [],
      unsupportedClaims,
      reason: 'unsupported_claim',
    };
  }

  return { valid: true, cited: [...cited], unsupported: [] };
}

export function validateStructuredGroundedOutput(
  output: StructuredGroundedOutput,
  sources: GroundingSource[],
  options: StructuredGroundingValidationOptions = {},
): GroundingValidation {
  const parsed = StructuredGroundedOutputSchema.safeParse(output);
  if (!parsed.success) {
    return {
      valid: false,
      cited: [],
      unsupported: [],
      unsupportedClaims: parsed.error.issues.map(issue => issue.path.join('.') || issue.message),
      reason: 'missing_claim',
    };
  }

  const sourceEntries = sources
    .map(source => ({ id: getGroundingSourceId(source), kind: source.kind || 'legal' as GroundingSourceKind }))
    .filter((entry): entry is { id: string; kind: GroundingSourceKind } => Boolean(entry.id));
  const allowed = new Map(sourceEntries.map(entry => [entry.id, entry.kind]));
  const cited = new Set<string>();
  const claimIds = new Set<string>();

  for (const claim of parsed.data.claims) {
    if (claimIds.has(claim.claimId)) {
      return {
        valid: false,
        cited: [...cited],
        unsupported: [],
        unsupportedClaims: [claim.claimId],
        reason: 'duplicate_claim',
      };
    }
    claimIds.add(claim.claimId);

    const uniqueSourceIds = new Set(claim.sourceIds);
    if (uniqueSourceIds.size !== claim.sourceIds.length) {
      return {
        valid: false,
        cited: [...cited],
        unsupported: [],
        unsupportedClaims: [claim.claimId],
        reason: 'duplicate_claim',
      };
    }

    const unknown = claim.sourceIds.filter(sourceId => !allowed.has(sourceId));
    if (unknown.length > 0) {
      return {
        valid: false,
        cited: [...cited],
        unsupported: [...new Set(unknown)],
        unsupportedClaims: [claim.claimId],
        reason: 'unknown_source_id',
      };
    }

    const missingKinds = (options.requiredSourceKinds || [])
      .filter(kind => !claim.sourceIds.some(sourceId => allowed.get(sourceId) === kind));
    if (missingKinds.length > 0) {
      return {
        valid: false,
        cited: [...cited],
        unsupported: missingKinds.map(kind => `kind:${kind}`),
        unsupportedClaims: [claim.claimId],
        reason: 'missing_citation',
      };
    }

    claim.sourceIds.forEach(sourceId => cited.add(sourceId));
  }

  const claimTexts = new Set(parsed.data.claims.map(claim => normalizeClaimText(claim.text)));
  const missingRequired = (options.requiredClaimTexts || [])
    .map(normalizeClaimText)
    .filter(Boolean)
    .filter(text => !claimTexts.has(text));
  if (missingRequired.length > 0) {
    return {
      valid: false,
      cited: [...cited],
      unsupported: [],
      unsupportedClaims: missingRequired.slice(0, 20),
      reason: 'missing_required_claim',
    };
  }

  return { valid: true, cited: [...cited], unsupported: [], unsupportedClaims: [] };
}

export function renderGroundedClaims(
  output: StructuredGroundedOutput,
  sources: GroundingSource[],
): string {
  const labels = new Map(sources.map(source => {
    const id = getGroundingSourceId(source);
    const label = [source.law_code || source.title, source.article_number].filter(Boolean).join(' ').trim();
    return [id, label || id] as const;
  }).filter((entry): entry is readonly [string, string] => Boolean(entry[0])));

  const body = output.claims.map(claim => {
    const heading = claim.heading ? `${claim.heading}\n` : '';
    const sourceLabels = claim.sourceIds.map(sourceId => labels.get(sourceId) || sourceId);
    return `${heading}${claim.text}\n\nFuentes vinculadas: ${sourceLabels.join('; ')}`;
  }).join('\n\n');

  return body.trim();
}

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

export async function validateOrRepairStructuredGroundedOutput(
  initialOutput: StructuredGroundedOutput,
  sources: GroundingSource[],
  options: StructuredGroundingValidationOptions = {},
  repair?: (
    validation: GroundingValidation,
    rejectedOutput: StructuredGroundedOutput,
  ) => Promise<StructuredGroundedOutput>,
): Promise<StructuredGroundingRepairOutcome> {
  const initialValidation = validateStructuredGroundedOutput(initialOutput, sources, options);
  if (initialValidation.valid || !repair) {
    return { output: initialOutput, validation: initialValidation, repaired: false };
  }

  const repairedOutput = await repair(initialValidation, initialOutput);
  const repairedValidation = validateStructuredGroundedOutput(repairedOutput, sources, options);
  return {
    output: repairedOutput,
    validation: repairedValidation,
    repaired: true,
    initialValidation,
  };
}
