import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRuntime = vi.hoisted(() => ({
  isPackaged: false,
}));

vi.mock('electron', () => ({
  app: {
    getAppPath: () => process.cwd(),
    get isPackaged() {
      return mockRuntime.isPackaged;
    },
  },
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import {
  canUseRustEngineMock,
  getEngineUnavailableMessage,
  rustEngineEvents,
  sendToRustEngine,
} from './rust-engine';

describe('rust engine runtime policy', () => {
  beforeEach(() => {
    mockRuntime.isPackaged = false;
    rustEngineEvents.removeAllListeners();
    delete process.env.LEX_DISABLE_ENGINE_MOCK;
    process.env.NODE_ENV = 'test';
    Object.defineProperty(process, 'resourcesPath', {
      value: process.cwd(),
      configurable: true,
    });
  });

  it('allows mock only in non-packaged non-production development runtime', () => {
    expect(canUseRustEngineMock({
      isPackaged: false,
      nodeEnv: 'development',
      disableMock: undefined,
    })).toBe(true);

    expect(canUseRustEngineMock({
      isPackaged: true,
      nodeEnv: 'development',
      disableMock: undefined,
    })).toBe(false);

    expect(canUseRustEngineMock({
      isPackaged: false,
      nodeEnv: 'production',
      disableMock: undefined,
    })).toBe(false);

    expect(canUseRustEngineMock({
      isPackaged: false,
      nodeEnv: 'development',
      disableMock: '1',
    })).toBe(false);
  });

  it('emits an unavailable engine message instead of a simulated legal answer', () => {
    const message = getEngineUnavailableMessage('motor local ausente');

    expect(message).toContain('El motor local de análisis no está disponible.');
    expect(message).toContain('motor local ausente');
    expect(message).not.toContain('MODO DESARROLLO');
    expect(message).not.toContain('mensaje de prueba');
  });

  it('does not stream development mock output when the packaged runtime has no engine binary', async () => {
    mockRuntime.isPackaged = true;
    const chunks: string[] = [];
    const doneStates: boolean[] = [];

    rustEngineEvents.on('STREAM_CHUNK', (event: any) => {
      if (event.requestId !== 'prod-missing-engine') return;
      chunks.push(event.payload.chunk || '');
      doneStates.push(Boolean(event.payload.isDone));
    });

    await sendToRustEngine({
      command: 'LLM_QUERY',
      requestId: 'prod-missing-engine',
      payload: {
        module: 'mercantil',
        query: 'Que es un acto mercantil?',
      },
    });

    const streamed = chunks.join('');

    expect(streamed).toContain('El motor local de análisis no está disponible.');
    expect(streamed).toContain('motor local ausente o no inicializado');
    expect(streamed).not.toContain('MODO DESARROLLO');
    expect(streamed).not.toContain('mensaje de prueba');
    expect(doneStates).toEqual([false, true]);
  });

  it('emits batch analysis failure when the packaged runtime has no engine binary', async () => {
    mockRuntime.isPackaged = true;
    let batchDone: any = null;

    rustEngineEvents.on('ANALYSIS_BATCH_DONE', (event: any) => {
      if (event.requestId === 'missing-batch-engine') batchDone = event;
    });

    await sendToRustEngine({
      command: 'EVALUATE_CHUNKS',
      requestId: 'missing-batch-engine',
      payload: {
        module: 'mercantil',
        ragLaws: 'Sin contexto',
        chunks: [{ chunkIndex: 0, text: 'Clausula de prueba' }],
      },
    });

    expect(batchDone).toBeTruthy();
    expect(batchDone.error).toContain('El motor local de análisis no está disponible.');
    expect(batchDone.failedChunks).toBe(1);
  });
});
