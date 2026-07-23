import { describe, expect, it } from 'vitest';

import { chunkText } from '../src/main/lib/chunking';

describe('chunking recursivo para documentos legales', () => {
  it('respeta el tamaño máximo y prioriza saltos de párrafo', () => {
    const text = [
      'Cláusula primera. El proveedor entregará los bienes dentro del plazo pactado.',
      'Cláusula segunda. El comprador pagará el precio contra entrega y aceptación documental.',
      'Cláusula tercera. La pena convencional aplicará por cada día de retraso imputable.',
    ].join('\n\n');

    const chunks = chunkText(text, { chunkSize: 115, chunkOverlap: 0 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.length <= 115)).toBe(true);
    expect(chunks).toContain('Cláusula primera. El proveedor entregará los bienes dentro del plazo pactado.');
    expect(chunks).toContain('Cláusula segunda. El comprador pagará el precio contra entrega y aceptación documental.');
  });

  it('usa puntos finales como frontera cuando el párrafo excede el tamaño máximo', () => {
    const text = 'Primera oración completa con obligación mercantil. Segunda oración completa con garantía solidaria. Tercera oración completa con jurisdicción pactada.';

    const chunks = chunkText(text, { chunkSize: 70, chunkOverlap: 0 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.length <= 70)).toBe(true);
    expect(chunks[0]).toBe('Primera oración completa con obligación mercantil');
    expect(chunks[1]).toBe('Segunda oración completa con garantía solidaria');
  });

  it('aplica corte duro solo cuando no existen separadores naturales', () => {
    const text = 'A'.repeat(155);

    const chunks = chunkText(text, { chunkSize: 50, chunkOverlap: 10 });

    expect(chunks).toHaveLength(4);
    expect(chunks.every(chunk => chunk.length <= 50)).toBe(true);
    expect(chunks[1].startsWith('A')).toBe(true);
  });
});
