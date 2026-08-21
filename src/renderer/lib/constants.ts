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
  {
    id: 'mercantil-nda-bilateral',
    title: 'Convenio de Confidencialidad (NDA Bilateral)',
    description: 'Protección de secretos industriales, know-how y datos de negocio con penas por fuga.',
    prompt: 'Convenio bilateral de confidencialidad y no divulgación (NDA) para intercambio de información técnica, societaria y financiera, con vigencia extendida, exclusiones estándar y pena convencional.',
    requiredFields: ['Parte A', 'Parte B', 'Información Confidencial', 'Finalidad del intercambio', 'Plazo de protección', 'Pena por violación'],
    output: 'Contrato de NDA bilateral con blindaje de secretos industriales.',
    intentGroup: 'Proteger información',
  },
  {
    id: 'mercantil-cesion-derechos',
    title: 'Cesión de Derechos de Cobro',
    description: 'Transmisión formal de derechos de crédito litigiosos o comerciales con notificación a deudor.',
    prompt: 'Contrato de cesión de derechos de cobro y créditos mercantiles, con estipulación de precio de cesión, garantías sobre la existencia del crédito y modelo de notificación al deudor cedido.',
    requiredFields: ['Cedente', 'Cesionario', 'Deudor cedido', 'Crédito o factura objeto', 'Precio de cesión', 'Obligación de notificación'],
    output: 'Contrato de cesión de derechos mercantiles y formato anexo de notificación.',
    intentGroup: 'Cobrar / Garantizar',
  },
];

// ── Laboral Drafting Templates ────────────────────────────
export const LABORAL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'laboral-contrato-individual',
    title: 'Contrato Individual de Trabajo',
    description: 'Relación laboral con puesto, jornada, salario, prestaciones y confidencialidad.',
    prompt: 'Contrato individual de trabajo para una persona trabajadora en México, con puesto, funciones, jornada, salario, prestaciones, centro de trabajo, confidencialidad, herramientas de trabajo y causas de terminación conforme a los datos proporcionados.',
    requiredFields: ['Patrón', 'Persona trabajadora', 'Puesto', 'Funciones', 'Jornada', 'Salario', 'Prestaciones', 'Centro de trabajo', 'Fecha de inicio'],
    output: 'Contrato individual de trabajo listo para revisión profesional.',
    intentGroup: 'Contratar personal',
  },
  {
    id: 'laboral-teletrabajo',
    title: 'Anexo de Teletrabajo',
    description: 'Anexo para modalidad remota, herramientas, horarios y seguridad de información.',
    prompt: 'Anexo de teletrabajo para regular lugar de prestación, equipo entregado, conectividad, seguridad de información, horarios de disponibilidad, reportes, reversibilidad y medidas de salud y seguridad.',
    requiredFields: ['Contrato base', 'Persona trabajadora', 'Domicilio o lugar remoto', 'Equipo entregado', 'Horario', 'Medios de supervisión', 'Políticas internas'],
    output: 'Anexo laboral de teletrabajo con obligaciones operativas y datos faltantes marcados.',
    intentGroup: 'Regular modalidad',
  },
  {
    id: 'laboral-confidencialidad',
    title: 'Acuerdo de Confidencialidad Laboral',
    description: 'Compromiso de confidencialidad para personal con acceso a información sensible.',
    prompt: 'Acuerdo de confidencialidad laboral para persona trabajadora con acceso a información técnica, comercial, financiera o de clientes, incluyendo deberes durante y después de la relación laboral.',
    requiredFields: ['Patrón', 'Persona trabajadora', 'Información protegida', 'Duración', 'Excepciones', 'Consecuencias por incumplimiento'],
    output: 'Acuerdo de confidencialidad laboral con definiciones, obligaciones y excepciones.',
    intentGroup: 'Proteger información',
  },
  {
    id: 'laboral-confidencialidad-no-competencia',
    title: 'Confidencialidad y No Competencia Laboral',
    description: 'Convenio accesorio para proteger secretos técnicos, cartera de clientes y pactar no competencia post-laboral proporcional.',
    prompt: 'Convenio accesorio de confidencialidad y no competencia para personas trabajadoras conforme a los artículos 134 de la LFT y legislación de propiedad industrial, con protección de secretos técnicos, código fuente, cartera de clientes, prohibición de inducción de clientes/personal, pacto de no competencia post-laboral con territorio delimitado y contraprestación compensatoria, y pena convencional.',
    requiredFields: ['Empresa', 'Persona trabajadora', 'Puesto o área', 'Información protegida y secretos técnicos', 'Plazo de confidencialidad posterior', 'Territorio y contraprestación de no competencia', 'Pena convencional'],
    output: 'Convenio de confidencialidad y no competencia laboral con límites legales y proporcionalidad.',
    intentGroup: 'Proteger información',
  },
  {
    id: 'laboral-convenio-terminacion',
    title: 'Convenio de Terminación Laboral',
    description: 'Documento de cierre de relación con pagos, entrega de bienes y liberaciones.',
    prompt: 'Convenio de terminación de relación laboral con fecha de baja, conceptos de pago, entrega de herramientas, devolución de información, ratificación pendiente y reservas necesarias.',
    requiredFields: ['Patrón', 'Persona trabajadora', 'Fecha de terminación', 'Conceptos de pago', 'Bienes a devolver', 'Ratificación o autoridad', 'Liberaciones'],
    output: 'Convenio de terminación laboral para revisión antes de firma.',
    intentGroup: 'Cerrar relación',
  },
  {
    id: 'laboral-acta-administrativa',
    title: 'Acta Administrativa Laboral',
    description: 'Instrumento circunstanciado de hechos, pruebas y declaraciones por faltas laborales.',
    prompt: 'Acta administrativa de hechos para documentar faltas de asistencia, desobediencia o incumplimientos contractuales conforme al Art. 47 de la LFT, con declaraciones de testigos y descargos.',
    requiredFields: ['Patrón', 'Trabajador imputado', 'Lugar y fecha', 'Hechos circunstanciados', 'Testigos', 'Manifestaciones del trabajador'],
    output: 'Acta administrativa circunstanciada lista para firmas.',
    intentGroup: 'Disciplina y cumplimiento',
  },
  {
    id: 'laboral-politica-prevencion-acoso',
    title: 'Protocolo NOM-035 y No Discriminación',
    description: 'Política interna obligatoria de prevención de factores de riesgo psicosocial y violencia.',
    prompt: 'Protocolo y política corporativa interna para la prevención de violencia laboral, no discriminación y atención de factores de riesgo psicosocial en cumplimiento con la NOM-035-STPS.',
    requiredFields: ['Razón social del centro de trabajo', 'Comité de atención', 'Mecanismo de denuncia confidencial', 'Medidas preventivas'],
    output: 'Protocolo normativo institucional para implementación interna.',
    intentGroup: 'Disciplina y cumplimiento',
  },
];

// ── Comercio Exterior Drafting Templates ──────────────────
export const COMERCIO_EXTERIOR_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'comercio_exterior-compraventa-internacional',
    title: 'Compraventa Internacional de Mercancías',
    description: 'Contrato bajo Convención de Viena (CISG), Incoterms 2020, pago internacional, inspección y aduanas.',
    prompt: 'Contrato de compraventa internacional de mercancías conforme a la CISG e Incoterms® 2020 de la CCI, con especificaciones de producto, fracción arancelaria, puerto o punto de entrega, distribución de costos y riesgos aduaneros, forma y medios de pago internacional (carta de crédito / SWIFT), inspección previa, garantías y cláusula de solución de controversias / arbitraje comercial.',
    requiredFields: ['Vendedor / Exportador', 'Comprador / Importador', 'Mercancías y fracción arancelaria', 'Incoterm 2020 aplicable', 'Puerto o punto de entrega', 'Precio y moneda (USD/EUR)', 'Forma de pago internacional', 'Documentos aduaneros requeridos'],
    output: 'Contrato de compraventa internacional con anexos documentales y cláusulas CISG/Incoterms.',
    intentGroup: 'Importar / Exportar',
  },
  {
    id: 'comercio_exterior-distribucion-internacional',
    title: 'Distribución Internacional',
    description: 'Acuerdo de distribución, territorio, exclusividad, pedidos y cumplimiento.',
    prompt: 'Contrato de distribución internacional con territorio, exclusividad, órdenes de compra, mínimos de venta, cumplimiento regulatorio, propiedad intelectual, devoluciones y terminación.',
    requiredFields: ['Proveedor', 'Distribuidor', 'Territorio', 'Productos', 'Exclusividad', 'Metas o mínimos', 'Condiciones de pago', 'Vigencia'],
    output: 'Contrato de distribución internacional con obligaciones comerciales y de cumplimiento.',
    intentGroup: 'Distribuir mercancías',
  },
  {
    id: 'comercio_exterior-aviso-privacidad',
    title: 'Aviso de Privacidad (Comercio Exterior)',
    description: 'Aviso de privacidad conforme a la LFPDPPP para operaciones aduaneras, despacho, logística y fiscalización.',
    prompt: 'Aviso de Privacidad integral para operaciones de comercio exterior y despacho aduanero conforme a la LFPDPPP, con detalle del responsable del tratamiento, finalidades primarias (despacho aduanero, pedimentos, trámites ante SAT y ANAM, logística y facturación), finalidades secundarias, transferencias a autoridades y prestadores de servicios aduanales, mecanismo para ejercicio de derechos ARCO y medidas de seguridad.',
    requiredFields: ['Responsable / Razón Social', 'Domicilio y correo de contacto', 'Finalidades primarias y secundarias', 'Categorías de datos recabados', 'Transferencias previstas', 'Procedimiento para Derechos ARCO'],
    output: 'Aviso de privacidad estructurado para operaciones de comercio exterior y aduanas.',
    intentGroup: 'Preparar operación',
  },
  {
    id: 'comercio_exterior-poder-especial-aduanero',
    title: 'Poder Especial para Comercio Exterior y Aduanas',
    description: 'Poder especial para representación en trámites aduanales, despachos de importación/exportación, pedimentos y permisos ante SAT/ANAM.',
    prompt: 'Poder especial para actos de comercio exterior y aduaneros conforme al Código Civil Federal, Ley Aduanera y CFF, con facultades expresas para realizar despachos de importación/exportación, tramitar pedimentos ante la ANAM/SAT, contratar agentes aduanales, tramitar permisos/certificados y realizar pagos de contribuciones aduaneras, con delimitación expresa de limitaciones (sin actos de dominio sobre inmuebles ni otorgamiento de garantías).',
    requiredFields: ['Poderdante', 'Apoderado', 'Facultades conferidas (despacho, pedimentos, permisos)', 'Autoridades competentes (SAT, ANAM)', 'Limitaciones expresas', 'Vigencia'],
    output: 'Poder especial para representación en comercio exterior y trámites aduanales.',
    intentGroup: 'Coordinar despacho',
  },
  {
    id: 'comercio_exterior-checklist-importacion',
    title: 'Checklist de Importación',
    description: 'Lista operativa de documentos, permisos, clasificación y pagos para importar.',
    prompt: 'Checklist documental para operación de importación, incluyendo factura comercial, packing list, conocimiento de embarque o guía, fracción arancelaria, regulaciones y restricciones no arancelarias, permisos, certificados, pedimento y pagos.',
    requiredFields: ['Importador', 'Proveedor extranjero', 'Mercancía', 'País de origen', 'Fracción arancelaria si existe', 'Incoterm', 'Aduana', 'Agente aduanal'],
    output: 'Checklist de importación con documentos existentes, faltantes, responsables y alertas.',
    intentGroup: 'Preparar operación',
  },
  {
    id: 'comercio_exterior-carta-instrucciones',
    title: 'Carta de Instrucciones al Agente Aduanal',
    description: 'Instrucciones operativas para despacho, documentos y coordinación logística.',
    prompt: 'Carta de instrucciones al agente aduanal para despacho de importación o exportación, con datos de mercancía, régimen, documentos anexos, Incoterm, transporte, contacto operativo y observaciones.',
    requiredFields: ['Importador/exportador', 'Agente aduanal', 'Régimen', 'Mercancía', 'Aduana', 'Transporte', 'Documentos anexos', 'Contacto operativo'],
    output: 'Carta de instrucciones clara para revisión interna y envío al agente aduanal.',
    intentGroup: 'Coordinar despacho',
  },
  {
    id: 'comercio_exterior-contrato-flete-internacional',
    title: 'Contrato de Transporte y Logística Internacional',
    description: 'Acuerdo con agente de carga (Freight Forwarder) con delimitación de responsabilidades y seguros.',
    prompt: 'Contrato de prestación de servicios logísticos y transporte internacional de carga, estipulando rutas, tarifas, demoras, cobertura de póliza de seguro y responsabilidades del agente de carga.',
    requiredFields: ['Usuario / Embarcador', 'Freight Forwarder', 'Ruta y modalidades de transporte', 'Tarifas y demoras', 'Póliza de seguro', 'Límites de responsabilidad'],
    output: 'Contrato logístico internacional con clausulado operativo.',
    intentGroup: 'Coordinar despacho',
  },
];

// ── Aduanal Drafting Templates ────────────────────────────
export const ADUANAL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'aduanal-prestacion-servicios-agente-aduanal',
    title: 'Servicios de Agente Aduanal y Carta Encomienda',
    description: 'Contrato de prestación de servicios aduanales con carta encomienda para trámites de despacho, clasificación arancelaria y pedimentos.',
    prompt: 'Contrato de prestación de servicios de agente aduanal y carta encomienda conforme a los artículos 35, 36, 40, 159, 160 y 162 de la Ley Aduanera, con designación de patente aduanal, facultades para despacho de importación/exportación, clasificación arancelaria, honorarios, anticipo a cuenta de contribuciones aduaneras y delimitación de responsabilidades.',
    requiredFields: ['Agente aduanal y número de patente', 'Cliente / Importador / Exportador', 'Operaciones y descripción de mercancía', 'Aduana de despacho', 'Honorarios y gastos de maniobras', 'Anticipo para contribuciones'],
    output: 'Contrato de servicios aduanales con carta encomienda y facultades de representación aduanera.',
    intentGroup: 'Atender autoridad',
  },
  {
    id: 'aduanal-poder-especial-aduanas',
    title: 'Poder Especial para Despacho Aduanal',
    description: 'Poder especial para trámites aduaneros, firma de pedimentos y representación ante autoridades aduanales.',
    prompt: 'Poder especial para representación ante autoridades aduaneras (SAT/ANAM), facultando la tramitación y firma de pedimentos, designación de agentes aduanales, presentación de avisos, permisos de importación/exportación y promociones aduanales con delimitación expresa de límites.',
    requiredFields: ['Poderdante', 'Apoderado', 'Patente o aduana de actuación', 'Facultades para despacho y pedimentos', 'Limitaciones expresas'],
    output: 'Instrumento de poder especial para representación y trámites aduanales.',
    intentGroup: 'Atender autoridad',
  },
  {
    id: 'aduanal-aviso-privacidad',
    title: 'Aviso de Privacidad Aduanal',
    description: 'Aviso de privacidad para agencias y trámites aduanales conforme a la LFPDPPP.',
    prompt: 'Aviso de Privacidad conforme a la LFPDPPP y Ley Aduanera para el tratamiento de datos personales, fiscales y patrimoniales en trámites de despacho aduanero, pedimentos y representación ante autoridades fiscales y aduaneras (SAT/ANAM).',
    requiredFields: ['Responsable / Agencia Aduanal', 'Domicilio fiscal y correo', 'Finalidades aduaneras y fiscales', 'Datos patrimoniales y fiscales recabados', 'Transferencias de datos', 'Atención de Derechos ARCO'],
    output: 'Aviso de privacidad para operaciones de despacho y representación aduanal.',
    intentGroup: 'Integrar expediente',
  },
  {
    id: 'aduanal-expediente-pedimento',
    title: 'Expediente de Pedimento',
    description: 'Índice y control documental para pedimento de importación o exportación.',
    prompt: 'Índice de expediente aduanal asociado a pedimento, integrando factura, documentos de transporte, manifestación de valor, hoja de cálculo, permisos, certificados, comprobantes de pago, anexos y observaciones.',
    requiredFields: ['Número de pedimento si existe', 'Régimen', 'Aduana', 'Importador/exportador', 'Mercancía', 'Documentos disponibles', 'Documentos faltantes'],
    output: 'Índice de expediente aduanal con control de faltantes y responsable de cierre.',
    intentGroup: 'Integrar expediente',
  },
  {
    id: 'aduanal-manifestacion-valor',
    title: 'Manifestación de Valor',
    description: 'Borrador de integración de datos de valor en aduana y soporte documental.',
    prompt: 'Borrador de manifestación de valor o memo de soporte para valor en aduana, con proveedor, mercancía, precio pagado o por pagar, incrementables, documentos soporte y datos faltantes.',
    requiredFields: ['Importador', 'Proveedor', 'Mercancía', 'Factura', 'Incoterm', 'Valor', 'Incrementables', 'Documentos soporte'],
    output: 'Memo estructurado de soporte de valor en aduana con campos pendientes.',
    intentGroup: 'Soportar valor',
  },
  {
    id: 'aduanal-rectificacion-pedimento',
    title: 'Solicitud de Rectificación',
    description: 'Escrito interno para preparar rectificación de datos del pedimento.',
    prompt: 'Escrito o memo para preparar solicitud de rectificación de pedimento, identificando dato incorrecto, dato correcto, fundamento documental, causa de corrección, anexos y validaciones previas.',
    requiredFields: ['Pedimento', 'Dato a corregir', 'Dato correcto', 'Causa', 'Documentos soporte', 'Responsable', 'Fecha objetivo'],
    output: 'Memo de rectificación con hechos, anexos y checklist de revisión.',
    intentGroup: 'Corregir operación',
  },
  {
    id: 'aduanal-respuesta-requerimiento',
    title: 'Respuesta a Requerimiento Aduanal',
    description: 'Estructura de contestación con hechos, anexos y peticiones.',
    prompt: 'Borrador de respuesta a requerimiento o carta de atención aduanal, con autoridad, expediente, hechos, documentos anexos, aclaraciones, peticiones y reservas.',
    requiredFields: ['Autoridad', 'Expediente o folio', 'Contribuyente', 'Hechos', 'Documentos anexos', 'Petición concreta', 'Fecha límite'],
    output: 'Borrador de respuesta ordenado para revisión y firma.',
    intentGroup: 'Atender autoridad',
  },
  {
    id: 'aduanal-anexo-24-22-control',
    title: 'Auditoría y Control IMMEX (Anexo 24)',
    description: 'Protocolo de revisión de descargos, mermas y temporalidad de mercancías importadas.',
    prompt: 'Protocolo de control documental y auditoría interna para programa IMMEX, verificando temporalidad de permanencia, reporte de descargos bajo Anexo 24 y control de mermas.',
    requiredFields: ['Empresa IMMEX', 'Número de programa', 'Período auditado', 'Insumos importados', 'Saldo pendiente de descargo'],
    output: 'Protocolo y matriz de control aduanal IMMEX.',
    intentGroup: 'Integrar expediente',
  },
];

// ── Fiscal y Patrimonial Legal Templates ──────────────────
export const FISCAL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'fiscal-prestacion-servicios',
    title: 'Contrato de Servicios con Cláusulas Fiscales',
    description: 'Instrumento legal con delimitación de entregables, retenciones y cumplimiento tributario.',
    prompt: 'Contrato de prestación de servicios profesionales con estipulaciones claras de contraprestación, CFDI, retenciones aplicables, propiedad intelectual, no relación laboral y entregables verificables.',
    requiredFields: ['Prestador', 'Cliente', 'Objeto y entregables', 'Honorarios', 'Forma de pago y CFDI', 'Retenciones', 'Vigencia'],
    output: 'Contrato formal de prestación de servicios con cláusulas de cumplimiento legal-fiscal.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'fiscal-mutuo-interes',
    title: 'Contrato de Mutuo con Interés y Retención',
    description: 'Préstamo dinerario entre partes con calendario de amortización, interés y soporte patrimonial.',
    prompt: 'Contrato de mutuo con interés mercantil/civil, especificando monto prestado, tasa de interés pactada, calendario de amortización, cuenta de depósito para trazabilidad y cláusulas de retención legal.',
    requiredFields: ['Mutuante', 'Mutuario', 'Monto prestado', 'Tasa de interés', 'Plazo y calendario de amortización', 'Destino de los fondos', 'Garantía'],
    output: 'Contrato de mutuo con pagaré anexo y soporte de origen y destino de recursos.',
    intentGroup: 'Garantizar / Cobrar',
  },
  {
    id: 'fiscal-reconocimiento-adeudo',
    title: 'Convenio de Reconocimiento de Adeudo',
    description: 'Instrumento de reestructuración de saldos, calendario de pagos y penalizaciones.',
    prompt: 'Convenio de reconocimiento de adeudo y compromiso de pago en parcialidades, con liquidación de obligaciones comerciales o patrimoniales, intereses pactados y penas por mora.',
    requiredFields: ['Acreedor', 'Deudor', 'Monto total reconocido', 'Origen del adeudo', 'Plan de pagos', 'Garantías', 'Consecuencias por mora'],
    output: 'Convenio formal de reconocimiento de adeudo con fuerza ejecutiva.',
    intentGroup: 'Garantizar / Cobrar',
  },
  {
    id: 'fiscal-escrito-aclaracion',
    title: 'Escrito Libre de Aclaración Legal',
    description: 'Escrito formal para presentar aclaraciones, solventar cartas invitación o atender requerimientos.',
    prompt: 'Escrito libre formal dirigido a la autoridad competente para presentar aclaraciones jurídicas, adjuntar documentación probatoria y formular peticiones en términos de ley.',
    requiredFields: ['Autoridad destinataria', 'Promovente', 'RFC y domicilio', 'Folio o antecedente', 'Hechos y aclaraciones', 'Pruebas anexas', 'Puntos petitorios'],
    output: 'Escrito legal formal con hechos, pruebas y petitorios en derecho.',
    intentGroup: 'Contestar / Aclarar',
  },
  {
    id: 'fiscal-memo-analisis',
    title: 'Dictamen de Análisis Jurídico-Fiscal',
    description: 'Evaluación técnico-jurídica sobre contratos, operaciones societarias o implicaciones patrimoniales.',
    prompt: 'Dictamen jurídico-fiscal para analizar la validez, riesgos y requisitos de cumplimiento de una operación contractual o corporativa, con fundamento en leyes y reglamentos aplicables.',
    requiredFields: ['Cliente u operación', 'Antecedentes', 'Preguntas o temas a dictaminar', 'Documentos analizados', 'Conclusiones y recomendaciones'],
    output: 'Dictamen jurídico estructurado con antecedentes, análisis de fondo y conclusiones.',
    intentGroup: 'Blindar / Dictaminar',
  },
  {
    id: 'fiscal-arrendamiento-inmueble',
    title: 'Arrendamiento con Cláusulas Fiscales',
    description: 'Contrato de arrendamiento comercial con retenciones, comprobantes y uso de suelo.',
    prompt: 'Contrato de arrendamiento de inmueble para uso comercial o corporativo, con estipulaciones de renta mensual, IVA, retenciones fiscales, depósito en garantía, mantenimiento y vigencia.',
    requiredFields: ['Arrendador', 'Arrendatario', 'Inmueble', 'Renta mensual e IVA', 'Retenciones', 'Uso autorizado', 'Garantía'],
    output: 'Contrato de arrendamiento formal con estipulaciones de cumplimiento fiscal.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'fiscal-comision-mercantil',
    title: 'Comisión Mercantil y Honorarios',
    description: 'Acuerdo de corretaje y comisión con reglas de devengo, liquidación y comprobación fiscal.',
    prompt: 'Contrato de comisión mercantil para intermediación o colocación comercial, detallando porcentaje de comisión, condiciones de devengo, rendición de cuentas y comprobación mediante CFDI.',
    requiredFields: ['Comitente', 'Comisionista', 'Operaciones objeto', 'Porcentaje o tarifa de comisión', 'Condición de devengo', 'CFDI y retenciones'],
    output: 'Contrato de comisión mercantil estructurado.',
    intentGroup: 'Contratar / Operar',
  },
  {
    id: 'fiscal-convenio-dacion',
    title: 'Convenio de Dación en Pago',
    description: 'Instrumento para extinguir deudas mediante la entrega de bienes con avalúo y valor fiscal.',
    prompt: 'Convenio de dación en pago para liquidación total o parcial de adeudos comerciales, con determinación de bienes entregados, valor fiscal pactado, liberación de gravámenes y finiquito de obligaciones.',
    requiredFields: ['Acreedor', 'Deudor', 'Adeudo a extinguir', 'Bienes dados en pago', 'Valor pactado o avalúo', 'Fecha de entrega', 'Finiquito'],
    output: 'Convenio de dación en pago con cláusula de liberación y finiquito.',
    intentGroup: 'Garantizar / Cobrar',
  },
  {
    id: 'fiscal-servicios-repse',
    title: 'Contrato de Servicios Especializados (REPSE)',
    description: 'Contrato de servicios u obras especializadas con estricto apego al Art. 15 CFF y 13-15 LFT.',
    prompt: 'Contrato de prestación de servicios especializados con registro REPSE vigente, delimitación de servicios que no forman parte del objeto social preponderante del cliente, reporte mensual de cuotas IMSS/INFONAVIT y CFDI.',
    requiredFields: ['Contratista', 'Cliente', 'Folio de registro REPSE', 'Objeto de servicios especializados', 'Número aproximado de trabajadores asignados', 'Entregables mensuales'],
    output: 'Contrato de servicios especializados con blindaje fiscal y laboral.',
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
