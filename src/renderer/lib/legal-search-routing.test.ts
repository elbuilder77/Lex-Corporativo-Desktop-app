import { describe, expect, it } from 'vitest';
import { detectLikelyLegalModule, suggestAlternativeLegalModule } from './legal-search-routing';

describe('legal search routing', () => {
  it('recognizes explicit fiscal provisions', () => {
    expect(detectLikelyLegalModule('¿Qué establece el artículo 69-B del CFF?')).toBe('fiscal');
    expect(suggestAlternativeLegalModule('CFDI e IVA acreditable', 'mercantil')).toBe('fiscal');
  });

  it('recognizes explicit mercantile concepts', () => {
    expect(detectLikelyLegalModule('Asamblea de accionistas conforme a la LGSM')).toBe('mercantil');
    expect(suggestAlternativeLegalModule('Requisitos de un pagaré en la LGTOC', 'fiscal')).toBe('mercantil');
  });

  it('recognizes labor, foreign-trade, and customs short queries', () => {
    expect(detectLikelyLegalModule('prestaciones trabajadores del hogar')).toBe('laboral');
    expect(detectLikelyLegalModule('cuotas compensatorias LCE')).toBe('comercio_exterior');
    expect(detectLikelyLegalModule('rectificacion de pedimento')).toBe('aduanal');
  });

  it('suggests a different module across all supported subjects', () => {
    expect(suggestAlternativeLegalModule('jornada y salario LFT', 'fiscal')).toBe('laboral');
    expect(suggestAlternativeLegalModule('certificado de origen LCE', 'mercantil')).toBe('comercio_exterior');
    expect(suggestAlternativeLegalModule('PAMA y embargo precautorio', 'laboral')).toBe('aduanal');
  });

  it('does not redirect ambiguous language', () => {
    expect(detectLikelyLegalModule('obligaciones de las partes en un contrato')).toBeNull();
    expect(suggestAlternativeLegalModule('consulta sobre una operación', 'fiscal')).toBeNull();
  });
});
