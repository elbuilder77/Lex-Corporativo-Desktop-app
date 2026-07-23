import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const expectedModelName = 'gemma-2-2b-it-Q4_K_M.gguf';
const destination = path.resolve(__dirname, '..', 'src-rust', 'models', expectedModelName);
const ollamaModelsRoot = path.resolve(
  process.env.OLLAMA_MODELS || path.join(os.homedir(), '.ollama', 'models'),
);

function isGguf(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 4) return false;
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(4);
    fs.readSync(descriptor, header, 0, header.length, 0);
    return header.toString('ascii') === 'GGUF';
  } finally {
    fs.closeSync(descriptor);
  }
}

function collectFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.isFile()) files.push(fullPath);
    }
  }
  return files;
}

function compatibleGemmaManifest(manifestPath, manifestsRoot) {
  const relative = path.relative(manifestsRoot, manifestPath).replaceAll('\\', '/').toLowerCase();
  return relative.includes('/gemma2/') && /(?:^|[/_-])2b(?:$|[/_.-])/i.test(relative);
}

function findOllamaGemmaBlob() {
  const manifestsRoot = path.join(ollamaModelsRoot, 'manifests');
  const blobsRoot = path.join(ollamaModelsRoot, 'blobs');
  const manifests = collectFiles(manifestsRoot).filter(file => compatibleGemmaManifest(file, manifestsRoot));

  for (const manifestPath of manifests) {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      continue;
    }
    for (const layer of manifest.layers || []) {
      if (!String(layer.mediaType || '').includes('model')) continue;
      const digest = String(layer.digest || '');
      if (!/^sha256:[a-f0-9]{64}$/i.test(digest)) continue;
      const blobPath = path.join(blobsRoot, digest.replace(':', '-'));
      if (isGguf(blobPath)) return { blobPath, manifestPath };
    }
  }
  return null;
}

if (fs.existsSync(destination)) {
  if (!isGguf(destination)) {
    console.error(`El archivo local existe pero no tiene cabecera GGUF válida: ${destination}`);
    process.exit(1);
  }
  console.log(`Modelo local verificado: ${destination}`);
  process.exit(0);
}

const ollamaModel = findOllamaGemmaBlob();
if (!ollamaModel) {
  console.error([
    `No se encontró ${expectedModelName}.`,
    `Tampoco existe un manifiesto compatible de Gemma 2 2B en ${ollamaModelsRoot}.`,
    'Instala el modelo compatible en Ollama o ejecuta: node scripts/download-model.mjs',
    'El empaquetado se detiene para no producir una aplicación con modo local incompleto.',
  ].join('\n'));
  process.exit(1);
}

fs.mkdirSync(path.dirname(destination), { recursive: true });
const partialDestination = `${destination}.part`;
try {
  fs.copyFileSync(ollamaModel.blobPath, partialDestination);
  if (!isGguf(partialDestination)) throw new Error('El blob copiado no tiene una cabecera GGUF válida.');
  fs.renameSync(partialDestination, destination);
  const sizeMb = (fs.statSync(destination).size / 1024 / 1024).toFixed(1);
  console.log(`Modelo Gemma importado desde Ollama (${sizeMb} MB).`);
  console.log(`Manifiesto: ${ollamaModel.manifestPath}`);
  console.log(`Destino: ${destination}`);
} catch (error) {
  if (fs.existsSync(partialDestination)) fs.unlinkSync(partialDestination);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
