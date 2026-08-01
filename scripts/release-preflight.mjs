import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv.includes('--target=mac') ? 'mac' : process.argv.includes('--target=linux') ? 'linux' : 'win';
const strict = process.argv.includes('--strict');
const checks = [];

function check(id, ok, detail, blocking = true) {
  checks.push({ id, status: ok ? 'pass' : blocking ? 'fail' : 'warn', detail });
}

function exists(relative) {
  return fs.existsSync(path.join(root, relative));
}

check('vector-store', exists('src-rust/lance_data/legal_knowledge.lance'), 'LanceDB legal_knowledge.lance');
check('corpus-manifest', exists('src-rust/corpus/corpus-manifest.json'), 'Manifiesto canónico del corpus');
check('embedding-model', exists('src-rust/models/Xenova/all-MiniLM-L6-v2/onnx/model_quantized.onnx'), 'ONNX MiniLM cuantizado');
check('templates', exists('plantillas'), 'Directorio de plantillas');
check('app-icon', target === 'mac' ? exists('resources/icon.icns') : exists('resources/icon.png'), target === 'mac' ? 'resources/icon.icns' : 'resources/icon.png');

const signingConfigured = target !== 'win' || Boolean(process.env.CSC_LINK || process.env.WIN_CSC_LINK || process.env.CSC_NAME);
check('code-signing', signingConfigured, target === 'win' ? 'Certificado/identidad de firma disponible en el entorno' : 'Firma aplicable al destino', strict);

const failures = checks.filter(item => item.status === 'fail');
const report = {
  generatedAt: new Date().toISOString(),
  target,
  strict,
  status: failures.length ? 'fail' : 'pass',
  checks,
  nextCommand: failures.length ? null : 'npm run build:electron',
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
