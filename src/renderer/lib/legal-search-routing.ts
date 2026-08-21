export type SearchableLegalModule = 'mercantil' | 'laboral' | 'comercio_exterior' | 'aduanal' | 'fiscal';

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const MODULE_PATTERNS: Record<SearchableLegalModule, RegExp[]> = {
  mercantil: [
    /\bcodigo de comercio\b/, /\blgsm\b/, /\blgtoc\b/, /\bsociedad(?:es)? mercantil(?:es)?\b/,
    /\basamblea(?:s)? de accionistas\b/, /\baccionista/, /\bpagare\b/, /\bendoso\b/,
    /\baval\b/, /\btitulo(?:s)? de credito\b/, /\bmercantil\b/,
  ],
  laboral: [
    /\blft\b/, /\bley federal del trabajo\b/, /\btrabajador/, /\btrabajadora/, /\bpatron(?:al)?\b/,
    /\brelacion de trabajo\b/, /\bcontrato individual\b/, /\bsalario\b/, /\bjornada\b/,
    /\bdespido\b/, /\brescision laboral\b/, /\baguinaldo\b/, /\bvacaciones\b/,
    /\bprestaciones laborales\b/, /\btrabajo del hogar\b/, /\btrabajadores del hogar\b/,
  ],
  comercio_exterior: [
    /\blce\b/, /\brlce\b/, /\bley de comercio exterior\b/, /\bcomercio exterior\b/,
    /\bcuota(?:s)? compensatoria/, /\bpractica(?:s)? desleal/, /\brestriccion(?:es)? no arancelaria/,
    /\bregulacion(?:es)? no arancelaria/, /\bpermiso previo\b/, /\bcertificado(?:s)? de origen\b/,
  ],
  aduanal: [
    /\bley aduanera\b/, /\brla\b/, /\brgce\b/, /\bligie\b/, /\btigie\b/, /\baduana/,
    /\baduanal\b/, /\bpedimento/, /\bdespacho aduanero\b/, /\bpama\b/, /\bembargo precautorio\b/,
    /\bvalor en aduana\b/, /\bregimen aduanero\b/, /\bfraccion arancelaria\b/, /\bnico\b/,
  ],
  fiscal: [
    /\bcff\b/, /\blisr\b/, /\brlisr\b/, /\bliva\b/, /\brliva\b/, /\brmf\b/, /\bresico\b/,
    /\bcfdi\b/, /\bsat\b/, /\biva\b/, /\bisr\b/, /\bimpuest/, /\bdeduc/, /\bacreditamiento\b/,
    /\b69[- ]?b\b/, /\bfacultades de comprobacion\b/,
  ],
};

export function detectLikelyLegalModule(query: string): SearchableLegalModule | null {
  const normalized = normalize(query);
  const scores = (Object.entries(MODULE_PATTERNS) as Array<[SearchableLegalModule, RegExp[]]>)
    .map(([module, patterns]) => ({
      module,
      score: patterns.filter(pattern => pattern.test(normalized)).length,
    }))
    .sort((left, right) => right.score - left.score);

  if (scores[0].score === 0 || scores[0].score === scores[1].score) return null;
  return scores[0].module;
}

export function suggestAlternativeLegalModule(
  query: string,
  currentModule: SearchableLegalModule,
): SearchableLegalModule | null {
  const detected = detectLikelyLegalModule(query);
  return detected && detected !== currentModule ? detected : null;
}
