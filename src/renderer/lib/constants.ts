/**
 * Shared constants used across the application.
 * Centralizes magic strings, template definitions, and configuration values.
 */

// ── RAG Embedding Task Types ──────────────────────────────
export const EMBEDDING_TASK_TYPES = {
  QUERY: 'RETRIEVAL_QUERY',
  DOCUMENT: 'RETRIEVAL_DOCUMENT',
} as const;

// ── File Validation ──────────────────────────────────────
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_COUNT = 5;
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

// ── Default Chat Messages ─────────────────────────────────
export const INITIAL_FISCAL_MESSAGE = {
  role: 'model' as const,
  text: '¡Le damos la bienvenida al módulo de Asuntos Fiscales de Lex Corporativo!\n\nEstoy a su disposición para asistirle en la evaluación de implicaciones fiscales, análisis de cumplimiento, estrategias de prevención y dudas sobre la normativa tributaria federal.\n\n¿En qué podemos asistirle el día de hoy?',
};

export const RESET_MESSAGE = {
  role: 'model' as const,
  text: 'Conversación reiniciada con éxito. Estoy a su disposición para continuar con su siguiente consulta jurídica o análisis documental.',
};

export interface DraftingTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  requiredFields: string[];
  output: string;
  intentGroup?: string;
}

export function buildDraftingPromptFromTemplate(template: DraftingTemplate): string {
  return [
    `Plantilla predefinida: ${template.title}`,
    `Objetivo: ${template.description}`,
    `Entregable esperado: ${template.output}`,
    'Requisitos mínimos:',
    ...template.requiredFields.map((field) => `- ${field}`),
    '',
    'Instrucción base:',
    template.prompt,
    '',
    'Datos específicos del portafolio:',
    '- ',
  ].join('\n');
}

export function applyDraftingTemplateToPrompt(
  template: DraftingTemplate,
  currentPrompt: string,
  previousTemplate?: DraftingTemplate | null
): string {
  const nextScaffold = buildDraftingPromptFromTemplate(template);
  const trimmedPrompt = currentPrompt.trim();

  if (!trimmedPrompt) return nextScaffold;
  if (currentPrompt.includes(`Plantilla predefinida: ${template.title}`)) {
    return currentPrompt;
  }

  if (previousTemplate) {
    const previousScaffold = buildDraftingPromptFromTemplate(previousTemplate);
    const promptWithoutPreviousScaffold = currentPrompt.replace(previousScaffold, '').trim();
    if (promptWithoutPreviousScaffold !== trimmedPrompt) {
      const userNotes = promptWithoutPreviousScaffold.replace(/^Notas (adicionales existentes|del portafolio):\s*/i, '').trim();
      return userNotes
        ? `${nextScaffold}\n\nNotas del portafolio:\n${userNotes}`
        : nextScaffold;
    }
  }

  return `${nextScaffold}\n\nNotas del portafolio:\n${currentPrompt}`;
}

// ── Mercantil Drafting Templates ──────────────────────────
export const MERCANTIL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'mercantil-sapi-acta-constitutiva',
    title: 'Acta Constitutiva (SAPI)',
    description: 'Estructura societaria inicial con gobierno corporativo y reglas de inversión.',
    prompt: 'Proyecto de Acta Constitutiva para una Sociedad Anónima Promotora de Inversión de Capital Variable (SAPI de CV) con cláusulas de gobierno corporativo avanzado, derecho de preferencia y restricciones a la transmisión de acciones.',
    requiredFields: ['Denominación social', 'Accionistas', 'Capital social', 'Objeto social', 'Administrador o consejo', 'Reglas de transmisión de acciones'],
    output: 'Proyecto de acta constitutiva con clausulado societario base.',
    intentGroup: 'Constituir / Gobernar sociedad',
  },
  {
    id: 'mercantil-asamblea-ordinaria',
    title: 'Asamblea Ordinaria',
    description: 'Acta para aprobar estados financieros, informes y ratificación de cargos.',
    prompt: 'Acta de Asamblea General Ordinaria de Accionistas para aprobación de estados financieros, informe del administrador y ratificación de poderes.',
    requiredFields: ['Sociedad', 'Fecha de asamblea', 'Accionistas presentes', 'Ejercicio aprobado', 'Resoluciones', 'Firmantes'],
    output: 'Acta de asamblea con orden del día, quórum y resoluciones.',
    intentGroup: 'Constituir / Gobernar sociedad',
  },
  {
    id: 'mercantil-pagare',
    title: 'Pagaré Mercantil',
    description: 'Título de crédito con monto, vencimiento, intereses y aval cuando aplique.',
    prompt: 'Pagaré mercantil con cláusula de intereses moratorios, vencimiento anticipado y aval, conforme a la LGTOC.',
    requiredFields: ['Monto', 'Acreedor', 'Deudor', 'Fecha de pago', 'Lugar de pago', 'Interés moratorio', 'Aval si existe'],
    output: 'Pagaré mercantil ensamblado desde plantilla estática cuando el motor extrae los datos requeridos.',
    intentGroup: 'Cobrar / Garantizar',
  },
  {
    id: 'mercantil-fideicomiso-garantia',
    title: 'Contrato de Fideicomiso',
    description: 'Fideicomiso de garantía para respaldar obligaciones crediticias o comerciales.',
    prompt: 'Contrato de fideicomiso de garantía para asegurar obligaciones crediticias, incluyendo designación de fiduciario y reglas de ejecución extrajudicial.',
    requiredFields: ['Fideicomitente', 'Fiduciario', 'Fideicomisario', 'Bienes aportados', 'Obligación garantizada', 'Evento de incumplimiento'],
    output: 'Borrador de contrato con estructura de garantía, administración y ejecución.',
    intentGroup: 'Cobrar / Garantizar',
  },
  {
    id: 'mercantil-poder-dominio',
    title: 'Poder para Actos de Dominio',
    description: 'Instrumento de facultades amplias para representación corporativa.',
    prompt: 'Poder general para pleitos y cobranzas, actos de administración y actos de dominio, con facultades especiales para suscribir títulos de crédito.',
    requiredFields: ['Poderdante', 'Apoderado', 'Facultades', 'Limitaciones', 'Vigencia', 'Jurisdicción o notaría'],
    output: 'Proyecto de poder con facultades y reservas expresas.',
    intentGroup: 'Constituir / Gobernar sociedad',
  },
  {
    id: 'mercantil-suministro',
    title: 'Suministro Mercantil',
    description: 'Contrato de suministro con precios, entregas, penalizaciones y exclusividad.',
    prompt: 'Contrato de suministro mercantil con cláusulas de exclusividad, precios revisables y penalizaciones por incumplimiento de entrega.',
    requiredFields: ['Proveedor', 'Cliente', 'Bienes o servicios', 'Precio', 'Calendario de entrega', 'Penalizaciones', 'Exclusividad'],
    output: 'Contrato de suministro con clausulado operativo y remedios por incumplimiento.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'mercantil-franquicia-licencia',
    title: 'Franquicia / Licencia',
    description: 'Contrato para uso de marca, transferencia operativa y regalías.',
    prompt: 'Contrato de franquicia con licencia de uso de marca, transferencia de tecnología y manuales de operación, incluyendo regalías y zona de exclusividad.',
    requiredFields: ['Titular de marca', 'Franquiciatario o licenciatario', 'Marca', 'Territorio', 'Regalías', 'Manual operativo', 'Duración'],
    output: 'Contrato con licencia, obligaciones operativas, pagos y territorio.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'mercantil-adenda',
    title: 'Adenda Contractual',
    description: 'Convenio modificatorio para corregir contingencias del análisis previo.',
    prompt: 'Convenio modificatorio (adenda) para modificar cláusulas específicas de un contrato existente, subsanando brechas de penalizaciones, plazos o garantías.',
    requiredFields: ['Contrato original', 'Partes firmantes', 'Cláusulas a modificar', 'Nueva redacción', 'Fecha de efectos'],
    output: 'Convenio modificatorio listo para firmas.',
    intentGroup: 'Corregir / Blindar',
  },
  {
    id: 'mercantil-clausula-penalizacion',
    title: 'Cláusula de Penalización',
    description: 'Redacción de pena convencional ante incumplimientos operativos o de pago.',
    prompt: 'Redacción de una cláusula de pena convencional robusta, detallando tasas moratorias, límites máximos de acumulación y condiciones de exigibilidad.',
    requiredFields: ['Supuestos de incumplimiento', 'Monto o porcentaje de pena', 'Mecanismo de notificación', 'Plazo de subsanación'],
    output: 'Cláusula de penalización redactada en términos mercantiles.',
    intentGroup: 'Corregir / Blindar',
  },
  {
    id: 'mercantil-clausula-jurisdiccion',
    title: 'Cláusula de Jurisdicción',
    description: 'Redacción de competencia de tribunales y ley aplicable en México.',
    prompt: 'Redacción de una cláusula de jurisdicción y ley aplicable para resolver controversias en la Ciudad de México u otra de las entidades federales, renunciando a fueros futuros.',
    requiredFields: ['Lugar de tribunales competentes', 'Ley aplicable', 'Renuncia de fuero domicilio'],
    output: 'Cláusula de jurisdicción con sometimiento expreso.',
    intentGroup: 'Corregir / Blindar',
  },
];

// ── Fiscal Drafting Templates ─────────────────────────────
export const FISCAL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'fiscal-dictamen-materialidad',
    title: 'Dictamen de Materialidad',
    description: 'Dictamen para soportar existencia, ejecución y evidencia de una operación.',
    prompt: 'Dictamen de materialidad para una operación de servicios, integrando contrato, CFDI, entregables, pagos, evidencia de ejecución y conclusión de soporte documental.',
    requiredFields: ['Contribuyente', 'Proveedor', 'Operación', 'Monto', 'Contrato', 'CFDI', 'Entregables', 'Pagos', 'Evidencia disponible'],
    output: 'Dictamen con hechos, evidencia, riesgos y conclusión de soporte documental.',
    intentGroup: 'Soportar / Acreditar materialidad',
  },
  {
    id: 'fiscal-matriz-riesgo',
    title: 'Matriz de Riesgo Fiscal',
    description: 'Evaluación estructurada de riesgos documentales y fiscales.',
    prompt: 'Matriz de riesgo fiscal para evaluar materialidad, deducibilidad, IVA acreditable, razón de negocios, exposición 69-B y coherencia documental.',
    requiredFields: ['Operación', 'Proveedor', 'Riesgo principal', 'Evidencia existente', 'Evidencia faltante', 'Monto', 'Periodo'],
    output: 'Matriz con rubros, nivel de riesgo, hallazgos y acciones de cierre.',
    intentGroup: 'Evaluar / Prevenir riesgo',
  },
  {
    id: 'fiscal-checklist',
    title: 'Checklist Fiscal',
    description: 'Lista de integración probatoria para portafolio de defensa.',
    prompt: 'Checklist de soporte documental para acreditar operación, capacidad del proveedor, entregables, forma de pago, CFDI, contrato y evidencia de recepción.',
    requiredFields: ['Tipo de operación', 'Proveedor', 'Documentos existentes', 'Documentos faltantes', 'Responsable interno', 'Fecha objetivo'],
    output: 'Checklist accionable con documentos, prioridad y responsable sugerido.',
    intentGroup: 'Evaluar / Prevenir riesgo',
  },
  {
    id: 'fiscal-escrito-sat',
    title: 'Escrito SAT',
    description: 'Escrito libre de aclaración o contestación a requerimiento de autoridad fiscal.',
    prompt: 'Escrito libre de aclaración al SAT para contestar requerimiento o presentar aclaración, con autoridad, RFC, folio, domicilio fiscal, hechos y peticiones.',
    requiredFields: ['Contribuyente', 'RFC', 'Domicilio fiscal', 'Autoridad SAT', 'Folio o requerimiento', 'Hechos', 'Petición concreta'],
    output: 'Escrito libre ensamblado desde plantilla estática cuando el motor extrae los datos requeridos.',
    intentGroup: 'Contestar / Aclarar',
  },
  {
    id: 'fiscal-informe-deducibilidad',
    title: 'Informe de Deducibilidad',
    description: 'Informe para justificar estricta indispensabilidad y soporte del gasto.',
    prompt: 'Informe de deducibilidad para justificar estricta indispensabilidad, relación con actividad, documentación soporte y riesgos de rechazo.',
    requiredFields: ['Gasto u operación', 'Actividad del contribuyente', 'Monto', 'Proveedor', 'CFDI', 'Pago', 'Relación con ingresos'],
    output: 'Informe con análisis de indispensabilidad, soporte y riesgos de rechazo.',
    intentGroup: 'Justificar / Analizar deducibilidad',
  },
  {
    id: 'fiscal-informe-iva',
    title: 'Informe de IVA Acreditable',
    description: 'Revisión de requisitos para acreditamiento de IVA.',
    prompt: 'Informe de IVA acreditable para revisar requisitos de acreditamiento, pago efectivo, CFDI, relación con actos gravados y soporte documental.',
    requiredFields: ['Operación', 'IVA trasladado', 'Fecha de pago', 'CFDI', 'Actos gravados relacionados', 'Evidencia contable'],
    output: 'Informe de acreditamiento con requisitos, faltantes y recomendación.',
    intentGroup: 'Justificar / Analizar deducibilidad',
  },
  {
    id: 'fiscal-razon-negocios',
    title: 'Razón de Negocios',
    description: 'Justificación ejecutiva de sustancia económica y beneficio esperado.',
    prompt: 'Justificación de razón de negocios para explicar sustancia económica, necesidad operativa, beneficio esperado y coherencia documental de la operación.',
    requiredFields: ['Operación', 'Necesidad operativa', 'Beneficio esperado', 'Alternativas consideradas', 'Evidencia de ejecución', 'Impacto económico'],
    output: 'Memo de razón de negocios con narrativa, soporte y conclusión.',
    intentGroup: 'Justificar / Analizar deducibilidad',
  },
  {
    id: 'fiscal-solicitud-evidencia',
    title: 'Solicitud de Evidencia',
    description: 'Carta para pedir soporte documental a proveedor o área interna.',
    prompt: 'Carta de solicitud de evidencia al proveedor para pedir entregables, reportes, constancias de ejecución, personal asignado y soporte de capacidad operativa.',
    requiredFields: ['Destinatario', 'Operación', 'Periodo', 'Documentos solicitados', 'Fecha límite', 'Responsable de recepción'],
    output: 'Carta formal de solicitud con lista de evidencia y plazo.',
    intentGroup: 'Soportar / Acreditar materialidad',
  },
  {
    id: 'fiscal-memo-interno',
    title: 'Memo Fiscal Interno',
    description: 'Memo de trabajo con hallazgos, faltantes y plan de integración.',
    prompt: 'Memorándum fiscal interno con hallazgos, faltantes, riesgos, recomendaciones y plan de integración de portafolio probatorio.',
    requiredFields: ['Área solicitante', 'Operación', 'Hallazgos', 'Riesgos', 'Faltantes', 'Acciones recomendadas', 'Responsables'],
    output: 'Memo interno con diagnóstico y plan de seguimiento.',
    intentGroup: 'Contestar / Aclarar',
  },
];

// ── Labor Drafting Templates ──────────────────────────────
export const LABORAL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'laboral-contrato-indeterminado',
    title: 'Contrato por tiempo indeterminado',
    description: 'Contrato individual con puesto, jornada, salario, prestaciones y lugar de trabajo.',
    prompt: 'Contrato individual de trabajo por tiempo indeterminado conforme a la legislación laboral mexicana, con cláusulas de puesto, jornada, salario, prestaciones, herramientas, confidencialidad y terminación.',
    requiredFields: ['Patrón', 'Persona trabajadora', 'Puesto', 'Salario', 'Jornada', 'Lugar de trabajo', 'Fecha de ingreso', 'Prestaciones'],
    output: 'Contrato individual listo para revisión y firma.',
    intentGroup: 'Contratación',
  },
  {
    id: 'laboral-contrato-determinado',
    title: 'Contrato por tiempo determinado',
    description: 'Contrato temporal con causa objetiva, vigencia y entregables definidos.',
    prompt: 'Contrato individual de trabajo por tiempo determinado que identifique la causa temporal, periodo, puesto, jornada, salario, prestaciones y condiciones de terminación.',
    requiredFields: ['Patrón', 'Persona trabajadora', 'Causa temporal', 'Fecha inicial', 'Fecha final', 'Puesto', 'Salario', 'Jornada'],
    output: 'Contrato temporal con causa y vigencia claramente delimitadas.',
    intentGroup: 'Contratación',
  },
  {
    id: 'laboral-teletrabajo',
    title: 'Convenio de teletrabajo',
    description: 'Anexo para trabajo remoto, herramientas, conectividad y seguridad de la información.',
    prompt: 'Convenio modificatorio o anexo de teletrabajo con domicilio de prestación, herramientas, costos, disponibilidad, protección de datos, seguridad de la información y reversibilidad.',
    requiredFields: ['Partes', 'Contrato original', 'Domicilio de teletrabajo', 'Horario', 'Herramientas', 'Apoyos o costos', 'Medidas de seguridad'],
    output: 'Anexo de teletrabajo listo para revisión interna.',
    intentGroup: 'Modalidades de trabajo',
  },
  {
    id: 'laboral-confidencialidad',
    title: 'Convenio de confidencialidad laboral',
    description: 'Obligaciones de reserva, propiedad intelectual y devolución de información.',
    prompt: 'Convenio laboral de confidencialidad, protección de secretos industriales, propiedad intelectual, tratamiento de información y devolución de activos al terminar la relación.',
    requiredFields: ['Patrón', 'Persona trabajadora', 'Información protegida', 'Sistemas o activos', 'Vigencia', 'Excepciones'],
    output: 'Convenio de confidencialidad y propiedad intelectual.',
    intentGroup: 'Protección de información',
  },
  {
    id: 'laboral-convenio-modificatorio',
    title: 'Convenio modificatorio laboral',
    description: 'Modificación documentada de puesto, salario, jornada o lugar de trabajo.',
    prompt: 'Convenio modificatorio de contrato individual de trabajo que preserve los derechos adquiridos y documente con claridad las nuevas condiciones acordadas.',
    requiredFields: ['Partes', 'Contrato original', 'Condición anterior', 'Nueva condición', 'Fecha de efectos', 'Derechos preservados'],
    output: 'Convenio modificatorio listo para revisión y firma.',
    intentGroup: 'Cambios de condiciones',
  },
];

export type LegalEngineeringArea = 'mercantil' | 'laboral';

export const LEGAL_ENGINEERING_TEMPLATES: Record<LegalEngineeringArea, DraftingTemplate[]> = {
  mercantil: MERCANTIL_DRAFTING_TEMPLATES,
  laboral: LABORAL_DRAFTING_TEMPLATES,
};

// Fase posterior: litigio fiscal profundo, no visible en el módulo actual.
export const FUTURE_FISCAL_LITIGATION_TEMPLATES = [
  {
    title: 'Recurso de Revocación',
    prompt: 'Proyecto de Recurso de Revocación ante el SAT contra una resolución determinante de crédito fiscal.',
  },
  {
    title: 'Juicio de Nulidad',
    prompt: 'Demanda de Juicio Contencioso Administrativo Federal ante el TFJA.',
  },
  {
    title: 'Amparo Fiscal',
    prompt: 'Demanda de Amparo Indirecto en materia fiscal.',
  },
];

// ── Mercantil Regulations ─────────────────────────────────
export const MERCANTIL_REGULATIONS = [
  { title: 'Ley General de Sociedades Mercantiles (LGSM)', description: 'Regula la constitución, organización y funcionamiento de las sociedades mercantiles.', link: 'corpus-local:LGSM' },
  { title: 'Código de Comercio', description: 'Regula los actos de comercio y las obligaciones de los comerciantes.', link: 'corpus-local:CCom' },
];
