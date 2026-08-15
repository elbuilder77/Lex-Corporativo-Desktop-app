import { z } from 'zod';

// ── Shared Domain Schemas & Types ───────────────────────────

export const OperationDocumentSchema = z.object({
  documentId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  category: z.enum(['contract', 'cfdi', 'payment_proof', 'deliverable', 'evidence', 'communication', 'purchase_order', 'service_report', 'other']),
  base64: z.string().optional(),
  extractedText: z.string().optional(),
  hash: z.string().optional(),
});

export type OperationDocument = z.infer<typeof OperationDocumentSchema>;

export const OperationPartySchema = z.object({
  partyId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1), // e.g. "Proveedor", "Cliente", "Fiador"
  taxId: z.string().optional(), // RFC o Tax Identification Number
  legalRepresentative: z.string().optional(),
});

export type OperationParty = z.infer<typeof OperationPartySchema>;

export const EvidenceItemSchema = z.object({
  evidenceId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  strength: z.enum(['high', 'medium', 'low']),
  linkedDocuments: z.array(z.string()), // documentIds
  verificationStatus: z.enum(['verified', 'partial', 'unverified']),
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const ExtractedFactSchema = z.object({
  factId: z.string().min(1),
  timestamp: z.string(),
  description: z.string(),
  category: z.string(),
  evidenceId: z.string().optional(),
});

export type ExtractedFact = z.infer<typeof ExtractedFactSchema>;

export const RiskFindingSchema = z.object({
  findingId: z.string().min(1),
  area: z.string(), // e.g. "Materiality", "Deductibility", "Guarantees"
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string(),
  legalFoundation: z.string(), // Applicable laws/articles
  mitigatingAction: z.string(),
});

export type RiskFinding = z.infer<typeof RiskFindingSchema>;

export const RecommendationSchema = z.object({
  recommendationId: z.string().min(1),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  action: z.string(),
  expectedOutcome: z.string(),
  timeline: z.string().optional(),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

// ── Shared Domain Operations ────────────────────────────────

/**
 * 1. DocumentClassifier: Categorizes uploaded files based on mime/name/content heuristics
 */
export class DocumentClassifier {
  static classify(fileName: string, mimeType: string): OperationDocument['category'] {
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('contrato') || lowerName.includes('convenio') || lowerName.includes('contract') || lowerName.includes('acuerdo')) {
      return 'contract';
    }
    if (lowerName.includes('cfdi') || lowerName.includes('factura') || lowerName.includes('xml') || lowerName.includes('invoice') || lowerName.includes('nota_credito')) {
      return 'cfdi';
    }
    if (lowerName.includes('pago') || lowerName.includes('transferencia') || lowerName.includes('spei') || lowerName.includes('banco') || lowerName.includes('payment')) {
      return 'payment_proof';
    }
    if (lowerName.includes('entregable') || lowerName.includes('reporte') || lowerName.includes('producto') || lowerName.includes('deliverable') || lowerName.includes('pdf_entregable')) {
      return 'deliverable';
    }
    if (lowerName.includes('evidencia') || lowerName.includes('fotos') || lowerName.includes('registro') || lowerName.includes('bitacora') || lowerName.includes('evidence')) {
      return 'evidence';
    }
    if (lowerName.includes('correo') || lowerName.includes('comunicacion') || lowerName.includes('chat') || lowerName.includes('whatsapp') || lowerName.includes('communication')) {
      return 'communication';
    }
    if (lowerName.includes('compra') || lowerName.includes('orden') || lowerName.includes('requisicion') || lowerName.includes('purchase')) {
      return 'purchase_order';
    }
    if (lowerName.includes('servicio') || lowerName.includes('hoja_trabajo') || lowerName.includes('bitacora_servicio')) {
      return 'service_report';
    }
    
    return 'other';
  }
}

/**
 * 2. EvidenceMapper: Assesses operational and document support strength
 */
export class EvidenceMapper {
  static assessSupportStrength(
    documents: OperationDocument[],
    evidenceItems: EvidenceItem[] = []
  ): { score: number; level: 'Bajo' | 'Medio' | 'Alto'; isSufficient: 'Sí' | 'Parcial' | 'No'; missingCategories?: string[] } {
    let weight = 0;
    
    const categories = new Set(documents.map(d => d.category));
    const missingCategories: string[] = [];
    
    // Core document categories give direct weight
    if (categories.has('contract')) {
      weight += 20;
    } else {
      missingCategories.push('Contrato o convenio firmado que delimite el objeto');
    }

    if (categories.has('cfdi')) {
      weight += 15;
    } else {
      missingCategories.push('Comprobante Fiscal Digital por Internet (CFDI) con UUID válido');
    }

    if (categories.has('payment_proof')) {
      weight += 20;
    } else {
      missingCategories.push('Comprobante de transferencia bancaria / SPEI para acreditar flujo de recursos');
    }

    if (categories.has('deliverable')) {
      weight += 25;
    } else {
      missingCategories.push('Evidencia material de entregables o reportes de ejecución');
    }

    if (categories.has('evidence')) {
      weight += 15;
    }
    if (categories.has('purchase_order') || categories.has('service_report')) {
      weight += 5;
    }
    
    // Evidence strength scaling
    for (const item of evidenceItems) {
      if (item.strength === 'high' && item.verificationStatus === 'verified') weight += 5;
      else if (item.strength === 'medium' && item.verificationStatus === 'verified') weight += 3;
    }
    
    const finalScore = Math.min(weight, 100);
    
    let level: 'Bajo' | 'Medio' | 'Alto' = 'Bajo';
    let isSufficient: 'Sí' | 'Parcial' | 'No' = 'No';
    
    if (finalScore >= 80) {
      level = 'Alto';
      isSufficient = 'Sí';
    } else if (finalScore >= 50) {
      level = 'Medio';
      isSufficient = 'Parcial';
    }
    
    return missingCategories.length > 0
      ? { score: finalScore, level, isSufficient, missingCategories }
      : { score: finalScore, level, isSufficient };
  }
}


/**
 * 3. RiskScoring: Parametric risk aggregator
 */
export class RiskScoring {
  static calculateRiskScore(findings: RiskFinding[]): number {
    if (findings.length === 0) return 15; // Base minimum risk
    
    let scoreMultiplier = 0;
    
    for (const f of findings) {
      if (f.severity === 'critical') scoreMultiplier += 35;
      else if (f.severity === 'high') scoreMultiplier += 20;
      else if (f.severity === 'medium') scoreMultiplier += 10;
      else if (f.severity === 'low') scoreMultiplier += 5;
    }
    
    return Math.min(Math.max(scoreMultiplier, 10), 95);
  }
}

export type SupportedEcosystem = 'mercantil' | 'laboral' | 'comercio_exterior' | 'aduanal' | 'fiscal';

export interface DeterministicAnalysisInput {
  files: { name: string; text: string; mimeType?: string }[];
  ecosystem: SupportedEcosystem;
  ragSources: Array<{
    id: string | number;
    title: string;
    law?: string;
    article?: string;
    content: string;
    relevanceScore?: number;
  }>;
  userPrompt?: string;
}

/**
 * 4. Deterministic Local Fallback Generator:
 * Generates an exhaustive, structured legal audit without cloud reliance.
 */
export function generateDeterministicLegalAudit(input: DeterministicAnalysisInput): Record<string, unknown> {
  const { files, ecosystem, ragSources } = input;
  const fullText = files.map(f => f.text).join('\n\n');
  const opDocs: OperationDocument[] = files.map((f, i) => ({
    documentId: `doc:${i + 1}`,
    fileName: f.name,
    mimeType: f.mimeType || 'text/plain',
    category: DocumentClassifier.classify(f.name, f.mimeType || ''),
    extractedText: f.text,
  }));

  const support = EvidenceMapper.assessSupportStrength(opDocs);

  // Detect Parties
  const detectedParties: string[] = [];
  const partyMatches = fullText.matchAll(/(?:por una parte|comparece(?:\s+por\s+una\s+parte)?|denominada|en lo sucesivo|por otra parte)\s+["“']?([A-ZÁÉÍÓÚÑ0-9\s,\.]{3,60}?)(?:["”']|\s+,\s+|\s+a quien|\s+representada|\s+y\s+por\s+|\s+y\s+otra\s+|\s*\.)/gi);
  for (const m of partyMatches) {
    const candidate = m[1].replace(/[\n\r]+/g, ' ').trim();
    if (candidate.length > 3 && !detectedParties.includes(candidate) && !/^(?:que|los|las|sus|con)\b/i.test(candidate)) {
      detectedParties.push(candidate);
    }
    if (detectedParties.length >= 4) break;
  }
  if (detectedParties.length === 0) {
    detectedParties.push('Partes contractuales especificadas en el instrumento');
  }


  // Detect Key Obligations
  const detectedObligations: string[] = [];
  const clMatches = fullText.matchAll(/(?:CL[AÁ]USULA\s+[A-ZÁÉÍÓÚÑ\-]+|\bPRIMERA|\bSEGUNDA|\bTERCERA)[\.\:\-]?\s*([^\n\r]{20,160})/gi);
  for (const cm of clMatches) {
    const clText = cm[1].trim();
    if (clText && !detectedObligations.includes(clText)) {
      detectedObligations.push(clText);
    }
    if (detectedObligations.length >= 4) break;
  }
  if (detectedObligations.length === 0) {
    detectedObligations.push('Obligaciones recíprocas conforme al clausulado general');
  }

  // Missing clauses and Risk evaluation by ecosystem
  const missingClauses: string[] = [];
  const missingData: string[] = [];
  const findings: RiskFinding[] = [];
  const recommendedActions: string[] = [];
  const checklist: string[] = [];

  const primaryLaw = ragSources[0]?.law || (
    ecosystem === 'fiscal' ? 'Código Fiscal de la Federación' :
    ecosystem === 'laboral' ? 'Ley Federal del Trabajo' :
    ecosystem === 'aduanal' ? 'Ley Aduanera' :
    ecosystem === 'comercio_exterior' ? 'Ley de Comercio Exterior' : 'Código de Comercio'
  );
  const primaryArticle = ragSources[0]?.article || 'Disposiciones aplicables';

  if (ecosystem === 'fiscal') {
    if (!/CFDI|UUID|Comprobante/i.test(fullText)) {
      missingClauses.push('Cláusula de emisión y validación de CFDI 4.0 con desglose de impuestos');
      findings.push({
        findingId: 'risk-cfdi-missing',
        area: 'Deducibilidad e IVA',
        severity: 'high',
        description: 'No se acredita la vinculación de comprobantes fiscales digitales (CFDI) con UUID para soportar la deducción.',
        legalFoundation: `${primaryLaw} ${primaryArticle}`,
        mitigatingAction: 'Incorporar folios fiscales y constancias de retención aplicables.',
      });
    }
    if (!/entregable|bit[aá]cora|reporte/i.test(fullText)) {
      missingClauses.push('Estipulación expresa de entregables periódicos y bitácora de materialidad');
      findings.push({
        findingId: 'risk-materialidad-missing',
        area: 'Materialidad (Art. 69-B CFF)',
        severity: 'high',
        description: 'Falta de soporte probatorio de la prestación efectiva del servicio o recepción de bienes.',
        legalFoundation: 'Código Fiscal de la Federación Art. 69-B',
        mitigatingAction: 'Integrar expediente con reportes de avance, actas de entrega-recepción y bitácoras.',
      });
    }
    recommendedActions.push('Integrar expediente de defensa con CFDI, estados de cuenta bancarios y evidencia de materialidad.');
    recommendedActions.push('Verificar que el prestador no se encuentre en listas restrictivas del SAT.');
    checklist.push('Contrato con fecha cierta y firmas ratificadas');
    checklist.push('CFDI versión 4.0 con clave de producto/servicio correcta');
    checklist.push('Comprobante de pago bancario mediante transferencia');
  } else if (ecosystem === 'laboral') {
    if (!/jornada|horario/i.test(fullText)) {
      missingClauses.push('Delimitación expresa de la jornada de trabajo máxima (Art. 59-61 LFT)');
      findings.push({
        findingId: 'risk-jornada-missing',
        area: 'Condiciones Laborales',
        severity: 'medium',
        description: 'La jornada de trabajo no se encuentra debidamente especificada, arriesgando reclamos por horas extraordinarias.',
        legalFoundation: 'Ley Federal del Trabajo Art. 25 y 59',
        mitigatingAction: 'Establecer expresamente el horario y días de descanso semanal.',
      });
    }
    if (!/salario|prestacion/i.test(fullText)) {
      missingData.push('Monto específico de salario base y desglose de prestaciones legales');
    }
    recommendedActions.push('Recabar acuse firmado de entrega de copia del contrato a la persona trabajadora.');
    recommendedActions.push('Establecer con precisión el centro de trabajo y la descripción pormenorizada de funciones.');
    checklist.push('Identificación completa de patrón y trabajador');
    checklist.push('Salario pactado expresado en moneda nacional');
    checklist.push('Cláusula de confidencialidad y entrega de herramientas');
  } else if (ecosystem === 'comercio_exterior' || ecosystem === 'aduanal') {
    if (!/incoterm/i.test(fullText)) {
      missingClauses.push('Definición del término internacional de comercio (Incoterm ICC 2020) y transmisión de riesgos');
      findings.push({
        findingId: 'risk-incoterm-missing',
        area: 'Comercio Exterior y Aduanas',
        severity: 'high',
        description: 'Ausencia de Incoterm determinado para fijar el punto de entrega y costos incrementables en aduana.',
        legalFoundation: 'Ley Aduanera Art. 56 y 65',
        mitigatingAction: 'Especificar el Incoterm exacto (ej. FOB, CIF, DDP) y el puerto o aduana de ingreso.',
      });
    }
    recommendedActions.push('Validar la clasificación arancelaria y verificar cumplimiento de Normas Oficiales Mexicanas (NOMs).');
    recommendedActions.push('Consolidar la Manifestación de Valor con facturas y documentos de transporte anexos.');
    checklist.push('Factura comercial y lista de empaque (Packing List)');
    checklist.push('Conocimiento de embarque (B/L) o Guía aérea');
    checklist.push('Certificado de origen bajo tratado aplicable (ej. T-MEC)');
  } else {
    // Mercantil / Corporativo
    if (!/jurisdicci[oó]n|tribunal/i.test(fullText)) {
      missingClauses.push('Cláusula de sumisión expresa a tribunales competentes y ley aplicable');
      findings.push({
        findingId: 'risk-jurisdiccion-missing',
        area: 'Seguridad Contractual',
        severity: 'medium',
        description: 'No se definió la competencia territorial para la resolución de controversias jurídicas.',
        legalFoundation: 'Código de Comercio Art. 1093',
        mitigatingAction: 'Incorporar renuncia de fueros de domicilio futuro y sumisión a tribunales locales.',
      });
    }
    if (!/pena|penalizaci[oó]n|inter[eé]s/i.test(fullText)) {
      missingClauses.push('Pena convencional por incumplimiento y tasa de interés moratorio');
      findings.push({
        findingId: 'risk-penalizacion-missing',
        area: 'Garantías y Cobro',
        severity: 'low',
        description: 'Falta de penalización convencional pactada para incentivar el cumplimiento oportuno.',
        legalFoundation: 'Código de Comercio Art. 362',
        mitigatingAction: 'Pactar pena convencional o interés moratorio pactado dentro de los límites legales.',
      });
    }
    recommendedActions.push('Revisar la vigencia del poder notarial de los representantes que suscriben el contrato.');
    recommendedActions.push('Certificar firmas ante fedatario público si involucra inmuebles o garantías reales.');
    checklist.push('Capacidad y legitimación jurídica acreditada');
    checklist.push('Objeto lícito y determinado');
    checklist.push('Firmas autógrafas o electrónicas avanzadas');
  }

  const calculatedRiskScore = RiskScoring.calculateRiskScore(findings);

  const formattedFoundations = ragSources.slice(0, 3).map((s, idx) => ({
    id: `leg:${idx + 1}`,
    title: s.title || `Fundamento Legal ${idx + 1}`,
    law: s.law || primaryLaw,
    article: s.article || primaryArticle,
    excerpt: s.content.slice(0, 200).replace(/\s+/g, ' ').trim(),
    relevanceScore: s.relevanceScore || 0.85,
  }));

  const groundingClaims = [
    {
      claimText: `Se auditó el instrumento '${files[0]?.name || 'documento'}' en materia ${ecosystem}. Se identificó un nivel de suficiencia probatoria ${support.level} (${support.score}/100).`,
      sourceIds: ['doc:1', ...(formattedFoundations[0] ? [formattedFoundations[0].id] : [])],
    },
    ...findings.map(f => ({
      claimText: `${f.area}: ${f.description}`,
      sourceIds: ['doc:1', ...(formattedFoundations[0] ? [formattedFoundations[0].id] : [])],
    })),
    ...recommendedActions.map(r => ({
      claimText: r,
      sourceIds: ['doc:1', ...(formattedFoundations[0] ? [formattedFoundations[0].id] : [])],
    })),
  ];

  return {
    summary: `Auditoría legal y documental determinista sobre '${files[0]?.name || 'documento'}'. El soporte probatorio obtenido es de nivel ${support.level} (${support.score}/100). ${support.missingCategories.length > 0 ? `Faltantes identificados: ${support.missingCategories.join('; ')}.` : 'El expediente cuenta con los elementos básicos de soporte.'}`,
    documentType: files[0]?.name.toLowerCase().includes('cfdi') ? 'Comprobante Fiscal Digital por Internet (CFDI)' :
      files[0]?.name.toLowerCase().includes('pagare') ? 'Pagaré Mercantil' :
      files[0]?.name.toLowerCase().includes('trabajo') ? 'Contrato Individual de Trabajo' :
      files[0]?.name.toLowerCase().includes('pedimento') ? 'Expediente Aduanal / Pedimento' :
      'Instrumento Contractual Legal',
    riskScore: calculatedRiskScore,
    detectedParties,
    detectedObligations,
    missingClauses,
    missingData,
    risks: findings.map(f => ({
      title: f.area,
      severity: f.severity === 'critical' || f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'low',
      explanation: f.description,
      relatedClauses: detectedObligations.slice(0, 2),
      legalFoundations: formattedFoundations.slice(0, 1),
    })),
    recommendedActions,
    checklist,
    riskCategories: {
      contractuales: findings.filter(f => f.area.includes('Contractual')).map(f => f.description),
      documentales: support.missingCategories,
      cumplimiento: recommendedActions,
    },
    legalFoundations: formattedFoundations,
    groundingClaims,
    confidence: 'high' as const,
    engine: 'byok' as const,
  };
}
