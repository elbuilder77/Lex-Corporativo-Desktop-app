import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <ModalHeader>
        <div className="flex items-center space-x-2">
          {variant === 'danger' ? (
            <AlertTriangle className="h-6 w-6 text-red-500" />
          ) : (
            <Info className="h-6 w-6 text-blue-500" />
          )}
          <ModalTitle>{title}</ModalTitle>
        </div>
      </ModalHeader>
      <ModalContent>
        <p className="text-sm text-slate-600">{message}</p>
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={() => {
            onConfirm();
            onCancel();
          }}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
