import { useEffect, useRef, useCallback, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Auto-saves data after a debounce period whenever the data changes.
 * Returns the current save status.
 */
export function useAutoSave<T>(
  key: string,
  data: T,
  saveFn: (key: string, data: T) => Promise<void>,
  delay: number = 3000
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const isFirstRender = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (savedStatusTimeoutRef.current) {
      clearTimeout(savedStatusTimeoutRef.current);
    }

    setStatus('idle');

    timeoutRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await saveFn(key, data);
        setStatus('saved');
        
        savedStatusTimeoutRef.current = setTimeout(() => {
          setStatus('idle');
        }, 2000);
      } catch (error) {
        setStatus('error');
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (savedStatusTimeoutRef.current) {
        clearTimeout(savedStatusTimeoutRef.current);
      }
    };
  }, [key, data, saveFn, delay]);

  return status;
}
