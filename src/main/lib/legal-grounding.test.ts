import { describe, expect, it, vi } from 'vitest';
import { validateGroundedLegalOutput, validateOrRepairGroundedOutput } from './legal-grounding';

const sources = [
  { law_code: 'CFF', article_number: 'Artículo 69-B', content: 'El artículo 69-B establece el procedimiento aplicable a comprobantes de operaciones inexistentes.' },
  { law_code: 'LISR', article_number: 'Artículo 27', content: 'Las deducciones autorizadas deberán reunir los requisitos establecidos.' },
];

describe('legal response grounding gate', () => {
  it('accepts citations that were actually retrieved', () => {
    const result = validateGroundedLegalOutput(
      'El CFF, Artículo 69-B establece el procedimiento descrito en el fundamento recuperado.',
      sources,
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a citation not present in the retrieved context', () => {
    const result = validateGroundedLegalOutput(
      'También resulta aplicable el Artículo 113 del CFF.',
      sources,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_citation');
  });

  it('rejects an uncited legal answer', () => {
    const result = validateGroundedLegalOutput('La operación es deducible sin más requisitos.', sources);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing_citation');
  });

  it('rejects a legal claim that is not supported by the cited fragment', () => {
    const result = validateGroundedLegalOutput(
      'El CFF, Artículo 69-B permite deducir cualquier gasto sin requisitos.',
      sources,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_claim');
  });

  it('rejects an invented quantified deadline', () => {
    const result = validateGroundedLegalOutput(
      'El CFF, Artículo 69-B establece un plazo de 90 días para el contribuyente.',
      sources,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_claim');
  });

  it('can validate uncited drafting claims against user evidence', () => {
    const result = validateGroundedLegalOutput(
      'El proveedor deberá entregar el informe dentro de 15 días.',
      [{ content: 'El proveedor entregará el informe dentro de 15 días.' }],
      { requireCitation: false },
    );
    expect(result.valid).toBe(true);
  });

  it('rejects an invented drafting quantity even when citations are optional', () => {
    const result = validateGroundedLegalOutput(
      'El proveedor deberá entregar el informe dentro de 90 días.',
      [{ content: 'El proveedor entregará el informe dentro de 15 días.' }],
      { requireCitation: false },
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_claim');
  });

  it('allows one constrained repair pass before rejecting a remote answer', async () => {
    const repair = vi.fn().mockResolvedValue(
      'El CFF, Artículo 69-B establece el procedimiento aplicable a comprobantes de operaciones inexistentes.',
    );
    const result = await validateOrRepairGroundedOutput(
      'La operación es deducible sin más requisitos.',
      sources,
      {},
      repair,
    );

    expect(repair).toHaveBeenCalledOnce();
    expect(result.repaired).toBe(true);
    expect(result.initialValidation?.reason).toBe('missing_citation');
    expect(result.validation.valid).toBe(true);
  });

  it('does not call the repair provider when the first answer is grounded', async () => {
    const repair = vi.fn();
    const result = await validateOrRepairGroundedOutput(
      'El CFF, Artículo 69-B establece el procedimiento descrito en el fundamento recuperado.',
      sources,
      {},
      repair,
    );

    expect(repair).not.toHaveBeenCalled();
    expect(result.repaired).toBe(false);
    expect(result.validation.valid).toBe(true);
  });
});
