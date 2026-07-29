import { describe, expect, it } from 'vitest';
import type { DocumentAnalysisResult } from '../types';
import { buildFiscalEvidenceMatrix, mergeFiscalEvidence, summarizeFiscalEvidence } from './fiscal-evidence';

const result: DocumentAnalysisResult = {
  summary: 'Revisión lista.',
  documentType: 'Revisión fiscal',
  riskScore: 40,
  detectedParties: [],
  detectedObligations: ['Existe CFDI de la operación.'],
  missingClauses: [],
  missingData: ['Comprobante bancario.'],
  risks: [{
    title: 'Contrato incompleto',
    severity: 'medium',
    explanation: 'No define entregables.',
    relatedClauses: [],
    legalFoundations: [{ id: 'lisr-27', title: 'Deducciones', law: 'LISR', article: '27' }],
  }],
  recommendedActions: ['Completar el contrato.'],
  legalFoundations: [{ id: 'cff-29', title: 'CFDI', law: 'CFF', article: '29-A' }],
  confidence: 'medium',
  engine: 'rules',
};

describe('fiscal evidence matrix', () => {
  it('turns a result into available, attention and missing records', () => {
    const matrix = buildFiscalEvidenceMatrix(result, [{ name: 'cfdi.xml' }], 'analysis-1');

    expect(matrix.map((item) => item.status)).toEqual(['supported', 'attention', 'missing']);
    expect(matrix[1]).toMatchObject({
      title: 'Contrato incompleto',
      sourceFiles: ['cfdi.xml'],
      action: 'Completar el contrato.',
    });
    expect(matrix[1].foundations).toContain('LISR · 27');
  });

  it('merges repeated evidence and excludes attended items from pending counts', () => {
    const matrix = buildFiscalEvidenceMatrix(result, [{ name: 'cfdi.xml' }]);
    const merged = mergeFiscalEvidence(matrix, buildFiscalEvidenceMatrix(result, [{ name: 'contrato.pdf' }]));
    const pending = merged.find((item) => item.status === 'missing')!;
    const summary = summarizeFiscalEvidence(merged, [pending.id]);

    expect(merged).toHaveLength(3);
    expect(merged[0].sourceFiles).toEqual(['cfdi.xml', 'contrato.pdf']);
    expect(summary).toEqual({ supported: 1, attention: 1, missing: 0, resolved: 1 });
  });

  it('does not count the same missing requirement again as a risk', () => {
    const duplicated = buildFiscalEvidenceMatrix({
      ...result,
      missingData: ['Comprobante bancario.'],
      risks: [{
        title: 'Requisito pendiente',
        severity: 'high',
        explanation: 'Comprobante bancario.',
        relatedClauses: [],
        legalFoundations: [],
      }],
    });

    expect(duplicated.filter((item) => item.status !== 'supported')).toHaveLength(1);
    expect(duplicated.find((item) => item.status === 'missing')?.title).toBe('Comprobante bancario.');
  });
});
