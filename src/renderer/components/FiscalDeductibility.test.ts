import { describe, expect, it } from 'vitest';
import { buildDeductibilityAssessment } from './FiscalDeductibility';

describe('buildDeductibilityAssessment', () => {
  it('marks a fully supported expense as highly deductible and creditable', () => {
    const result = buildDeductibilityAssessment({
      cfdi: 'Sí, CFDI vigente',
      paymentMethod: 'Transferencia, cheque o tarjeta desde cuenta del contribuyente',
      businessNeed: 'Servicio indispensable para mantener la operación comercial de la compañía.',
      documentaryEvidence: 'Contrato, entregables, recepción y pagos completos',
      economicActivityRelation: 'Directa y demostrable con ingresos u operación',
      vatRequirements: 'IVA expreso y separado, efectivamente pagado y gasto deducible',
    });

    expect(result.deductibility).toBe('Sólido');
    expect(result.vatCredit).toBe('Sólido');
    expect(result.fulfilled.length).toBeGreaterThanOrEqual(6);
  });

  it('identifies the missing evidence of an unsupported expense', () => {
    const result = buildDeductibilityAssessment({
      cfdi: 'No',
      paymentMethod: 'Efectivo',
      businessNeed: 'No definida',
      documentaryEvidence: 'Sin evidencia adicional al CFDI',
      economicActivityRelation: 'No claramente relacionada',
      vatRequirements: 'Sin IVA trasladado o requisitos incompletos',
    });

    expect(result.deductibility).toBe('Insuficiente');
    expect(result.vatCredit).toBe('Insuficiente');
    expect(result.missing).toEqual(expect.arrayContaining([
      expect.stringContaining('CFDI vigente'),
      expect.stringContaining('materialidad'),
    ]));
  });

  it('deduplicates pending requirements', () => {
    const result = buildDeductibilityAssessment({});
    expect(new Set(result.missing).size).toBe(result.missing.length);
  });
});
