import { describe, expect, it } from 'vitest';
import { chunkDocumentPages, chunkText } from './chunking';
import { sha256Content } from './pdf-parser';

describe('chunking especializado legal', () => {
  it('respeta límites naturales de cláusulas contractuales mexicanas', () => {
    const contratoText = `DECLARACIONES
I. Declara la parte arrendadora que es propietaria del inmueble.
II. Declara la parte arrendataria que tiene capacidad para contratar.

CLÁUSULA PRIMERA.- OBJETO DEL CONTRATO.
El arrendador concede el uso y goce temporal del inmueble ubicado en Calle 50 número 100.

CLÁUSULA SEGUNDA.- PRECIO DEL ARRENDAMIENTO.
El arrendatario pagará mensualmente la cantidad de $25,000.00 pesos netos dentro de los primeros 5 días.

CLÁUSULA TERCERA.- VIGENCIA.
La vigencia del presente contrato será de 12 meses forzosos para ambas partes.`;

    const chunks = chunkText(contratoText, { chunkSize: 250, chunkOverlap: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.some(c => c.includes('CLÁUSULA PRIMERA.- OBJETO DEL CONTRATO'))).toBe(true);
    expect(chunks.some(c => c.includes('CLÁUSULA SEGUNDA.- PRECIO DEL ARRENDAMIENTO'))).toBe(true);
    expect(chunks.some(c => c.includes('CLÁUSULA TERCERA.- VIGENCIA'))).toBe(true);
  });

  it('preserva metadatos de página mientras fragmenta páginas PDF', () => {
    const chunks = chunkDocumentPages([
      { pageNumber: 3, text: 'Pagaré mercantil. '.repeat(20) },
    ], { chunkSize: 80, chunkOverlap: 10 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({ chunkIndex: 0, pageNumber: 3 });
    expect(chunks.every(chunk => chunk.pageNumber === 3)).toBe(true);
  });

  it('computa hashes SHA-256 determinísticos para contenido de documento', () => {
    const content = 'Contrato de suministro con cláusula penal.';

    expect(sha256Content(content)).toBe(sha256Content(content));
    expect(sha256Content(content)).not.toBe(sha256Content(`${content} modificado`));
  });
});
