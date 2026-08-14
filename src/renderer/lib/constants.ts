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
    id: 'laboral-convenio-terminacion',
    title: 'Convenio de Terminación Laboral',
    description: 'Documento de cierre de relación con pagos, entrega de bienes y liberaciones.',
    prompt: 'Convenio de terminación de relación laboral con fecha de baja, conceptos de pago, entrega de herramientas, devolución de información, ratificación pendiente y reservas necesarias.',
    requiredFields: ['Patrón', 'Persona trabajadora', 'Fecha de terminación', 'Conceptos de pago', 'Bienes a devolver', 'Ratificación o autoridad', 'Liberaciones'],
    output: 'Convenio de terminación laboral para revisión antes de firma.',
    intentGroup: 'Cerrar relación',
  },
];

// ── Comercio Exterior Drafting Templates ──────────────────
export const COMERCIO_EXTERIOR_DRAFTING_TEMPLATES: DraftingTemplate[] = [
  {
    id: 'comercio_exterior-compraventa-internacional',
    title: 'Compraventa Internacional',
    description: 'Contrato para importación/exportación con Incoterm, entrega, pago y documentos.',
    prompt: 'Contrato de compraventa internacional de mercancías con Incoterm, punto de entrega, transmisión de riesgos, documentos comerciales, certificaciones, forma de pago, inspección, garantías y solución de controversias.',
    requiredFields: ['Vendedor', 'Comprador', 'Mercancías', 'Incoterm', 'Puerto o punto de entrega', 'Precio', 'Moneda', 'Forma de pago', 'Documentos requeridos'],
    output: 'Contrato de compraventa internacional con anexos documentales sugeridos.',
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
];

// ── Aduanal Drafting Templates ────────────────────────────
export const ADUANAL_DRAFTING_TEMPLATES: DraftingTemplate[] = [
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
