export type SearchableLegalModule = 'mercantil' | 'fiscal';

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const FISCAL_PATTERNS = [
  /\bcff\b/,
  /\blisr\b/,
  /\bliva\b/,
  /\brmf\b/,
  /\bresico\b/,
  /\bcfdi\b/,
  /\bsat\b/,
  /\biva\b/,
  /\bisr\b/,
  /\bimpuest/,
  /\bdeduc/,
  /\bacreditamiento\b/,
  /\b69[- ]?b\b/,
  /\bfacultades de comprobacion\b/,
];

const MERCANTILE_PATTERNS = [
  /\bcodigo de comercio\b/,
  /\blgsm\b/,
  /\blgtoc\b/,
  /\bsociedad mercantil\b/,
  /\basamblea de accionistas\b/,
  /\baccionista/,
  /\bpagare\b/,
  /\btitulo de credito\b/,
  /\bmercantil\b/,
];

export function detectLikelyLegalModule(query: string): SearchableLegalModule | null {
  const normalized = normalize(query);
  const fiscalMatches = FISCAL_PATTERNS.filter((pattern) => pattern.test(normalized)).length;
  const mercantileMatches = MERCANTILE_PATTERNS.filter((pattern) => pattern.test(normalized)).length;
  if (fiscalMatches === mercantileMatches) return null;
  return fiscalMatches > mercantileMatches ? 'fiscal' : 'mercantil';
}

export function suggestAlternativeLegalModule(
  query: string,
  currentModule: SearchableLegalModule,
): SearchableLegalModule | null {
  const detected = detectLikelyLegalModule(query);
  return detected && detected !== currentModule ? detected : null;
}
