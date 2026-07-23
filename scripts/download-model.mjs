import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_NAME = 'Gemma 2 2B Instruct Q4_K_M';
const MODEL_URL = 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf';
const MODELS_DIR = path.join(__dirname, '../src-rust/models');
const MODEL_FILE_NAME = 'gemma-2-2b-it-Q4_K_M.gguf';
const MODEL_FILE = path.join(MODELS_DIR, MODEL_FILE_NAME);
const PARTIAL_FILE = `${MODEL_FILE}.part`;

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

if (fs.existsSync(MODEL_FILE)) {
  const sizeMb = (fs.statSync(MODEL_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`${MODEL_NAME} ya existe en ${MODEL_FILE} (${sizeMb} MB).`);
  process.exit(0);
}

if (fs.existsSync(PARTIAL_FILE)) {
  fs.unlinkSync(PARTIAL_FILE);
}

console.log(`Iniciando descarga del modelo ${MODEL_NAME}...`);
console.log('URL:', MODEL_URL);
console.log('Destino:', MODEL_FILE);

function get(url, redirectCount = 0) {
  if (redirectCount > 5) {
    return Promise.reject(new Error('Demasiadas redirecciones al descargar el modelo.'));
  }

  return new Promise((resolve, reject) => {
    const headers = process.env.HF_TOKEN
      ? { Authorization: `Bearer ${process.env.HF_TOKEN}` }
      : undefined;
    const request = https.get(url, { headers }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode || 0)) {
        response.resume();
        const location = response.headers.location;
        if (!location) {
          reject(new Error(`Redirección HTTP ${response.statusCode} sin Location.`));
          return;
        }
        console.log('Redirigiendo a:', location);
        resolve(get(location, redirectCount + 1));
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        const authHint = response.statusCode === 401 || response.statusCode === 403
          ? ' Configure HF_TOKEN con un token de Hugging Face que tenga acceso a Gemma, o coloque el GGUF manualmente en src-rust/models.'
          : '';
        reject(new Error(`Error HTTP ${response.statusCode}.${authHint}`));
        return;
      }

      const total = Number.parseInt(response.headers['content-length'] || '0', 10);
      let downloaded = 0;
      const file = fs.createWriteStream(PARTIAL_FILE);

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total > 0) {
          const progress = ((downloaded / total) * 100).toFixed(2);
          process.stdout.write(`\rDescargando... ${progress}% (${(downloaded / 1024 / 1024).toFixed(2)} MB)`);
        } else {
          process.stdout.write(`\rDescargando... ${(downloaded / 1024 / 1024).toFixed(2)} MB`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          if (total > 0 && downloaded !== total) {
            reject(new Error(`Descarga incompleta: ${downloaded} de ${total} bytes.`));
            return;
          }

          fs.renameSync(PARTIAL_FILE, MODEL_FILE);
          console.log('\nDescarga completada con éxito.');
          resolve();
        });
      });

      file.on('error', reject);
      response.on('error', reject);
    });

    request.on('error', reject);
  });
}

try {
  await get(MODEL_URL);
} catch (error) {
  if (fs.existsSync(PARTIAL_FILE)) {
    fs.unlinkSync(PARTIAL_FILE);
  }
  console.error('\nError en la descarga:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
