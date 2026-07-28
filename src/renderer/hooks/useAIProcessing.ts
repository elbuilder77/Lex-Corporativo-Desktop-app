import { useState, useRef, useCallback, useEffect } from 'react';

export type ProcessingStage = 'idle' | 'preparing' | 'searching' | 'analyzing' | 'grounding' | 'generating' | 'complete' | 'error' | 'cancelled';

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: '',
  preparing: 'Preparando consulta...',
  searching: 'Buscando fundamentos legales...',
  analyzing: 'Analizando información...',
  grounding: 'Validando fundamentos normativos...',
  generating: 'Generando respuesta...',
  complete: 'Análisis completado',
  error: 'Error en el procesamiento',
  cancelled: 'Procesamiento cancelado',
};

/**
 * Hook that wraps AI processing calls with stage tracking, elapsed time, and cancellation.
 */
export function useAIProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setStage('idle');
    setElapsed(0);
    setError(null);
    stopTimer();
    abortControllerRef.current = null;
  }, [stopTimer]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStage('cancelled');
    setIsProcessing(false);
    stopTimer();
  }, [stopTimer]);

  const execute = useCallback(async <T>(
    handler: (setStage: (stage: ProcessingStage) => void, signal: AbortSignal) => Promise<T>
  ): Promise<T | null> => {
    reset();
    setIsProcessing(true);
    startTimer();
    
    abortControllerRef.current = new AbortController();
    
    try {
      const result = await handler(setStage, abortControllerRef.current.signal);
      if (abortControllerRef.current.signal.aborted) {
        throw new Error('AbortError');
      }
      setStage('complete');
      setIsProcessing(false);
      stopTimer();
      return result;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'AbortError') {
        setStage('cancelled');
      } else {
        setStage('error');
        setError(err instanceof Error ? err : new Error(String(err)));
      }
      setIsProcessing(false);
      stopTimer();
      return null;
    }
  }, [reset, startTimer, stopTimer]);

  useEffect(() => {
    return stopTimer;
  }, [stopTimer]);

  return {
    isProcessing,
    stage,
    stageLabel: STAGE_LABELS[stage],
    elapsed,
    error,
    execute,
    cancel,
    reset,
  };
}
