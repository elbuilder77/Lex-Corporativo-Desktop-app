import { pipeline, env } from '@xenova/transformers';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelPath = path.join(__dirname, '..', 'legal-runtime', 'models');
env.localModelPath = modelPath;
env.cacheDir = modelPath;

console.log('Downloading Xenova/all-MiniLM-L6-v2 embedding model to', modelPath);

try {
  await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('Download complete! Model is ready for offline packaging.');
} catch (error) {
  console.error('Failed to download the embedding model:', error);
  process.exit(1);
}
