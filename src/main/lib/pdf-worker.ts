import { parentPort } from 'worker_threads';
import { createHash } from 'crypto';
import { PDFParse } from 'pdf-parse';

function sha256Content(content: string | Buffer | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractTextContentWorker(buffer: Buffer, fileName: string) {
  if (buffer.length === 0) {
    throw new Error(`El PDF '${fileName}' está vacío.`);
  }

  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText({
      lineEnforce: true,
      pageJoiner: '',
    });

    const pages = result.pages
      .map((page: any) => ({
        pageNumber: page.num,
        text: cleanExtractedText(page.text),
      }))
      .filter((page: any) => page.text.length > 0);

    const text = pages
      .map((page: any) => `[Página ${page.pageNumber}]\n${page.text}`)
      .join('\n\n')
      .trim();

    if (!text) {
      throw new Error(`No se pudo extraer texto seleccionable de '${fileName}'.`);
    }

    return {
      fileName,
      text,
      pages,
      pageCount: result.total || pages.length,
      contentHash: sha256Content(text),
    };
  } finally {
    await parser.destroy();
  }
}

if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      const { buffer, fileName, id } = message;
      const result = await extractTextContentWorker(buffer, fileName);
      parentPort!.postMessage({ id, result });
    } catch (error: any) {
      parentPort!.postMessage({ id: message.id, error: error.message || String(error) });
    }
  });
}
