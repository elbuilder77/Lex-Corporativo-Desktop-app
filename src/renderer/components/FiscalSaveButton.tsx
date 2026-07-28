import React, { useState } from 'react';
import { Check, Loader2, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCaseStore } from '../store/useCaseStore';
import { useUiStore } from '../store/useUiStore';

interface FiscalSaveButtonProps {
  name?: string;
  className?: string;
}

export const FiscalSaveButton: React.FC<FiscalSaveButtonProps> = ({ name, className }) => {
  const { currentCaseId, saveFiscalWork } = useCaseStore();
  const { notify } = useUiStore();
  const [isSaving, setIsSaving] = useState(false);

  if (currentCaseId) {
    return (
      <span className={cn('inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800', className)}>
        <Check size={16} /> Guardado
      </span>
    );
  }

  const save = async () => {
    setIsSaving(true);
    try {
      await saveFiscalWork(name);
      notify('Trabajo guardado.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo guardar el trabajo.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void save()}
      disabled={isSaving}
      className={cn('inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-fiscal/30 hover:text-fiscal disabled:opacity-50', className)}
    >
      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
      {isSaving ? 'Guardando' : 'Guardar'}
    </button>
  );
};

export default FiscalSaveButton;
