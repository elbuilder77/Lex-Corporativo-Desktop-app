import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { app } from 'electron';
import { EventEmitter } from 'events';
import * as fs from 'fs';

export const rustEngineEvents = new EventEmitter();
export const EXPECTED_GGUF_MODEL = 'gemma-2-2b-it-Q4_K_M.gguf';

let engineProcess: ChildProcess | null = null;
let useMock = false;

export interface EngineMockOptions {
  isPackaged?: boolean;
  nodeEnv?: string;
  disableMock?: string;
}

export interface RustRuntimeHealth {
  binaryPath: string;
  binaryExists: boolean;
  modelsPath: string;
  expectedGgufModel: string;
  expectedGgufModelPath: string;
  expectedGgufModelExists: boolean;
  ggufModels: string[];
  embeddingModelExists: boolean;
  canUseDevelopmentMock: boolean;
}

function getRuntimeBasePaths(): { enginePath: string; modelsPath: string } {
  const isDev = !app.isPackaged;
  const binaryName = process.platform === 'win32' ? 'lex-engine.exe' : 'lex-engine';

  return {
    enginePath: isDev
      ? join(app.getAppPath(), 'src-rust', 'target', 'release', binaryName)
      : join(process.resourcesPath, 'lex-engine', binaryName),
    modelsPath: isDev
      ? join(app.getAppPath(), 'src-rust', 'models')
      : join(process.resourcesPath, 'lex-engine', 'models'),
  };
}

function findFilesByExtension(root: string, extension: string): string[] {
  if (!fs.existsSync(root)) return [];

  const matches: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) {
        matches.push(fullPath);
      }
    }
  }

  return matches;
}

export function getRustRuntimeHealth(): RustRuntimeHealth {
  const { enginePath, modelsPath } = getRuntimeBasePaths();
  const embeddingModelPath = join(modelsPath, 'Xenova', 'all-MiniLM-L6-v2', 'onnx', 'model_quantized.onnx');
  const expectedGgufModelPath = join(modelsPath, EXPECTED_GGUF_MODEL);

  return {
    binaryPath: enginePath,
    binaryExists: fs.existsSync(enginePath),
    modelsPath,
    expectedGgufModel: EXPECTED_GGUF_MODEL,
    expectedGgufModelPath,
    expectedGgufModelExists: fs.existsSync(expectedGgufModelPath),
    ggufModels: findFilesByExtension(modelsPath, '.gguf'),
    embeddingModelExists: fs.existsSync(embeddingModelPath),
    canUseDevelopmentMock: canUseRustEngineMock(),
  };
}

export function canUseRustEngineMock(options: EngineMockOptions = {}): boolean {
  const isPackaged = options.isPackaged ?? app.isPackaged;
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const disableMock = options.disableMock ?? process.env.LEX_DISABLE_ENGINE_MOCK;

  return !isPackaged && nodeEnv !== 'production' && disableMock !== '1';
}

export function getEngineUnavailableMessage(reason: string): string {
  return [
    'El motor local de análisis no está disponible.',
    `Motivo: ${reason}.`,
    'Verifique que lex-engine y sus recursos locales estén instalados antes de emitir dictámenes de producción.',
  ].join('\n');
}

export function killRustEngine() {
  if (engineProcess && !engineProcess.killed) {
    engineProcess.kill();
    engineProcess = null;
  }
}

export function getRustEngine(): ChildProcess | null {
  if (useMock) return null;
  if (engineProcess && !engineProcess.killed) {
    return engineProcess;
  }

  const isDev = !app.isPackaged;
  const { enginePath } = getRuntimeBasePaths();

  if (!fs.existsSync(enginePath)) {
    const reason = `binario no encontrado en ${enginePath}`;
    if (canUseRustEngineMock()) {
      console.warn(`[Rust Engine] ${reason}. Activando Mock nativo de desarrollo.`);
      useMock = true;
    } else {
      console.error(`[Rust Engine] ${reason}. Mock deshabilitado para runtime de producción.`);
    }
    return null;
  }

  const rustCwd = isDev 
    ? join(app.getAppPath(), 'src-rust')
    : join(process.resourcesPath, 'lex-engine');

  try {
    engineProcess = spawn(enginePath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: rustCwd,
      env: { 
        ...process.env, 
        PYTHONIOENCODING: 'utf-8',
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8'
      }
    });

    let stdoutBuffer = '';
    const MAX_BUFFER = 5 * 1024 * 1024; // 5MB

    engineProcess.stdout?.on('data', (data: Buffer) => {
      stdoutBuffer += data.toString('utf-8');
      
      if (stdoutBuffer.length > MAX_BUFFER) {
        console.error('[Rust Engine] Buffer overflow detectado en stdout. Forzando cierre.');
        killRustEngine();
        return;
      }

      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() || ''; // Retener la línea incompleta para el siguiente evento

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.type) {
            rustEngineEvents.emit(parsed.type, parsed);
          }
        } catch (e) {
          console.log(`[Rust Engine Output] ${line}`);
        }
      }
    });

    engineProcess.stderr?.on('data', (data: Buffer) => {
      console.error(`[Rust Engine Error] ${data.toString('utf-8')}`);
    });

    engineProcess.on('close', (code) => {
      console.log(`[Rust Engine] Se cerró con código ${code}`);
      engineProcess = null;
      rustEngineEvents.emit('ENGINE_DIED', { code });
    });

    return engineProcess;
  } catch (err) {
    console.error(`[Rust Engine] Error al lanzar el binario:`, err);
    if (canUseRustEngineMock()) {
      useMock = true;
    }
    return null;
  }
}

export async function sendToRustEngine(payload: any) {
  const engine = getRustEngine();

  // 1. INTENTO CON RUST ENGINE NATIVO
  if (engine && engine.stdin && !useMock) {
    try {
      engine.stdin.write(Buffer.from(JSON.stringify(payload) + '\n', 'utf-8'));
      return;
    } catch (err) {
      console.error('[Rust Engine] Falla al escribir en stdin.', err);
      if (canUseRustEngineMock()) {
        console.warn('[Rust Engine] Activando fallback a Mock nativo de desarrollo.');
        useMock = true;
      } else {
        emitCommandUnavailable(payload, 'fallo de comunicación con el motor local');
        return;
      }
    }
  }

  // 2. Fallback de desarrollo. En producción no se simula un dictamen legal.
  if (payload.command === 'LLM_QUERY') {
    if (useMock && canUseRustEngineMock()) {
      runMock(payload.requestId, payload.payload?.module || '', payload.payload?.query || '');
      return;
    }

    emitEngineUnavailable(payload.requestId, 'motor local ausente o no inicializado');
    return;
  }

  emitCommandUnavailable(payload, 'motor local ausente o no inicializado');
}

function emitCommandUnavailable(payload: any, reason: string) {
  const requestId = payload?.requestId || '';
  const message = getEngineUnavailableMessage(reason);

  if (payload?.command === 'EVALUATE_CHUNKS') {
    rustEngineEvents.emit('ANALYSIS_BATCH_DONE', {
      type: 'ANALYSIS_BATCH_DONE',
      requestId,
      processedChunks: 0,
      failedChunks: payload?.payload?.chunks?.length || 0,
      error: message,
    });
    return;
  }

  if (payload?.command === 'EVALUATE_CHUNK') {
    rustEngineEvents.emit('EVALUATE_CHUNK_ERROR', {
      type: 'EVALUATE_CHUNK_ERROR',
      requestId,
      payload: { error: message },
    });
  }
}

function emitEngineUnavailable(requestId: string, reason: string) {
  rustEngineEvents.emit('STREAM_CHUNK', {
    type: 'STREAM_CHUNK',
    requestId,
    payload: {
      chunk: getEngineUnavailableMessage(reason),
      isDone: false,
    }
  });

  rustEngineEvents.emit('STREAM_CHUNK', {
    type: 'STREAM_CHUNK',
    requestId,
    payload: { chunk: '', isDone: true }
  });
}

function runMock(requestId: string, module: string, query: string) {
  const responseText = `[MODO DESARROLLO - MOTOR LOCAL EN REVISIÓN]\nConsulta recibida en entorno local seguro (${module}).\n\nInstrucción procesada: "${query}".\n\nEste es un mensaje de prueba originado desde el núcleo del sistema sin conectarse a internet ni abrir puertos externos. El motor principal se encuentra estabilizando la carga de inferencia neuronal.`;
  const words = responseText.split(' ');
  let i = 0;
  const interval = setInterval(() => {
    if (i < words.length) {
      rustEngineEvents.emit('STREAM_CHUNK', {
        type: 'STREAM_CHUNK',
        requestId,
        payload: { chunk: words[i] + ' ', isDone: false }
      });
      i++;
    } else {
      clearInterval(interval);
      rustEngineEvents.emit('STREAM_CHUNK', {
        type: 'STREAM_CHUNK',
        requestId,
        payload: { chunk: '', isDone: true }
      });
    }
  }, 40);
}
