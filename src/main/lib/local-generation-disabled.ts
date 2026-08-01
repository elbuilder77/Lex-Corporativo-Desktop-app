import { EventEmitter } from 'events';

/** Compatibility boundary for unreachable legacy branches while BYOK-only
 * handlers are being reduced. It never starts a process or generates output. */
export const rustEngineEvents = new EventEmitter();

export async function sendToRustEngine(..._args: unknown[]): Promise<never> {
  throw new Error('La generación local no forma parte de esta edición. Configura una API key propia.');
}
