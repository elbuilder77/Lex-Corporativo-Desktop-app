import { describe, expect, it } from 'vitest';

import { chunkDocumentPages, chunkText } from './chunking';
import { sha256Content } from './pdf-parser';

describe('SES-style recursive chunking', () => {
  it('splits legal text on natural boundaries before hard-splitting', () => {
    const text = [
      'Cláusula primera. El acreditado pagará el saldo insoluto dentro del plazo pactado.',
      'Cláusula segunda. El aval responderá solidariamente por capital, intereses y accesorios.',
      'Cláusula tercera. Las partes se someten a los tribunales mercantiles competentes.',
    ].join('\n\n');

    const chunks = chunkText(text, { chunkSize: 110, chunkOverlap: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.length <= 110)).toBe(true);
    expect(chunks.some(chunk => chunk.includes('Cláusula segunda. El aval responderá'))).toBe(true);
  });

  it('preserves page metadata while chunking PDF pages', () => {
    const chunks = chunkDocumentPages([
      { pageNumber: 3, text: 'Pagaré mercantil. '.repeat(20) },
    ], { chunkSize: 80, chunkOverlap: 10 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({ chunkIndex: 0, pageNumber: 3 });
    expect(chunks.every(chunk => chunk.pageNumber === 3)).toBe(true);
  });

  it('computes deterministic SHA-256 hashes for document content', () => {
    const content = 'Contrato de suministro con cláusula penal.';

    expect(sha256Content(content)).toBe(sha256Content(content));
    expect(sha256Content(content)).not.toBe(sha256Content(`${content} modificado`));
  });
});
