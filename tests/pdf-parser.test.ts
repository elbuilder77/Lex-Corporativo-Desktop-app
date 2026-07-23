import { beforeEach, describe, expect, it, vi } from 'vitest';

const pdfParseMock = vi.hoisted(() => ({
  destroy: vi.fn(),
  getText: vi.fn(),
}));

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn(function PDFParse() {
    return {
      destroy: pdfParseMock.destroy,
      getText: pdfParseMock.getText,
    };
  }),
}));

import { PDFParse } from 'pdf-parse';
import { extractTextContent, sha256Content } from '../src/main/lib/pdf-parser';

describe('pdf-parser local', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extrae texto por páginas, limpia espacios y calcula SHA-256', async () => {
    pdfParseMock.getText.mockResolvedValue({
      total: 2,
      pages: [
        { num: 1, text: '  Cláusula primera.\r\n\r\n\r\nEntrega de mercancías.  ' },
        { num: 2, text: 'Garantía\t\t solidaria.\n\nJurisdicción mercantil.' },
      ],
    });

    const result = await extractTextContent(Buffer.from('pdf-binario'), 'contrato.pdf');

    expect(PDFParse).toHaveBeenCalledWith({ data: expect.any(Uint8Array) });
    expect(result.fileName).toBe('contrato.pdf');
    expect(result.pageCount).toBe(2);
    expect(result.pages).toEqual([
      { pageNumber: 1, text: 'Cláusula primera.\n\nEntrega de mercancías.' },
      { pageNumber: 2, text: 'Garantía solidaria.\n\nJurisdicción mercantil.' },
    ]);
    expect(result.text).toContain('[Página 1]');
    expect(result.contentHash).toBe(sha256Content(result.text));
    expect(pdfParseMock.destroy).toHaveBeenCalledOnce();
  });

  it('rechaza PDFs sin texto seleccionable y libera recursos', async () => {
    pdfParseMock.getText.mockResolvedValue({
      total: 1,
      pages: [{ num: 1, text: '   \n\t   ' }],
    });

    await expect(extractTextContent(Buffer.from('pdf-escaneado'), 'escaneado.pdf'))
      .rejects
      .toThrow("No se pudo extraer texto seleccionable de 'escaneado.pdf'.");
    expect(pdfParseMock.destroy).toHaveBeenCalledOnce();
  });

  it('genera hashes determinísticos y sensibles a cambios de contenido', () => {
    const content = 'Contrato mercantil con pena convencional.';

    expect(sha256Content(content)).toBe(sha256Content(content));
    expect(sha256Content(content)).not.toBe(sha256Content(`${content} Ajuste.`));
  });
});
