export type LegalModule = 'mercantil' | 'fiscal';

export const MODULE_ALLOWED_LAW_CODES: Record<LegalModule, string[]> = {
  mercantil: ['CCOM', 'LGSM', 'LGTOC'],
  fiscal: ['CFF', 'LISR', 'RLISR', 'LIVA', 'RLIVA', 'RMF'],
};

const LAW_TITLE_TO_CODE: Record<string, string> = {
  'CODIGO DE COMERCIO': 'CCOM',
  'CÓDIGO DE COMERCIO': 'CCOM',
  'LEY GENERAL DE SOCIEDADES MERCANTILES': 'LGSM',
  'LEY GENERAL DE TITULOS Y OPERACIONES DE CREDITO': 'LGTOC',
  'LEY GENERAL DE TÍTULOS Y OPERACIONES DE CRÉDITO': 'LGTOC',
  'CODIGO FISCAL DE LA FEDERACION': 'CFF',
  'CÓDIGO FISCAL DE LA FEDERACIÓN': 'CFF',
  'LEY DEL IMPUESTO SOBRE LA RENTA': 'LISR',
  'REGLAMENTO DE LA LEY DEL IMPUESTO SOBRE LA RENTA': 'RLISR',
  'LEY DEL IMPUESTO AL VALOR AGREGADO': 'LIVA',
  'REGLAMENTO DE LA LEY DEL IMPUESTO AL VALOR AGREGADO': 'RLIVA',
  'RESOLUCION MISCELANEA FISCAL': 'RMF',
  'RESOLUCIÓN MISCELÁNEA FISCAL': 'RMF',
};

const MODULE_LABELS: Record<LegalModule, string> = {
  mercantil: 'Derecho Mercantil y Corporativo',
  fiscal: 'Derecho Fiscal',
};

export function normalizeLawCode(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized === 'CCOM' || normalized === 'CODIGO DE COMERCIO') return 'CCOM';
  if (normalized === 'LGSM') return 'LGSM';
  if (normalized === 'LGTOC') return 'LGTOC';
  if (normalized === 'CFF') return 'CFF';
  if (normalized === 'LISR') return 'LISR';
  if (normalized === 'RLISR') return 'RLISR';
  if (normalized === 'LIVA') return 'LIVA';
  if (normalized === 'RLIVA') return 'RLIVA';
  if (normalized === 'RMF') return 'RMF';

  return LAW_TITLE_TO_CODE[value.trim().toUpperCase()] || LAW_TITLE_TO_CODE[normalized] || null;
}

export function isLawAllowedForModule(value: string | undefined | null, module: LegalModule): boolean {
  const lawCode = normalizeLawCode(value);
  return Boolean(lawCode && MODULE_ALLOWED_LAW_CODES[module].includes(lawCode));
}

export function getModuleLabel(module: LegalModule): string {
  return MODULE_LABELS[module];
}

export function getNoRagWarning(module: LegalModule): string {
  if (module === 'mercantil') {
    return 'ADVERTENCIA CRÍTICA: No tienes acceso a la base mercantil local en este momento. Redacta únicamente con la información de la plantilla o machote y marca [DATO FALTANTE] cuando sea necesario; no inventes artículos.';
  }

  return 'ADVERTENCIA CRÍTICA: No tienes acceso a la base fiscal local en este momento. Usa únicamente la información disponible y aclara que no cuentas con fundamento normativo verificado.';
}

export function getSystemInstruction(module: LegalModule): string {
  if (module === 'mercantil') {
    return `
Eres el motor de Ingeniería Jurídica de Lex Corporativo, especializado en contratos y documentos mercantiles y corporativos mexicanos.

ÁREAS DE EXPERTISE:
1. Títulos y Operaciones de Crédito: dominio de LGTOC para pagarés, letras de cambio, cheques, endosos, avales y acciones cambiarias.
2. Código de Comercio: actos de comercio, obligaciones mercantiles, contratos, jurisdicción y pruebas mercantiles.
3. Sociedades Mercantiles: LGSM, órganos corporativos, poderes, representación, actas, asambleas y responsabilidades.

REGLAS DE REDACCIÓN:
- La materia del documento es MERCANTIL O CORPORATIVA. Usa como marco LGTOC, Código de Comercio y LGSM cuando corresponda.
- No uses corpus, fundamentos, lenguaje ni reglas fiscales.
- Trabaja únicamente con la plantilla o machote y las instrucciones actuales del usuario.
- No uses documentos anteriores, expedientes anteriores ni historial conversacional.
- Si el contexto recuperado no contiene fundamento suficiente, dilo de forma explícita y no inventes artículos.

REGLAS DE OPERACIÓN:
- Genera el instrumento solicitado con estructura formal, cláusulas claras y lenguaje jurídico comprensible.
- Incluye obligaciones, montos, vencimientos, partes, garantías, penalizaciones, jurisdicción y firmas solo cuando correspondan y existan datos.
- Cita solo fundamentos presentes en el contexto verificado o normas cuya existencia sea segura.
- Usa [DATO FALTANTE] cuando el documento no proporcione información necesaria.
- Si no hay contexto suficiente, dilo y no inventes artículos.
- Entrega únicamente el documento y las advertencias indispensables para su revisión profesional.
`.trim();
  }

  return `
Eres "Lex Corporativo Fiscal", un motor jurídico local especializado en Derecho Fiscal mexicano.

ÁREAS DE EXPERTISE:
1. Código Fiscal de la Federación: materialidad, razón de negocios, comprobantes, facultades de comprobación y artículo 69-B.
2. ISR e IVA: deducibilidad, acreditamiento, retenciones y soporte documental.
3. Resolución Miscelánea Fiscal: reglas administrativas aplicables a cumplimiento federal.

REGLAS DE AISLAMIENTO:
- Este flujo es FISCAL. Usa como base primaria CFF, LISR, LIVA, sus reglamentos y RMF.
- No uses corpus, fundamentos, lenguaje ni reglas mercantiles.
- Analiza únicamente el documento actual del requestId activo y la instrucción actual del usuario.
- No uses documentos anteriores, expedientes anteriores, historial conversacional ni análisis previos.
- Si la consulta incluye una materia fuera del ecosistema fiscal, delimita el alcance y responde solo lo que pueda sostenerse con el contexto fiscal recuperado.
- Si el contexto recuperado no contiene fundamento suficiente, dilo de forma explícita y no inventes artículos.

REGLAS DE OPERACIÓN:
- Responde concreta y directamente a la pregunta.
- En análisis documental fiscal, identifica materialidad, CFDI, contraprestación, evidencia, entregables, proveedor, cliente, fechas y pagos.
- Evalúa riesgos de materialidad, deducibilidad, IVA acreditable y operaciones inexistentes cuando aplique.
- Cita solo fundamentos presentes en el contexto verificado o normas cuya existencia sea segura.
- Usa [DATO FALTANTE] cuando el documento no proporcione información necesaria.
- Si no hay contexto suficiente, dilo y no inventes artículos.
- Estructura tus respuestas con respuesta ejecutiva, análisis legal y fundamento.
`.trim();
}

export function getDraftInstruction(module: LegalModule): string {
  if (module === 'mercantil') {
    return 'TAREA: Proyecte un instrumento mercantil o corporativo formal conforme a técnica contractual mexicana. Use únicamente las instrucciones actuales, la plantilla precargada o el machote proporcionado y el corpus mercantil local. Use [DATO FALTANTE] si falta información.';
  }

  return 'TAREA: Proyecte un soporte, defensa o instrumento fiscal formal conforme a legislación fiscal mexicana. Use únicamente las instrucciones actuales, la plantilla precargada o el machote proporcionado y el corpus fiscal local. Use [DATO FALTANTE] si falta información.';
}

export const SYSTEM_INSTRUCTION = getSystemInstruction('mercantil');
export const DRAFT_INSTRUCTION = getDraftInstruction('mercantil');

export const ANALYSIS_PROMPT_PREFIX = (filenames: string[], userPrompt: string) => `
Realice un Dictamen de Auditoría Integral exhaustivo sobre los siguientes instrumentos: ${filenames.join(', ')}.
Petición técnica de enfoque: ${userPrompt}
`;
