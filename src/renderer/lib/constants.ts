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
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_FILE_COUNT = 5;
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/xml',
  'text/xml',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];


// ── Default Chat Messages ─────────────────────────────────
export const INITIAL_FISCAL_MESSAGE = {
  role: 'model' as const,
  text: '¡Le damos la bienvenida al módulo Corporativo de Lex Corporativo!\n\nEstoy a su disposición para asistirle en la evaluación de operaciones, contratos, gobierno societario, poderes, garantías y documentación corporativa.\n\n¿En qué podemos asistirle el día de hoy?',
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
    description: 'Estatutos sociales de S.A.P.I. de C.V. con gobierno corporativo avanzado, series de acciones y pactos de accionistas.',
    prompt: 'Proyecto formal de acta constitutiva y estatutos sociales para una Sociedad Anónima Promotora de Inversión de Capital Variable (S.A.P.I. de C.V.) conforme a la Ley General de Sociedades Mercantiles y los artículos 11 a 19 de la Ley del Mercado de Valores, estipulando capital social fijo y variable, acciones Serie "A" (ordinarias) y Serie "B" (preferentes o con voto limitado), derechos de arrastre (drag-along) y adhesión (tag-along), derecho de preferencia, Consejo de Administración o Administrador Único, y Comisario.',
    requiredFields: ['Denominación social', 'Socios / Accionistas fundadores', 'Capital social mínimo fijo y variable', 'Objeto social preponderante', 'Estructura de administración y Comisario', 'Reglas de transmisión de acciones (drag-along / tag-along)'],
    output: 'Proyecto de estatutos sociales y acta constitutiva formal de S.A.P.I. de C.V.',
    intentGroup: 'Constituir / Gobernar sociedad',
  },
  {
    id: 'mercantil-asamblea-ordinaria',
    title: 'Asamblea General Ordinaria Anual',
    description: 'Acta de asamblea ordinaria anual para aprobación de estados financieros, informe de administración, comisario y reservas.',
    prompt: 'Acta de Asamblea General Ordinaria Anual de Accionistas conforme a los artículos 178 a 194 de la Ley General de Sociedades Mercantiles, con orden del día formal, quórum de asistencia y votación, aprobación de estados financieros e informes de administración y del comisario (Art. 166 LGSM), asignación a reserva legal y resolución sobre ratificación u otorgamiento de poderes.',
    requiredFields: ['Denominación social de la sociedad', 'Fecha y hora de celebración', 'Accionistas presentes y porcentaje de capital', 'Ejercicio social a aprobar', 'Resoluciones sobre estados financieros y comisario', 'Presidente, Secretario y Escrutador'],
    output: 'Acta formal de asamblea general ordinaria anual con quórum y resoluciones.',
    intentGroup: 'Constituir / Gobernar sociedad',
  },
  {
    id: 'mercantil-pagare',
    title: 'Pagaré Mercantil',
    description: 'Título de crédito formal con monto líquido, intereses ordinarios y moratorios, vencimiento anticipado y aval solidario.',
    prompt: 'Pagaré mercantil ejecutivo conforme a los artículos 170 a 174 de la Ley General de Títulos y Operaciones de Crédito (LGTOC), estipulando la promesa incondicional de pagar una suma determinada de dinero, fecha y lugar de vencimiento, tasa de interés moratorio mensual, cláusula expresa de vencimiento anticipado por mora y designación de aval solidario.',
    requiredFields: ['Monto en número y letra', 'Acreedor o beneficiario', 'Suscriptor / Deudor', 'Fecha y lugar de pago', 'Tasa de interés moratorio', 'Aval solidario (si aplica)'],
    output: 'Pagaré mercantil formal con fuerza ejecutiva cambiaria conforme a la LGTOC.',
    intentGroup: 'Cobrar / Garantizar',
  },
  {
    id: 'mercantil-fideicomiso-garantia',
    title: 'Fideicomiso Irrevocable de Garantía',
    description: 'Contrato de fideicomiso de garantía ante institución fiduciaria para asegurar obligaciones comerciales o crediticias.',
    prompt: 'Contrato de fideicomiso irrevocable de garantía conforme a los artículos 381 a 407 de la Ley General de Títulos y Operaciones de Crédito, con afectación y aportación de bienes o derechos, designación de fiduciario bancario, reglas de custodia y procedimiento convencional de enajenación extrajudicial en caso de incumplimiento.',
    requiredFields: ['Fideicomitente', 'Fiduciario (Institución de Crédito)', 'Fideicomisario', 'Bienes o derechos aportados en garantía', 'Obligación principal garantizada', 'Procedimiento de ejecución extrajudicial'],
    output: 'Borrador formal de contrato de fideicomiso irrevocable de garantía.',
    intentGroup: 'Cobrar / Garantizar',
  },
  {
    id: 'mercantil-poder-dominio',
    title: 'Poder General para Pleitos, Cobranzas, Administración y Dominio',
    description: 'Instrumento de poder general amplísimo conforme al Código Civil Federal y facultades cambiarias bajo la LGTOC.',
    prompt: 'Instrumento formal de poder general para pleitos y cobranzas, actos de administración y actos de riguroso dominio conforme al artículo 2554 del Código Civil Federal, con inclusión expresa de facultades cambiarias para emitir, endosar y avalar títulos de crédito conforme al artículo 9º de la LGTOC, con estipulación de limitaciones o condiciones de ejercicio.',
    requiredFields: ['Poderdante (sociedad o persona física)', 'Apoderado designado', 'Facultades conferidas (pleitos, administración, dominio y cambiarias)', 'Limitaciones expresas (si aplican)', 'Carácter mancomunado o solidario', 'Vigencia'],
    output: 'Instrumento de poder general amplio con facultades de dominio y cambiarias.',
    intentGroup: 'Constituir / Gobernar sociedad',
  },
  {
    id: 'mercantil-compraventa-bienes',
    title: 'Compraventa Mercantil con Reserva de Dominio',
    description: 'Compraventa mercantil de bienes con entrega, vicios ocultos, garantía de saneamiento y reserva de dominio hasta pago total.',
    prompt: 'Contrato de compraventa mercantil de bienes conforme a los artículos 75 y 371 del Código de Comercio y 2312 del Código Civil Federal, con especificación técnica de mercancías, precio total, calendario de pagos, entrega material, cláusula expresa de reserva de dominio, plazo para reclamar vicios ocultos y pena convencional por incumplimiento.',
    requiredFields: ['Vendedor', 'Comprador', 'Descripción detallada de bienes', 'Precio y condiciones de pago', 'Lugar y plazo de entrega', 'Pacto de reserva de dominio', 'Plazo de garantía por vicios ocultos'],
    output: 'Contrato de compraventa mercantil de bienes con pacto de reserva de dominio y garantías.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'mercantil-distribucion-comercial',
    title: 'Distribución Comercial',
    description: 'Contrato de distribución comercial con exclusividad territorial, procedimiento de pedidos, políticas de marca y no subordinación.',
    prompt: 'Contrato de distribución comercial conforme a los artículos 75 y 78 del Código de Comercio, con delimitación de productos, territorio asignado, régimen de exclusividad, procedimiento de colocación de pedidos y entregas, condiciones de precios y pago, obligaciones de promoción y stock, propiedad industrial y deslinde de subordinación laboral.',
    requiredFields: ['Proveedor / Fabricante', 'Distribuidor', 'Productos objeto de distribución', 'Territorio asignado', 'Régimen de exclusividad', 'Precios y condiciones de pago', 'Vigencia'],
    output: 'Contrato formal de distribución comercial con cláusulas operativas y de exclusividad.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'mercantil-comision-mercantil',
    title: 'Comisión Mercantil',
    description: 'Contrato de comisión mercantil con cálculo de comisiones, territorio, rendición de cuentas y blindaje de no subordinación laboral.',
    prompt: 'Contrato de comisión mercantil conforme a los artículos 75 y 273 del Código de Comercio, estipulando actos de comercio encomendados, actuación en nombre propio o del comitente, territorio, porcentaje de comisión sobre ventas cobradas, calendario de rendición de cuentas, gastos y expresa prohibición de subordinación laboral conforme a la LFT.',
    requiredFields: ['Comitente', 'Comisionista', 'Operaciones y actos encomendados', 'Territorio asignado', 'Porcentaje o base de cálculo de comisiones', 'Plazos de rendición de cuentas', 'Condiciones de pago'],
    output: 'Contrato formal de comisión mercantil con cláusulas de rendición de cuentas y no subordinación.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'mercantil-suministro',
    title: 'Suministro Mercantil',
    description: 'Contrato de suministro de bienes o materias primas con entregas periódicas, SLA, revisión de precios y penas convencionales.',
    prompt: 'Contrato de suministro mercantil continuo y periódico conforme al Código de Comercio y Código Civil Federal, con especificación de bienes o insumos, niveles de servicio (SLA), procedimiento de órdenes de compra, fórmula de revisión de precios, control de calidad, pena convencional por retraso en entrega y pactos de exclusividad.',
    requiredFields: ['Proveedor / Suministrador', 'Cliente / Suministrado', 'Bienes o insumos suministrados', 'Precio base y fórmula de ajuste', 'Calendario o frecuencia de entregas', 'Penas convencionales por mora', 'Vigencia'],
    output: 'Contrato formal de suministro mercantil con cláusulas de SLA y penalizaciones.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'mercantil-franquicia-licencia',
    title: 'Franquicia y Licencia de Marca',
    description: 'Contrato de franquicia y licencia de uso de marca conforme a la LFPPI con manuales operativos, regalías y fondo de publicidad.',
    prompt: 'Contrato de franquicia conforme a los artículos 245 a 251 de la Ley Federal de Protección a la Propiedad Industrial (LFPPI), con entrega previa de Circular de Oferta de Franquicia (COF), licencia no exclusiva de marcas registradas ante el IMPI, transmisión de know-how mediante manuales de operación, cuota inicial de franquicia, regalías periódicas (royalties), aportación a fondo de publicidad e inspección de calidad.',
    requiredFields: ['Franquiciante / Titular de la marca', 'Franquiciatario', 'Marcas registradas y registros IMPI', 'Territorio exclusivo autorizado', 'Cuota inicial y porcentaje de regalías', 'Manuales y estándares operativos', 'Vigencia'],
    output: 'Contrato formal de franquicia y licencia de marca bajo la LFPPI.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'mercantil-cesion-propiedad-intelectual',
    title: 'Cesión de Derechos Patrimoniales e Intangibles',
    description: 'Cesión de derechos patrimoniales sobre código de software, marcas, diseños o derechos de autor a favor de la empresa.',
    prompt: 'Contrato de cesión de derechos patrimoniales y de propiedad intelectual conforme a la LFDA y LFPPI, para la transmisión definitiva de derechos sobre código de software, marcas, diseños o derechos de autor, con estipulación de contraprestación, garantías de titularidad y saneamiento para el caso de evicción, respeto a derechos morales y formalidades de registro ante INDAUTOR/IMPI.',
    requiredFields: ['Cedente', 'Cesionario', 'Bienes intelectuales cedidos (código, marca, diseño u obra)', 'Precio o contraprestación', 'Garantía de titularidad y saneamiento', 'Jurisdicción'],
    output: 'Contrato definitivo de cesión de derechos patrimoniales y de propiedad intelectual.',
    intentGroup: 'Proteger información',
  },
  {
    id: 'mercantil-reconocimiento-adeudo',
    title: 'Reconocimiento de Adeudo y Plan de Pagos',
    description: 'Convenio con reconocimiento formal de deuda líquida, calendario de pagos, intereses moratorios y sumisión a vía ejecutiva mercantil.',
    prompt: 'Convenio de reconocimiento de adeudo y compromiso de pago en parcialidades conforme al Código de Comercio y Código Civil Federal, con determinación de saldo líquido y origen de la deuda, calendario detallado de parcialidades, intereses moratorios, cláusula de vencimiento anticipado por impago y sumisión expresa a tribunales competentes para vía ejecutiva mercantil.',
    requiredFields: ['Acreedor', 'Deudor', 'Monto total reconocido y origen de la deuda', 'Calendario de parcialidades y fechas límite', 'Tasa de interés moratorio', 'Causas de vencimiento anticipado'],
    output: 'Convenio formal de reconocimiento de adeudo con fuerza ejecutiva y plan de pagos.',
    intentGroup: 'Cobrar / Garantizar',
  },
  {
    id: 'mercantil-adenda',
    title: 'Convenio Modificatorio (Adenda Universal)',
    description: 'Convenio modificatorio universal para prorrogar plazos, ajustar montos, modificar entregables o ratificar garantías de contratos vigentes.',
    prompt: 'Convenio modificatorio (adenda universal) para contratos vigentes conforme al Código de Comercio y Código Civil Federal, con estipulación de prórrogas de plazo, ajuste de montos y contraprestaciones, modificación de entregables o especificaciones, subsistencia de cláusulas no modificadas y ratificación expresa de garantías.',
    requiredFields: ['Contrato original y fecha', 'Partes firmantes', 'Cláusulas objeto de modificación (plazos, montos o entregables)', 'Nueva redacción y efectos', 'Ratificación de garantías'],
    output: 'Convenio modificatorio estructurado listo para firmas.',
    intentGroup: 'Corregir / Blindar',
  },
  {
    id: 'mercantil-clausula-penalizacion',
    title: 'Cláusula Modelo de Penalización Convencional',
    description: 'Cláusula de pena convencional líquida ante incumplimientos de obligaciones contractuales o moras.',
    prompt: 'Cláusula modelo de pena convencional y liquidación anticipada de daños conforme a los artículos 1840 a 1845 del Código Civil Federal y 376 del Código de Comercio, con cuantificación porcentual o fija, límite legal no superior a la obligación principal, notificación previa y exigibilidad ejecutiva inmediata sin necesidad de declaración judicial previa.',
    requiredFields: ['Supuestos específicos de incumplimiento', 'Monto fijo o porcentaje de pena diaria/mensual', 'Tope máximo de acumulación legal', 'Mecanismo y plazo formal de notificación'],
    output: 'Cláusula modelo de penalización convencional con blindaje de proporcionalidad.',
    intentGroup: 'Corregir / Blindar',
  },
  {
    id: 'mercantil-clausula-jurisdiccion',
    title: 'Cláusula Modelo de Jurisdicción y Arbitraje',
    description: 'Cláusula de ley aplicable, fuero judicial expreso y opción de arbitraje comercial (CAM/CANACO).',
    prompt: 'Cláusula modelo de ley aplicable y solución de controversias mercantiles conforme al Código de Comercio y Código Federal de Procedimientos Civiles, con sometimiento expreso a la jurisdicción de tribunales federales o del fuero común de una sede determinada, renuncia expresa a cualquier otro fuero por domicilio presente o futuro, y cláusula arbitral alternativa bajo el reglamento de la CAM o CANACO.',
    requiredFields: ['Sede y tribunales competentes (Ciudad / Estado)', 'Legislación mercantil federal aplicable', 'Renuncia expresa de fueros', 'Opción de cláusula arbitral (opcional)'],
    output: 'Cláusula modelo de jurisdicción y solución de controversias con sumisión expresa.',
    intentGroup: 'Corregir / Blindar',
  },
  {
    id: 'mercantil-nda-bilateral',
    title: 'Convenio Bilateral de Confidencialidad (NDA Bilateral)',
    description: 'Protección de secretos industriales, know-how y datos estratégicos bajo la LFPPI con pena convencional por divulgación.',
    prompt: 'Convenio bilateral de confidencialidad y protección de secretos industriales conforme a los artículos 163 a 169 de la Ley Federal de Protección a la Propiedad Industrial (LFPPI), con definición exhaustiva de información confidencial técnica, financiera y societaria, deberes de no divulgación y no uso ajeno, excepciones estándar (dominio público, orden judicial), vigencia post-contractual y pena convencional por divulgación ilícita.',
    requiredFields: ['Parte Reveladora / Receptora A', 'Parte Reveladora / Receptora B', 'Definición de Información Confidencial y Secreto Industrial', 'Finalidad autorizada del intercambio', 'Plazo de confidencialidad', 'Pena convencional por violación'],
    output: 'Convenio formal de confidencialidad y secreto industrial bilateral bajo la LFPPI.',
    intentGroup: 'Proteger información',
  },
  {
    id: 'mercantil-cesion-derechos',
    title: 'Cesión de Derechos de Crédito y Cobro',
    description: 'Transmisión formal y onerosa de derechos de crédito mercantil con notificación al deudor cedido.',
    prompt: 'Contrato de cesión de derechos de crédito y cobro mercantil conforme a los artículos 389 a 391 del Código de Comercio y 2029 del Código Civil Federal, con determinación de la existencia y legitimidad del crédito cedido (facturas o títulos), precio de cesión, garantías de cobro y modelo formal anexo de notificación notarial o extrajudicial al deudor cedido.',
    requiredFields: ['Cedente', 'Cesionario', 'Deudor cedido', 'Crédito, facturas o títulos objeto de cesión', 'Precio y condiciones de pago de la cesión', 'Mecanismo de notificación al deudor'],
    output: 'Contrato formal de cesión de créditos mercantiles con modelo de notificación anexo.',
    intentGroup: 'Cobrar / Garantizar',
  },
];

// ── Laboral Drafting Templates ────────────────────────────
export const LABORAL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'laboral-contrato-individual',
    title: 'Contrato Individual de Trabajo por Tiempo Indeterminado',
    description: 'Contrato de trabajo bajo la LFT con periodo de prueba, jornada, salario, vacaciones dignas reformadas y aguinaldo.',
    prompt: 'Contrato individual de trabajo por tiempo indeterminado conforme a los artículos 20, 24, 25, 39-A (periodo de prueba optativo improrrogable), 58 a 68 (jornada diurna/nocturna/mixta), 76 (vacaciones dignas reformadas), 87 (aguinaldo) y 134 de la Ley Federal del Trabajo, estipulando puesto, funciones, salario diario integrado, periodicidad de pago, retenciones IMSS/ISR, centro de trabajo, capacitación y secreto profesional.',
    requiredFields: ['Patrón / Razón Social', 'Persona trabajadora (CURP, RFC, NSS)', 'Puesto y funciones detalladas', 'Modalidad (periodo de prueba o tiempo indeterminado)', 'Tipo de jornada y horario', 'Salario cuota diaria y forma de pago', 'Prestaciones de ley (vacaciones, aguinaldo, prima vacacional)', 'Centro de trabajo'],
    output: 'Contrato individual de trabajo formal bajo la legislación laboral mexicana vigente.',
    intentGroup: 'Contratar personal',
  },
  {
    id: 'laboral-teletrabajo',
    title: 'Convenio de Teletrabajo (Home Office NOM-037)',
    description: 'Convenio modificatorio de teletrabajo bajo la LFT y NOM-037-STPS-2023 con subsidio de servicios y derecho a desconexión.',
    prompt: 'Convenio modificatorio de condiciones de trabajo para la modalidad de teletrabajo conforme a los artículos 330-A a 330-K de la Ley Federal del Trabajo y la NOM-037-STPS-2023, estipulando el domicilio remoto autorizado, entrega de equipo ergonómico y de cómputo en comodato, pago compensatorio mensual proporcional por servicios de electricidad e internet (Art. 330-E fracc. III), estricto derecho a la desconexión digital al término de la jornada (Art. 330-E fracc. VI), y pacto de reversibilidad a modalidad presencial (Art. 330-G).',
    requiredFields: ['Patrón', 'Persona trabajadora', 'Contrato laboral base y fecha', 'Domicilio del lugar de teletrabajo', 'Inventario de equipo y herramientas asignadas', 'Monto de compensación de luz e internet', 'Horario de jornada y horario de desconexión digital'],
    output: 'Convenio formal de teletrabajo en estricto apego a la LFT y NOM-037-STPS-2023.',
    intentGroup: 'Regular modalidad',
  },
  {
    id: 'laboral-confidencialidad',
    title: 'Acuerdo de Confidencialidad y Secreto Laboral',
    description: 'Compromiso de reserva y custodia de secretos técnicos, comerciales y de clientes conforme a la LFT y LFPPI.',
    prompt: 'Acuerdo de confidencialidad y protección de secretos laborales conforme a los artículos 134 fracción XIII de la Ley Federal del Trabajo y 163 a 169 de la LFPPI, estipulando la obligación de no divulgación de información reservada, fórmulas, código fuente, costos y bases de datos de clientes, con vigencia subsistente durante y después de la relación laboral y consecuencias civiles, laborales y penales.',
    requiredFields: ['Patrón / Empresa', 'Persona trabajadora', 'Definición de secretos y datos confidenciales', 'Duración de la obligación post-laboral', 'Consecuencias por revelación ilícita'],
    output: 'Acuerdo formal de confidencialidad y protección de secretos laborales.',
    intentGroup: 'Proteger información',
  },
  {
    id: 'laboral-confidencialidad-no-competencia',
    title: 'Pacto de No Competencia y Confidencialidad Laboral',
    description: 'Convenio de no competencia post-laboral y no captación de clientes con contraprestación económica obligatoria.',
    prompt: 'Convenio de confidencialidad, no competencia y no captación (non-solicitation) post-laboral conforme al artículo 134 de la LFT, LFPPI y los principios de proporcionalidad del artículo 5º Constitucional, estipulando territorio geográfico limitado, plazo temporal estricto (máximo 1 año), asignación de una contraprestación económica compensatoria periódica obligatoria a favor del trabajador, prohibición de inducción de personal/clientes y pena convencional.',
    requiredFields: ['Empresa / Patrón', 'Persona trabajadora y puesto clave', 'Territorio específico de restricción', 'Plazo de no competencia post-laboral (máximo 12 meses)', 'Monto mensual de contraprestación económica obligatoria', 'Pena convencional'],
    output: 'Convenio formal de no competencia laboral con plena validez constitucional y contraprestación.',
    intentGroup: 'Proteger información',
  },
  {
    id: 'laboral-convenio-terminacion',
    title: 'Convenio de Finiquito y Terminación Laboral',
    description: 'Convenio de terminación por mutuo consentimiento con desglose de liquidación y no adeudo bajo los Arts. 33 y 53 LFT.',
    prompt: 'Convenio formal de terminación de la relación de trabajo por mutuo consentimiento y finiquito conforme a los artículos 33, 53 fracción I y 87 de la Ley Federal del Trabajo, conteniendo tabla circunstanciada de conceptos liquidados (días laborados, vacaciones proporcionales, prima vacacional, aguinaldo proporcional, prima de antigüedad en su caso), manifestación expresa de no adeudo recíproco, no existencia de riesgos de trabajo y estipulación de ratificación ante el Centro de Conciliación Laboral.',
    requiredFields: ['Patrón', 'Persona trabajadora', 'Fecha de ingreso y fecha de terminación', 'Salario base de liquidación', 'Desglose detallado de conceptos liquidados (números y letras)', 'Constancia de entrega de finiquito y constancia patronal'],
    output: 'Convenio formal de terminación laboral y finiquito con tabla de liquidación.',
    intentGroup: 'Cerrar relación',
  },
  {
    id: 'laboral-acta-administrativa',
    title: 'Acta Administrativa de Hechos e Investigación Laboral',
    description: 'Acta circunstanciada conforme al Art. 47 LFT con comparecencia patronal, dos testigos y garantía de audiencia.',
    prompt: 'Acta administrativa circunstanciada de investigación de faltas laborales conforme al artículo 47 de la Ley Federal del Trabajo, haciendo constar lugar, fecha y hora de levantamiento, comparecencia de la representación patronal, dos testigos de cargo/asistencia, relación pormenorizada de hechos y evidencias (inasistencias, desobediencia o indisciplina), otorgamiento formal de garantía de audiencia y descargos al trabajador, y razón circunstanciada en caso de negativa a firmar.',
    requiredFields: ['Razón social del patrón', 'Trabajador sujeto a investigación', 'Fecha, hora y lugar del levantamiento', 'Relación circunstanciada de los hechos imputados', 'Nombre y declaración de 2 testigos', 'Manifestación y descargos del trabajador'],
    output: 'Acta administrativa formal de hechos laborales lista para firma o constancia de negativa.',
    intentGroup: 'Disciplina y cumplimiento',
  },
  {
    id: 'laboral-politica-prevencion-acoso',
    title: 'Protocolo de Prevención de Acoso y Factores de Riesgo (NOM-035)',
    description: 'Protocolo corporativo obligatorio contra violencia laboral, discriminación y factores psicosociales bajo la NOM-035-STPS-2018.',
    prompt: 'Protocolo institucional y política corporativa para la prevención de factores de riesgo psicosocial, prevención de violencia laboral, hostigamiento sexual y no discriminación en el centro de trabajo, en estricto cumplimiento de la NOM-035-STPS-2018 y el artículo 132 fracción XXXI Bis de la LFT, estableciendo principios rectores, buzón de denuncia confidencial, Comité de Ética y Atención, protocolo de investigación confidencial y política de cero represalias.',
    requiredFields: ['Razón social y centros de trabajo', 'Integrantes del Comité de Ética y Atención', 'Canal o buzón confidencial de denuncia', 'Procedimiento de investigación y medidas de protección'],
    output: 'Protocolo normativo institucional de cumplimiento NOM-035 y prevención de violencia laboral.',
    intentGroup: 'Disciplina y cumplimiento',
  },
];

// ── Comercio Exterior Drafting Templates ──────────────────
export const COMERCIO_EXTERIOR_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'comercio_exterior-compraventa-internacional',
    title: 'Compraventa Internacional de Mercancías (CISG / Incoterms® 2020)',
    description: 'Contrato bajo Convención de Viena (CISG), Incoterms 2020, pago internacional, inspección y arbitraje comercial.',
    prompt: 'Contrato formal de compraventa internacional de mercancías conforme a la Convención de las Naciones Unidas sobre los Contratos de Compraventa Internacional de Mercaderías (CISG) e Incoterms® 2020 de la CCI, con especificaciones de producto, fracción arancelaria tentativa, puerto o punto de entrega convenido, distribución de costos y riesgos aduaneros, forma de pago internacional (carta de crédito irrevocable y confirmada o SWIFT), inspección previa de calidad, póliza de seguro de transporte y cláusula de solución de controversias mediante arbitraje de la Cámara de Comercio Internacional (CCI).',
    requiredFields: ['Vendedor / Exportador (País)', 'Comprador / Importador (País)', 'Descripción y especificaciones de las mercancías', 'Regla Incoterms® 2020 aplicable (FOB, CIF, DAP, DDP, etc.)', 'Puerto o lugar convenido de entrega', 'Precio unitario, total y moneda (USD/EUR)', 'Forma y medios de pago internacional', 'Documentos de embarque y aduaneros exigidos'],
    output: 'Contrato formal de compraventa internacional con cláusulas CISG e Incoterms 2020.',
    intentGroup: 'Importar / Exportar',
  },
  {
    id: 'comercio_exterior-distribucion-internacional',
    title: 'Distribución Internacional de Productos',
    description: 'Acuerdo de distribución internacional bajo Principios UNIDROIT con territorio, cuotas mínimas anuales y propiedad industrial.',
    prompt: 'Contrato de distribución comercial internacional conforme a los Principios UNIDROIT sobre Contratos Comerciales Internacionales y Reglas Incoterms® 2020, estipulando delimitación de territorio extranjero o nacional asignado, régimen de exclusividad, cuotas mínimas anuales de compra (minimum purchase targets), colocación de pedidos, cumplimiento de normativas de etiquetado y registros sanitarios locales, protección de marcas y arbitraje internacional.',
    requiredFields: ['Principal / Fabricante (País)', 'Distribuidor exclusivo / no exclusivo (País)', 'Productos y marcas objeto de distribución', 'Territorio geográfico asignado', 'Volumen o cuota mínima anual de compra', 'Condiciones de suministro e Incoterm 2020', 'Vigencia'],
    output: 'Contrato formal de distribución comercial internacional con cláusulas UNIDROIT.',
    intentGroup: 'Distribuir mercancías',
  },
  {
    id: 'comercio_exterior-aviso-privacidad',
    title: 'Aviso de Privacidad (Comercio Exterior y Aduanas)',
    description: 'Aviso de privacidad conforme a la LFPDPPP para operaciones aduaneras, despacho, logística internacional y fiscalización.',
    prompt: 'Aviso de Privacidad integral para operaciones de comercio exterior, despacho aduanero y logística internacional conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), con detalle del responsable del tratamiento, finalidades primarias (despacho aduanero, elaboración de pedimentos, trámites ante SAT y ANAM, logística y facturación), transferencias a autoridades aduaneras y prestadores de servicios, y procedimiento para el ejercicio de derechos ARCO.',
    requiredFields: ['Responsable / Razón Social', 'Domicilio fiscal y correo electrónico de contacto', 'Finalidades primarias y secundarias del tratamiento', 'Categorías de datos recabados (personales, fiscales y aduaneros)', 'Transferencias previstas a autoridades y auxiliares', 'Procedimiento para Derechos ARCO'],
    output: 'Aviso de privacidad estructurado para operaciones de comercio exterior y aduanas.',
    intentGroup: 'Preparar operación',
  },
  {
    id: 'comercio_exterior-poder-especial-aduanero',
    title: 'Poder Especial para Comercio Exterior y Despacho Aduanero',
    description: 'Poder especial para representación en trámites aduanales, despachos de importación/exportación, pedimentos y permisos ante SAT/ANAM.',
    prompt: 'Poder especial para actos de comercio exterior y aduaneros conforme al Código Civil Federal, Ley Aduanera y Código Fiscal de la Federación, con facultades expresas para realizar despachos de importación y exportación, tramitar pedimentos ante la ANAM y el SAT, contratar agentes aduanales autorizados, gestionar avisos automáticos y permisos ante la Secretaría de Economía, y efectuar pagos de contribuciones aduaneras, con delimitación de limitaciones expresas.',
    requiredFields: ['Poderdante (Empresa / Representante Legal)', 'Apoderado designado', 'Facultades aduaneras conferidas (despacho, pedimentos, permisos)', 'Autoridades aduaneras y fiscales competentes (SAT, ANAM)', 'Limitaciones expresas', 'Vigencia'],
    output: 'Poder especial formal para representación en comercio exterior y trámites aduanales.',
    intentGroup: 'Coordinar despacho',
  },
  {
    id: 'comercio_exterior-checklist-importacion',
    title: 'Checklist Operativo y Matriz Documental de Importación Definitiva',
    description: 'Matriz de control documental y regulatorio previo al despacho bajo los Arts. 36, 36-A y 59 de la Ley Aduanera.',
    prompt: 'Checklist operativo y matriz documental de validación previa al despacho aduanero para importación definitiva (Clave A1) conforme a los artículos 36, 36-A y 59 de la Ley Aduanera, verificando factura comercial, packing list, conocimiento de embarque (BL) o guía aérea, certificado de origen para preferencias arancelarias (T-MEC, TLCUEM, etc.), cumplimiento de Regulaciones y Restricciones No Arancelarias (RRNA), hojas de seguridad (MSDS en químicos) y comprobación de pago del pedimento.',
    requiredFields: ['Empresa importadora y RFC con Padrón activo', 'Proveedor extranjero y país de procedencia', 'Descripción técnica de mercancía y fracción arancelaria', 'Regla Incoterms® 2020 convenida', 'Aduana de despacho y patente de agente aduanal', 'Régimen aduanero solicitado'],
    output: 'Matriz documental de control y validación de importación aduanera.',
    intentGroup: 'Preparar operación',
  },
  {
    id: 'comercio_exterior-carta-instrucciones',
    title: 'Carta Formal de Instrucciones al Agente Aduanal',
    description: 'Carta de encomienda e instrucciones operativas para despacho aduanero conforme al Art. 59 de la Ley Aduanera.',
    prompt: 'Carta formal de encomienda e instrucciones al Agente Aduanal conforme al artículo 59 fracción III de la Ley Aduanera, detallando datos del importador/exportador, número de patente aduanal, aduana y sección aduanera, descripción arancelaria de las mercancías, valor comercial y valor en aduana, desglose de gastos incrementables (fletes, seguros), régimen aduanero solicitado, documentos soporte digitalizados anexos y contacto operativo responsable.',
    requiredFields: ['Importador / Exportador y RFC', 'Agente Aduanal y Patente', 'Aduana de entrada / salida', 'Régimen aduanero solicitado (A1, IN, etc.)', 'Descripción de mercancías y fracción arancelaria', 'Valor comercial, moneda e Incoterm', 'Gastos incrementables (flete, seguro)', 'Relación de documentos anexos'],
    output: 'Carta formal de instrucciones aduaneras para revisión y firma de la empresa.',
    intentGroup: 'Coordinar despacho',
  },
  {
    id: 'comercio_exterior-contrato-flete-internacional',
    title: 'Contrato de Transporte Internacional y Logística (Freight Forwarder)',
    description: 'Contrato de servicios logísticos y transporte internacional de carga con delimitación de demoras, seguros y responsabilidades.',
    prompt: 'Contrato de prestación de servicios logísticos, transporte internacional de carga y agente de carga (Freight Forwarder), estipulando rutas de origen y destino, modalidades de transporte (marítimo, aéreo, terrestre multimodal), tarifas y gastos locales, régimen de demoras y detenciones de contenedores (demurrage & detention), póliza de seguro de transporte de mercancías, límites de responsabilidad y jurisdicción.',
    requiredFields: ['Usuario / Embarcador (Shipper)', 'Freight Forwarder / Agente de Carga', 'Ruta (origen, puerto de embarque, puerto de arribo, destino final)', 'Modalidad de transporte y condiciones de servicio', 'Tarifas de flete, recargos y demoras', 'Póliza de seguro y cobertura', 'Límites de responsabilidad'],
    output: 'Contrato formal de servicios logísticos y transporte internacional de carga.',
    intentGroup: 'Coordinar despacho',
  },
];

// ── Aduanal Drafting Templates ────────────────────────────
export const ADUANAL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'aduanal-prestacion-servicios-agente-aduanal',
    title: 'Prestación de Servicios de Agente Aduanal y Carta Encomienda',
    description: 'Contrato de servicios aduanales y carta encomienda bajo los Arts. 35, 36, 40, 59 y 159 de la Ley Aduanera.',
    prompt: 'Contrato formal de prestación de servicios profesionales de agente aduanal y carta encomienda conforme a los artículos 35, 36, 40, 59 fracción III, 159, 160 y 162 de la Ley Aduanera, con designación expresa de número de patente aduanal y aduanas de adscripción/autorizadas, facultades para despacho de importación y exportación, clasificación arancelaria y determinación de contribuciones, honorarios y gastos complementarios de maniobras, provisión de fondos y cuenta de anticipos, y delimitación de responsabilidades de ambas partes.',
    requiredFields: ['Agente Aduanal y Número de Patente Aduanal', 'Cliente / Importador / Exportador y RFC', 'Aduana de despacho y aduanas autorizadas', 'Descripción general de operaciones y mercancías', 'Honorarios, tarifas de maniobras y cuenta de anticipo', 'Obligaciones y delimitación de responsabilidad'],
    output: 'Contrato formal de servicios aduanales con carta encomienda para trámites de comercio exterior.',
    intentGroup: 'Atender autoridad',
  },
  {
    id: 'aduanal-poder-especial-aduanas',
    title: 'Poder Especial para Representación y Despacho Aduanal',
    description: 'Poder especial para trámites ante la ANAM/SAT, tramitación y firma de pedimentos y promociones aduanales.',
    prompt: 'Poder especial para actos aduaneros y representación legal ante la Agencia Nacional de Aduanas de México (ANAM) y el Servicio de Administración Tributaria (SAT), confiriendo facultades expresas para realizar trámites de despacho aduanero, suscribir pedimentos, promover rectificaciones, conferir encargos a agentes aduanales, tramitar permisos y certificados de importación/exportación y formular promociones con delimitación expresa de límites.',
    requiredFields: ['Poderdante (Empresa / Importador)', 'Apoderado designado', 'Aduanas y patentes de actuación', 'Facultades aduaneras conferidas (despacho, pedimentos, promociones)', 'Autoridades aduaneras competentes (ANAM, SAT)', 'Limitaciones expresas'],
    output: 'Instrumento de poder especial para representación aduanal y gestión de pedimentos.',
    intentGroup: 'Atender autoridad',
  },
  {
    id: 'aduanal-aviso-privacidad',
    title: 'Aviso de Privacidad (Agencia Aduanal)',
    description: 'Aviso de privacidad conforme a la LFPDPPP para agencias aduanales, clientes, operadores y trámites fiscales/aduanales.',
    prompt: 'Aviso de Privacidad integral para agencia aduanal conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), detallando finalidades primarias (elaboración de pedimentos, despacho aduanero, facturación y archivo digital aduanero), datos patrimoniales y fiscales tratados, transferencias a autoridades (SAT, ANAM) y procedimiento para ejercicio de derechos ARCO.',
    requiredFields: ['Razón Social de la Agencia Aduanal', 'Domicilio fiscal y correo de atención ARCO', 'Finalidades primarias del tratamiento aduanero', 'Datos personales, fiscales y patrimoniales recabados', 'Transferencias legales previstas', 'Medidas de seguridad y plazos de conservación'],
    output: 'Aviso de privacidad integral para agencias y trámites aduanales.',
    intentGroup: 'Integrar expediente',
  },
  {
    id: 'aduanal-expediente-pedimento',
    title: 'Índice y Control de Integración del Expediente Digital de Pedimento',
    description: 'Matriz de control y custodia del expediente digital aduanero por 5 años bajo el Art. 59 de la Ley Aduanera y Art. 30 CFF.',
    prompt: 'Índice y protocolo de control para la integración y custodia del expediente digital aduanero de pedimento conforme al artículo 59 fracción V de la Ley Aduanera, artículo 81 del Reglamento de la Ley Aduanera y artículo 30 del Código Fiscal de la Federación (conservación por 5 años), clasificando documentos comerciales, de transporte, valor en aduana, regulaciones no arancelarias, comprobantes de pago de contribuciones y validación de semáforo fiscal.',
    requiredFields: ['Número de Pedimento (15 dígitos)', 'Clave de Régimen y Tipo de Operación (A1, IN, etc.)', 'Aduana y Sección Aduanera', 'Importador / Exportador y RFC', 'Relación de documentos digitalizados disponibles', 'Estatus de validación y responsable de custodia'],
    output: 'Índice y matriz de integración digital del expediente aduanero con control de faltantes.',
    intentGroup: 'Integrar expediente',
  },
  {
    id: 'aduanal-manifestacion-valor',
    title: 'Manifestación de Valor en Aduana y Soporte Documental',
    description: 'Manifestación de valor bajo los Arts. 59 fracc. III y 64 a 78 de la Ley Aduanera con desglose de incrementables.',
    prompt: 'Borrador estructurado de manifestación de valor en aduana y expediente de soporte documental conforme a los artículos 59 fracción III, 64 a 78 de la Ley Aduanera, artículos 110 a 112 del Reglamento de la Ley Aduanera y Anexo 22 de las RGCE, declarando método de valoración (Valor de Transacción u otros), relación comercial o vinculación que afecte el precio, desglose de precio pagado o por pagar, desglose de gastos incrementables (fletes, seguros, embalajes, comisiones) y no incrementables.',
    requiredFields: ['Importador y RFC', 'Proveedor / Vendedor en el extranjero', 'Método de valoración aduanera aplicado', 'Precio pagado o por pagar (factura y moneda)', 'Desglose de gastos incrementables (flete, seguro, embalaje)', 'Existencia de vinculación entre las partes', 'Documentos soporte adjuntos'],
    output: 'Borrador técnico de manifestación de valor en aduana y cédula de soporte de incrementables.',
    intentGroup: 'Soportar valor',
  },
  {
    id: 'aduanal-rectificacion-pedimento',
    title: 'Solicitud y Dictamen de Rectificación de Pedimento (Clave R1)',
    description: 'Escrito técnico y justificación de rectificación de pedimento bajo el Art. 89 de la Ley Aduanera y Anexo 22 RGCE.',
    prompt: 'Solicitud técnica y memorándum de rectificación de pedimento con clave R1 conforme al artículo 89 de la Ley Aduanera y Reglas Generales de Comercio Exterior, identificando número y fecha del pedimento original, patente y aduana, descripción del campo o dato inexacto, dato correcto que debe asentarse, causa y justificación técnica del error, documentación soporte probatoria y acreditación de no encontrarse bajo facultades de comprobación.',
    requiredFields: ['Pedimento original y fecha de pago', 'Patente aduanal y aduana de despacho', 'Campo o bloque específico a rectificar', 'Dato original declarado vs. Dato correcto a asentar', 'Causa o justificación técnica del error', 'Documentos probatorios de soporte'],
    output: 'Escrito técnico de solicitud y fundamentación de rectificación de pedimento Clave R1.',
    intentGroup: 'Corregir operación',
  },
  {
    id: 'aduanal-respuesta-requerimiento',
    title: 'Contestación a Requerimiento e Incidencias Aduanales (PAMA)',
    description: 'Escrito formal de contestación y ofrecimiento de pruebas ante inicio de PAMA o incidencias bajo los Arts. 150-155 Ley Aduanera.',
    prompt: 'Escrito libre formal de contestación a acta de inicio del Procedimiento Administrativo en Materia Aduanera (PAMA) o acta de irregularidades aduaneras conforme a los artículos 150 a 155 de la Ley Aduanera y Código Fiscal de la Federación, desvirtuando irregularidades señaladas por la autoridad, formulando descargos punto por punto, ofreciendo pruebas documentales y periciales en derecho, y expresando puntos petitorios claros.',
    requiredFields: ['Autoridad aduanera destinataria (Aduana / ANAM / SAT)', 'Contribuyente / Importador y RFC', 'Número de acta de embargo / PAMA o folio de requerimiento', 'Contestación y descargos circunstanciados a cada irregularidad', 'Capítulo de pruebas documentales', 'Puntos petitorios'],
    output: 'Escrito formal de contestación y desahogo de pruebas en procedimiento aduanero.',
    intentGroup: 'Atender autoridad',
  },
  {
    id: 'aduanal-anexo-24-22-control',
    title: 'Protocolo de Auditoría y Control de Inventarios IMMEX (Anexos 24 y 22 RGCE)',
    description: 'Protocolo de control de inventarios automatizados IMMEX, plazos de retorno y descargos bajo los Arts. 59 y 108 de la Ley Aduanera.',
    prompt: 'Protocolo de auditoría preventiva interna y control del sistema automatizado de control de inventarios para empresas con Programa IMMEX conforme al artículo 59 fracción I y artículo 108 de la Ley Aduanera y Anexos 24 y 22 de las RGCE, estructurando matriz de verificación de entradas temporales (clave IN), descargos por exportación (clave H1/RT), mermas y desperdicios, saldos pendientes y control de plazos legales de permanencia de 18 meses.',
    requiredFields: ['Razón Social de la empresa IMMEX y número de programa', 'Período fiscal auditado', 'Materia prima e insumos importados temporalmente', 'Relación de pedimentos de importación temporal (IN) y retorno (H1)', 'Saldos vivos y cálculo de plazos de permanencia', 'Hallazgos y acciones preventivas'],
    output: 'Protocolo y cédula de auditoría de control de inventarios automatizados IMMEX Anexo 24.',
    intentGroup: 'Integrar expediente',
  },
];

// ── Fiscal y Patrimonial Legal Templates ──────────────────
export const FISCAL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'fiscal-prestacion-servicios',
    title: 'Prestación de Servicios Profesionales con Blindaje de Materialidad Fiscal',
    description: 'Contrato de servicios con soporte de materialidad, razón de negocios, entregables tangibles y CFDI 4.0 bajo los Arts. 5-A y 69-B CFF.',
    prompt: 'Contrato formal de prestación de servicios profesionales independientes con estricto blindaje de materialidad fiscal y razón de negocios conforme a los artículos 5-A y 69-B del Código Fiscal de la Federación, artículo 27 fracción I de la Ley del Impuesto sobre la Renta (LISR) y artículo 5 fracción I de la Ley del IVA (LIVA), estipulando delimitación técnica de entregables verificables y fechados, bitácoras de trabajo, emisión de CFDI 4.0 con clave SAT correcta, retenciones aplicables de ISR e IVA, deslinde de subordinación laboral y fecha cierta.',
    requiredFields: ['Prestador del Servicio y RFC', 'Cliente y RFC', 'Descripción detallada de servicios y entregables tangibles', 'Honorarios, IVA y retenciones aplicables', 'Forma de pago bancarizada (SPEI) y requisitos de CFDI 4.0', 'Calendario y mecanismo de comprobación de materialidad', 'Vigencia'],
    output: 'Contrato formal de prestación de servicios con cláusulas de materialidad fiscal y razón de negocios.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'fiscal-mutuo-interes',
    title: 'Contrato de Mutuo con Interés y Trazabilidad Bancaria',
    description: 'Préstamo dinerario con soporte de origen y destino de recursos, retenciones y pagaré anexo bajo el Art. 166 LISR.',
    prompt: 'Contrato de mutuo con interés y trazabilidad patrimonial conforme a los artículos 2384 del Código Civil Federal, 76 fracción XVI y 166 de la LISR y LFPIORPI, estipulando capital mutuado, transferencia bancaria verificable (SPEI / cheque nominativo), tasa de interés fija anual, retención del 20% de ISR sobre intereses devengados (en personas físicas), calendario de amortización, destino corporativo lícito de los fondos y pagaré ejecutivo anexo.',
    requiredFields: ['Mutuante / Prestamista y RFC', 'Mutuario / Prestatario y RFC', 'Monto prestado y comprobante de transferencia bancaria', 'Tasa de interés anual pactada', 'Plazo, calendario de pagos y cuenta bancaria', 'Retención fiscal de ISR sobre intereses', 'Garantía o pagaré anexo'],
    output: 'Contrato formal de mutuo con pagaré mercantil anexo y blindaje de trazabilidad financiera.',
    intentGroup: 'Garantizar / Cobrar',
  },
  {
    id: 'fiscal-reconocimiento-adeudo',
    title: 'Reconocimiento de Adeudo, Reestructuración y Plan de Pagos',
    description: 'Convenio de reestructuración de saldos con emisión de CFDI de pago y vencimiento anticipado bajo el Art. 27 LISR.',
    prompt: 'Convenio formal de reconocimiento de adeudo, reestructuración y compromiso de pago en parcialidades conforme al Código Fiscal de la Federación y artículo 27 fracción XV de la LISR, con liquidación de obligaciones comerciales preexistentes, emisión de CFDI con Complemento de Recepción de Pagos por cada abono, intereses moratorios, cláusula de aceleración o vencimiento anticipado por impago y sumisión expresa ejecutiva.',
    requiredFields: ['Acreedor y RFC', 'Deudor y RFC', 'Saldo total líquido reconocido y origen contractual/fiscal', 'Calendario detallado de parcialidades y montos', 'Tasa de interés moratorio', 'Causas de vencimiento anticipado'],
    output: 'Convenio formal de reconocimiento de adeudo con fuerza ejecutiva y plan de parcialidades.',
    intentGroup: 'Garantizar / Cobrar',
  },
  {
    id: 'fiscal-escrito-aclaracion',
    title: 'Escrito Libre de Aclaración y Solventación ante el SAT',
    description: 'Escrito formal para contestar cartas invitación, requerimientos o inconsistencias fiscales bajo los Arts. 18, 18-A y 33 CFF.',
    prompt: 'Escrito libre formal de aclaración y solventación tributaria dirigido a la Administración Desconcentrada del Servicio de Administración Tributaria (SAT) conforme a los artículos 18, 18-A y 33 fracción III del Código Fiscal de la Federación, desvirtuando presuntas omisiones o diferencias en ingresos, retenciones o deducciones señaladas en cartas invitación o requerimientos, con relación pormenorizada de hechos, capítulo de pruebas documentales (CFDI, pólizas, estados de cuenta bancarios) y puntos petitorios.',
    requiredFields: ['Autoridad recaudadora / Administrador Desconcentrado SAT', 'Contribuyente promovente, RFC y domicilio fiscal', 'Folio de carta invitación o número de requerimiento', 'Aclaración circunstanciada de diferencias o ingresos', 'Relación de pruebas documentales adjuntas', 'Puntos petitorios'],
    output: 'Escrito legal formal de aclaración tributaria con fundamentación y pruebas.',
    intentGroup: 'Contestar / Aclarar',
  },
  {
    id: 'fiscal-memo-analisis',
    title: 'Dictamen Técnico y Memorándum de Análisis Jurídico-Fiscal',
    description: 'Dictamen de auditoría y evaluación de riesgos tributarios, materialidad, deducibilidad y defense file.',
    prompt: 'Dictamen técnico y memorándum de análisis jurídico-fiscal para evaluar la viabilidad, riesgos de recalificación (Art. 5-A CFF), operaciones inexistentes (Art. 69-B CFF), deducibilidad en ISR y acreditamiento de IVA de una operación corporativa o contractual, analizando antecedentes, marco legal aplicable, matriz de riesgos identificados, conclusiones técnico-jurídicas y recomendaciones estratégicas de integración de expediente de defensa (defense file).',
    requiredFields: ['Empresa / Contribuyente analizado', 'Operación o contrato objeto de dictamen', 'Antecedentes fácticos y flujo financiero', 'Marco normativo federal aplicable (CFF, LISR, LIVA)', 'Conclusiones y matriz de riesgos fiscales', 'Recomendaciones de blindaje probatorio'],
    output: 'Dictamen jurídico-fiscal estructurado con antecedentes, análisis de fondo y recomendaciones preventivas.',
    intentGroup: 'Blindar / Dictaminar',
  },
  {
    id: 'fiscal-arrendamiento-inmueble',
    title: 'Arrendamiento de Inmueble Comercial con Cláusulas Fiscales',
    description: 'Arrendamiento comercial con retenciones de ISR e IVA, cuenta predial en CFDI y cláusula de extinción de dominio.',
    prompt: 'Contrato de arrendamiento de bien inmueble para uso comercial o corporativo conforme al Código Civil y Ley del Impuesto sobre la Renta (Art. 27 fracc. XVIII), estipulando renta mensual, desglose de IVA y retenciones de ISR e IVA cuando el arrendador sea persona física y el arrendatario persona moral, obligación de incluir el número de cuenta predial en el CFDI, depósito en garantía y cláusula blindada de deslinde bajo la Ley Nacional de Extinción de Dominio.',
    requiredFields: ['Arrendador y RFC', 'Arrendatario y RFC', 'Ubicación exacta del inmueble comercial', 'Renta mensual, IVA y retenciones aplicables', 'Número de cuenta predial para CFDI', 'Destino comercial autorizado', 'Depósito en garantía y fiador'],
    output: 'Contrato formal de arrendamiento comercial con cláusulas de cumplimiento fiscal y extinción de dominio.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'fiscal-comision-mercantil',
    title: 'Comisión Mercantil con Blindaje Fiscal y de Materialidad',
    description: 'Contrato de corretaje y comisión mercantil con comprobación mediante CFDI, entregables y no subordinación laboral.',
    prompt: 'Contrato de comisión mercantil conforme a los artículos 75 y 273 del Código de Comercio y artículo 27 de la LISR, estableciendo actos de comercio o corretaje encomendados, cálculo de comisión sobre ventas efectivamente cobradas, condición de pago contra entrega de CFDI con descripción detallada y reporte mensual de gestiones como soporte de materialidad, retenciones aplicables y deslinde de relación laboral.',
    requiredFields: ['Comitente y RFC', 'Comisionista y RFC', 'Operaciones y ventas encomendadas', 'Porcentaje de comisión y condición de devengo', 'Requisitos de comprobación fiscal (CFDI y reporte mensual)', 'Retenciones de ISR e IVA aplicables'],
    output: 'Contrato formal de comisión mercantil con soporte documental de materialidad y CFDI.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'fiscal-convenio-dacion',
    title: 'Convenio de Dación en Pago de Bienes para Extinción de Obligaciones',
    description: 'Dación en pago con avalúo comercial fiscal, efectos de enajenación y finiquito de deudas bajo los Arts. 14 CFF y 2095 CCF.',
    prompt: 'Convenio de dación en pago de bienes muebles o inmuebles para la extinción de obligaciones comerciales conforme al artículo 2095 del Código Civil Federal, artículo 14 fracción I del Código Fiscal de la Federación (efectos de enajenación fiscal) y artículo 1-B de la Ley del IVA, determinando saldo insoluto a extinguir, descripción y avalúo comercial fiscal de los bienes entregados, traslado de dominio, liberación de gravámenes y otorgamiento de finiquito mutuo total.',
    requiredFields: ['Acreedor y RFC', 'Deudor y RFC', 'Adeudo líquido original a extinguir', 'Descripción y avalúo pericial de bienes entregados en pago', 'Fecha y lugar de entrega material y jurídica', 'Finiquito y liberación total de obligaciones'],
    output: 'Convenio formal de dación en pago con avalúo y efectos fiscales de extinción de obligaciones.',
    intentGroup: 'Garantizar / Cobrar',
  },
  {
    id: 'fiscal-servicios-repse',
    title: 'Prestación de Servicios Especializados (Régimen REPSE)',
    description: 'Contrato de servicios especializados bajo los Arts. 13-15 LFT, 15-D CFF, 27 LISR y 5 LIVA con expediente mensual de cumplimiento.',
    prompt: 'Contrato de prestación de servicios especializados u obras especializadas en estricto cumplimiento de los artículos 13, 14 y 15 de la Ley Federal del Trabajo, artículo 15-D del Código Fiscal de la Federación, artículo 27 fracción V de la LISR y artículo 5 fracción II de la LIVA, estipulando acreditación de folio de registro REPSE vigente emitido por la STPS, delimitación de servicios que no forman parte del objeto social ni actividad económica preponderante del cliente, número de trabajadores asignados, y obligación mensual improrrogable de entrega de expediente de cumplimiento (CFDI nómina, SUA, SIPARE, declaraciones y enteros de retenciones SAT e IMSS).',
    requiredFields: ['Contratista / Prestador Especializado y RFC', 'Contratante / Cliente y RFC', 'Folio de registro REPSE vigente y fecha de renovación', 'Descripción técnica de los servicios especializados asignados', 'Manifestación de no formar parte del objeto social preponderante del cliente', 'Número de personal asignado y matriz mensual de entregables (SUA, SIPARE, CFDI nómina)'],
    output: 'Contrato formal de servicios especializados con blindaje integral REPSE, fiscal y laboral.',
    intentGroup: 'Contratar / Operar',
  },
];

export type LegalEngineeringArea = 'mercantil' | 'laboral' | 'comercio_exterior' | 'aduanal' | 'fiscal';


export const LEGAL_ENGINEERING_TEMPLATES: Record<LegalEngineeringArea, DraftingTemplate[]> = {
  mercantil: MERCANTIL_DRAFTING_TEMPLATES,
  laboral: LABORAL_DRAFTING_TEMPLATES,
  comercio_exterior: COMERCIO_EXTERIOR_DRAFTING_TEMPLATES,
  aduanal: ADUANAL_DRAFTING_TEMPLATES,
  fiscal: FISCAL_DRAFTING_TEMPLATES,
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
