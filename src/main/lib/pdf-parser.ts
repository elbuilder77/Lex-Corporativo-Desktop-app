import { createHash } from 'crypto';
import { PDFParse } from 'pdf-parse';
import { Worker } from 'worker_threads';
import { join } from 'path';

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedPdfDocument {
  fileName: string;
  text: string;
  pages: ExtractedPdfPage[];
  pageCount: number;
  contentHash: string;
}

export function sha256Content(content: string | Buffer | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PDF_PAGES = 500;

// Fallback synchronous/blocking extraction
export async function extractTextContent(
  buffer: Buffer,
  fileName: string
): Promise<ExtractedPdfDocument> {
  if (buffer.length === 0) {
    throw new Error(`El PDF '${fileName}' está vacío.`);
  }
  if (buffer.length > MAX_PDF_SIZE) {
    throw new Error(`El PDF '${fileName}' excede el tamaño máximo permitido (${MAX_PDF_SIZE / 1024 / 1024}MB).`);
  }

  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText({
      lineEnforce: true,
      pageJoiner: '',
    });

    if (result.total && result.total > MAX_PDF_PAGES) {
      throw new Error(`El PDF '${fileName}' excede el número máximo de páginas permitidas (${MAX_PDF_PAGES}).`);
    }

    const pages = result.pages
      .map(page => ({
        pageNumber: page.num,
        text: cleanExtractedText(page.text),
      }))
      .filter(page => page.text.length > 0);

    const text = pages
      .map(page => `[Página ${page.pageNumber}]\n${page.text}`)
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

export const PDF_WORKER_TIMEOUT_MS = 30_000;

let workerInstance: Worker | null = null;
let messageIdCounter = 0;
const pendingRequests = new Map<
  number,
  {
    resolve: (val: ExtractedPdfDocument) => void;
    reject: (err: any) => void;
    timer?: NodeJS.Timeout;
  }
>();

function getWorker(): Worker {
  if (!workerInstance) {
    // Ensure we point to the correct worker file path in development and testing.
    // In Vitest tests, __dirname points to src/main/lib directly so we need .ts extension.
    let workerPath = join(__dirname, 'pdf-worker.js');
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      workerPath = join(__dirname, 'pdf-worker.ts');
    }
    workerInstance = new Worker(workerPath);

    workerInstance.on('message', (message) => {
      const { id, result, error } = message;
      const handlers = pendingRequests.get(id);
      if (handlers) {
        if (handlers.timer) clearTimeout(handlers.timer);
        pendingRequests.delete(id);
        if (error) {
          handlers.reject(new Error(error));
        } else {
          handlers.resolve(result);
        }
      }
    });

    workerInstance.on('error', (error) => {
      console.error('[PDF Worker] Falla inesperada:', error);
      workerInstance = null; // Reset to recreate next time
      pendingRequests.forEach(({ reject, timer }) => {
        if (timer) clearTimeout(timer);
        reject(new Error('PDF Worker falló inesperadamente'));
      });
      pendingRequests.clear();
    });

    workerInstance.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[PDF Worker] Terminó con código ${code}`);
      }
      workerInstance = null;
      pendingRequests.forEach(({ reject, timer }) => {
        if (timer) clearTimeout(timer);
        reject(new Error('PDF Worker fue terminado'));
      });
      pendingRequests.clear();
    });
  }
  return workerInstance;
}

export function extractTextContentAsync(
  buffer: Buffer,
  fileName: string,
  timeoutMs: number = PDF_WORKER_TIMEOUT_MS
): Promise<ExtractedPdfDocument> {
  return new Promise((resolve, reject) => {
    const id = ++messageIdCounter;
    let timer: NodeJS.Timeout | undefined;

    if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
      timer = setTimeout(() => {
        const handlers = pendingRequests.get(id);
        if (handlers) {
          pendingRequests.delete(id);
          console.warn(`[PDF Worker] Timeout de ${timeoutMs}ms al procesar '${fileName}'. Reiniciando worker.`);
          if (workerInstance) {
            workerInstance.terminate().catch(() => undefined);
            workerInstance = null;
          }
          handlers.reject(
            new Error(
              `El procesamiento del documento '${fileName}' excedió el tiempo límite de ${Math.round(timeoutMs / 1000)}s.`
            )
          );
        }
      }, timeoutMs);
    }

    pendingRequests.set(id, { resolve, reject, timer });

    try {
      const worker = getWorker();
      worker.postMessage({ id, buffer, fileName });
    } catch (err) {
      if (timer) clearTimeout(timer);
      pendingRequests.delete(id);
      console.error('[PDF Worker] Error al inicializar worker. Cayendo a parser síncrono.', err);
      // Fallback to synchronous extraction if worker creation fails
      extractTextContent(buffer, fileName).then(resolve).catch(reject);
    }
  });
}
