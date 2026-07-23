import { describe, expect, it } from 'vitest';

import {
  DocumentClassifier,
  EvidenceMapper,
  RiskScoring,
  type OperationDocument,
  type RiskFinding
} from './business-core';

function doc(fileName: string, category?: OperationDocument['category']): OperationDocument {
  return {
    documentId: fileName,
    fileName,
    mimeType: 'application/pdf',
    category: category || DocumentClassifier.classify(fileName, 'application/pdf')
  };
}

describe('local legal business core', () => {
  it('classifies fiscal and mercantile evidence without remote services', () => {
    expect(DocumentClassifier.classify('contrato-servicios.pdf', 'application/pdf')).toBe('contract');
    expect(DocumentClassifier.classify('cfdi-factura.xml', 'application/xml')).toBe('cfdi');
    expect(DocumentClassifier.classify('comprobante-spei.pdf', 'application/pdf')).toBe('payment_proof');
    expect(DocumentClassifier.classify('reporte-entregable.pdf', 'application/pdf')).toBe('deliverable');
  });

  it('scores complete local evidence as sufficient', () => {
    const documents = [
      doc('contrato.pdf'),
      doc('cfdi.xml'),
      doc('pago-spei.pdf'),
      doc('entregable.pdf'),
      doc('evidencia.pdf')
    ];

    expect(EvidenceMapper.assessSupportStrength(documents, [])).toEqual({
      score: 95,
      level: 'Alto',
      isSufficient: 'Sí'
    });
  });

  it('aggregates local risk findings deterministically', () => {
    const findings: RiskFinding[] = [
      {
        findingId: 'F-1',
        area: 'Soporte documental',
        severity: 'high',
        description: 'Falta comprobante de pago.',
        legalFoundation: 'CFF',
        mitigatingAction: 'Agregar comprobante.'
      },
      {
        findingId: 'F-2',
        area: 'Materialidad',
        severity: 'medium',
        description: 'Falta entregable.',
        legalFoundation: 'CFF',
        mitigatingAction: 'Agregar entregable.'
      }
    ];

    expect(RiskScoring.calculateRiskScore(findings)).toBe(30);
  });
});
