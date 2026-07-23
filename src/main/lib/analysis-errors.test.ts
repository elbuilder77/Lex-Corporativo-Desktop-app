import { describe, expect, it } from 'vitest';
import { formatAnalyzeError } from './analysis-errors';

describe('formatAnalyzeError', () => {
  it('maps timeout failures to an actionable local-analysis message', () => {
    expect(formatAnalyzeError(new Error('TIMEOUT')))
      .toContain('excedió el límite');
  });

  it('maps PDFs without selectable text to an OCR instruction', () => {
    const result = formatAnalyzeError(new Error("No se pudo extraer texto seleccionable de 'escaneado.pdf'."));

    expect(result).toContain('texto seleccionable');
    expect(result).toContain('OCR');
  });

  it('maps protected or damaged PDFs to a readable document warning', () => {
    const result = formatAnalyzeError(new Error('Invalid PDF structure: encrypted document'));

    expect(result).toContain('protegido con contraseña');
    expect(result).toContain('dañado');
  });

  it('preserves unsupported file type details', () => {
    expect(formatAnalyzeError(new Error('Tipo de archivo no soportado: text/plain')))
      .toBe('Tipo de archivo no soportado: text/plain');
  });
});
