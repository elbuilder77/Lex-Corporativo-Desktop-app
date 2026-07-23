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
    evidenceItems: EvidenceItem[]
  ): { score: number; level: 'Bajo' | 'Medio' | 'Alto'; isSufficient: 'Sí' | 'Parcial' | 'No' } {
    let weight = 0;
    
    const categories = new Set(documents.map(d => d.category));
    
    // Core document categories give direct weight
    if (categories.has('contract')) weight += 20;
    if (categories.has('cfdi')) weight += 15;
    if (categories.has('payment_proof')) weight += 20;
    if (categories.has('deliverable')) weight += 25;
    if (categories.has('evidence')) weight += 15;
    if (categories.has('purchase_order') || categories.has('service_report')) weight += 5;
    
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
    
    return { score: finalScore, level, isSufficient };
  }
}

/**
 * 3. RiskScoring: Parametric risk aggregator
 */
export class RiskScoring {
  static calculateRiskScore(findings: RiskFinding[]): number {
    if (findings.length === 0) return 0;
    
    let scoreMultiplier = 0;
    
    for (const f of findings) {
      if (f.severity === 'critical') scoreMultiplier += 35;
      else if (f.severity === 'high') scoreMultiplier += 20;
      else if (f.severity === 'medium') scoreMultiplier += 10;
      else if (f.severity === 'low') scoreMultiplier += 5;
    }
    
    return Math.min(scoreMultiplier, 100);
  }
}

/**
 * 4. General JSON report structures builder
 */
export interface BaseReportData {
  reportId: string;
  caseId: string;
  ecosystem: 'fiscal' | 'mercantil';
  summary: string;
  riskScore: number;
  analyzedDocuments: string[];
  findings: RiskFinding[];
  recommendations: Recommendation[];
  timestamp: string;
}
