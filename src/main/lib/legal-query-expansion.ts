import type { LegalModule } from './prompts';

export interface ExpandedLegalQuery {
  original: string;
  evidence: string;
  canonical: string;
  retrieval: string;
  addedTerms: string[];
}

function normalize(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function correctFrequentInputErrors(value: string): string {
  return value
    .replace(/\btrabajadadores\b/gi, 'trabajadores')
    .replace(/\btrabajadadoras\b/gi, 'trabajadoras')
    .replace(/\bresicion\b/gi, 'rescision')
    .replace(/\bpresataciones\b/gi, 'prestaciones')
    .replace(/\bmercanti\b/gi, 'mercantil');
}

function add(target: Set<string>, ...terms: string[]): void {
  for (const term of terms) target.add(term);
}

/**
 * Expands short, natural-language searches with a small controlled legal
 * vocabulary. It never invents a law or article number; the corrected query
 * and these module-scoped terms are also used by the local evidence gate.
 */
export function expandLegalQuery(query: string, module: LegalModule | 'todos'): ExpandedLegalQuery {
  const original = String(query || '').trim();
  const evidence = correctFrequentInputErrors(original);
  const canonical = normalize(evidence);
  const added = new Set<string>();

  if (module === 'laboral' || module === 'todos') {
    if (/\b(?:trabajador\w*|emplead\w*)\b.*\b(?:hogar|domestic\w*)\b|\b(?:hogar|domestic\w*)\b.*\b(?:trabajador\w*|emplead\w*)\b/.test(canonical)) {
      add(added, 'personas trabajadoras del hogar', 'trabajo del hogar', 'empleo domestico');
    }
    if (/\bprestacion\w*\b/.test(canonical)) {
      add(added, 'prestaciones laborales', 'aguinaldo', 'vacaciones', 'prima vacacional', 'seguridad social');
    }
    if (/\brescisi\w*\b|\bdespid\w*\b/.test(canonical)) add(added, 'rescision relacion trabajo', 'aviso de rescision');
    if (/\bjornada\w*\b|\bhoras? extra\w*\b/.test(canonical)) add(added, 'jornada de trabajo', 'tiempo extraordinario');
  }

  if (module === 'mercantil' || module === 'mercantil_analysis' || module === 'todos') {
    if (/\bpagar[eé]\b/.test(canonical)) add(added, 'titulo de credito', 'requisitos del pagare');
    if (/\bendos\w*\b/.test(canonical)) add(added, 'endoso titulo de credito');
    if (/\basamblea\w*\b|\baccionista\w*\b/.test(canonical)) add(added, 'asamblea de accionistas', 'sociedad mercantil');
    if (/\bsociedad\w*\b|\bconstitutiv\w*\b/.test(canonical)) add(added, 'sociedad mercantil', 'escritura constitutiva');
  }

  if (module === 'fiscal' || module === 'todos') {
    if (/\bcfdi\b|\bcomprobante\w*\b/.test(canonical)) add(added, 'comprobante fiscal digital', 'requisitos fiscales');
    if (/\bdeducci\w*\b|\bdeducible\w*\b/.test(canonical)) add(added, 'deducciones autorizadas', 'requisitos de deduccion');
    if (/\biva\b|\bacredita\w*\b/.test(canonical)) add(added, 'impuesto al valor agregado', 'acreditamiento del impuesto');
    if (/\b69[ -]?b\b|\boperacion\w* inexistente\w*\b/.test(canonical)) add(added, 'presuncion de operaciones inexistentes');
  }

  if (module === 'comercio_exterior' || module === 'todos') {
    if (/\borigen\b|\bcertificad\w*\b/.test(canonical)) add(added, 'certificado de origen', 'reglas de origen');
    if (/\bno arancelari\w*\b|\bpermiso\w*\b/.test(canonical)) add(added, 'regulaciones y restricciones no arancelarias', 'permiso previo');
    if (/\bcuota\w*\b|\bpractica\w* desleal\w*\b/.test(canonical)) add(added, 'cuota compensatoria', 'practicas desleales de comercio internacional');
  }

  if (module === 'aduanal' || module === 'todos') {
    if (/\bpedimento\w*\b/.test(canonical)) add(added, 'despacho aduanero', 'documentos del pedimento');
    if (/\bvalor\b|\bincrementable\w*\b/.test(canonical)) add(added, 'valor en aduana', 'valor de transaccion', 'incrementables');
    if (/\bpama\b|\bembargo\w*\b/.test(canonical)) add(added, 'procedimiento administrativo en materia aduanera', 'embargo precautorio');
    if (/\bfraccion\w*\b|\barancel\w*\b/.test(canonical)) add(added, 'fraccion arancelaria', 'tarifa de importacion y exportacion');
  }

  for (const phrase of [...added]) {
    if (canonical.includes(phrase)) added.delete(phrase);
  }

  const addedTerms = [...added];
  return {
    original,
    evidence,
    canonical,
    retrieval: [canonical, ...addedTerms].filter(Boolean).join(' '),
    addedTerms,
  };
}
