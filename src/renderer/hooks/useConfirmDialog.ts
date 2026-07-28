import { useState, useCallback } from 'react';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Provides an imperative API for showing confirmation dialogs.
 * Returns [state, confirm] where confirm returns a Promise<boolean>.
 * 
 * Usage:
 * const [dialogState, confirm] = useConfirmDialog();
 * const ok = await confirm({ title: '¿Eliminar?', message: 'Se eliminará permanentemente.' });
 * if (ok) { deleteItem(); }
 * 
 * Render: <ConfirmDialog {...dialogState} />
 */
export function useConfirmDialog(): [ConfirmDialogState, (opts: Partial<Omit<ConfirmDialogState, 'isOpen' | 'onConfirm' | 'onCancel'>>) => Promise<boolean>] {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    variant: 'default',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = useCallback((opts: Partial<Omit<ConfirmDialogState, 'isOpen' | 'onConfirm' | 'onCancel'>>) => {
    return new Promise<boolean>((resolve) => {
      setState((prev) => ({
        ...prev,
        title: opts.title ?? 'Confirmar',
        message: opts.message ?? '¿Está seguro?',
        confirmLabel: opts.confirmLabel ?? 'Confirmar',
        cancelLabel: opts.cancelLabel ?? 'Cancelar',
        variant: opts.variant ?? 'default',
        isOpen: true,
        onConfirm: () => {
          setState((s) => ({ ...s, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setState((s) => ({ ...s, isOpen: false }));
          resolve(false);
        }
      }));
    });
  }, []);

  return [state, confirm];
}
