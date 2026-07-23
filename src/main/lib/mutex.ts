// src/main/lib/mutex.ts
export class AsyncMutex {
  private mutex: Promise<void> = Promise.resolve();

  async lock(): Promise<() => void> {
    let unlockNext: () => void;
    const nextMutex = new Promise<void>((resolve) => {
      unlockNext = resolve;
    });
    
    const currentMutex = this.mutex;
    this.mutex = nextMutex;
    
    await currentMutex;
    return unlockNext!;
  }
}

// Instancia global para bloquear escrituras a LanceDB
export const lanceDbWriteMutex = new AsyncMutex();
