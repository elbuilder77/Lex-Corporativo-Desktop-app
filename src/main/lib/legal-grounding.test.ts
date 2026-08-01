import { describe, expect, it, vi } from 'vitest';
import {
  renderGroundedClaims,
  validateGroundedLegalOutput,
  validateOrRepairStructuredGroundedOutput,
  validateStructuredGroundedOutput,
  type StructuredGroundedOutput,
} from './legal-grounding';

const sources = [
  { id: 'law:cff:69-b', kind: 'legal' as const, law_code: 'CFF', article_number: 'Artículo 69-B', content: 'Procedimiento aplicable a comprobantes de operaciones inexistentes.' },
  { id: 'law:lisr:27', kind: 'legal' as const, law_code: 'LISR', article_number: 'Artículo 27', content: 'Requisitos de las deducciones autorizadas.' },
  { id: 'doc:1', kind: 'evidence' as const, title: 'Contrato.pdf', content: 'El contrato carece de entregables.' },
];

describe('legal response grounding gate', () => {
  it('keeps exact provision allow-list validation for grounded output', () => {
    const result = validateGroundedLegalOutput(
      'El CFF, Artículo 69-B establece un procedimiento aplicable a comprobantes de operaciones inexistentes.',
      sources,
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a fabricated claim even when it cites a retrieved provision', () => {
    const result = validateGroundedLegalOutput(
      'El CFF, Artículo 69-B permite deducir cualquier gasto sin requisitos.',
      sources,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_claim');
  });

  it('rejects a fabricated number absent from the cited provision', () => {
    const result = validateGroundedLegalOutput(
      'El CFF, Artículo 69-B establece un plazo de 90 días para el contribuyente.',
      sources,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_claim');
  });

  it('rejects a local citation not present in retrieved sources', () => {
    const result = validateGroundedLegalOutput('También resulta aplicable el Artículo 113 del CFF.', sources);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unsupported_citation');
  });

  it('accepts structured claims linked to exact source identifiers', () => {
    const result = validateStructuredGroundedOutput({
      claims: [{
        claimId: 'risk-1',
        heading: 'Riesgo',
        text: 'El contrato requiere revisar la evidencia de materialidad.',
        sourceIds: ['law:cff:69-b', 'doc:1'],
      }],
    }, sources, { requiredSourceKinds: ['legal', 'evidence'] });

    expect(result.valid).toBe(true);
    expect(result.cited).toEqual(['law:cff:69-b', 'doc:1']);
  });

  it('rejects provider-invented source identifiers without lexical guessing', () => {
    const result = validateStructuredGroundedOutput({
      claims: [{
        claimId: 'risk-1',
        heading: 'Riesgo',
        text: 'Existe un plazo aplicable.',
        sourceIds: ['law:cff:invented'],
      }],
    }, sources);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unknown_source_id');
    expect(result.unsupported).toEqual(['law:cff:invented']);
  });

  it('rejects required analysis claims omitted from the grounding map', () => {
    const result = validateStructuredGroundedOutput({
      claims: [{
        claimId: 'summary',
        heading: 'Resumen',
        text: 'Resumen distinto.',
        sourceIds: ['law:cff:69-b'],
      }],
    }, sources, { requiredClaimTexts: ['Riesgo fiscal identificado.'] });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing_required_claim');
  });

  it('allows one structured repair pass and revalidates exact IDs', async () => {
    const initial: StructuredGroundedOutput = {
      claims: [{ claimId: 'answer', heading: 'Respuesta', text: 'Texto inicial.', sourceIds: ['invented'] }],
    };
    const repair = vi.fn().mockResolvedValue({
      claims: [{ claimId: 'answer', heading: 'Respuesta', text: 'Texto corregido.', sourceIds: ['law:cff:69-b'] }],
    });

    const result = await validateOrRepairStructuredGroundedOutput(initial, sources, {}, repair);
    expect(repair).toHaveBeenCalledOnce();
    expect(result.repaired).toBe(true);
    expect(result.initialValidation?.reason).toBe('unknown_source_id');
    expect(result.validation.valid).toBe(true);
  });

  it('renders traceable source labels without exposing raw IDs as the only reference', () => {
    const rendered = renderGroundedClaims({
      claims: [{ claimId: 'answer', heading: 'Respuesta ejecutiva', text: 'Texto sustentado.', sourceIds: ['law:cff:69-b'] }],
    }, sources);

    expect(rendered).toContain('Respuesta ejecutiva');
    expect(rendered).toContain('Fuentes vinculadas: CFF Artículo 69-B');
  });
});
