import React from 'react';
import { DatabaseBackup, Download, Trash2 } from 'lucide-react';

interface LocalDataSettingsPanelProps {
  vaultExporting: boolean;
  vaultDeleting: boolean;
  vaultMessage: string;
  deleteConfirmation: string;
  onDeleteConfirmationChange: (value: string) => void;
  onExport: () => void;
  onDelete: () => void;
}

export const LocalDataSettingsPanel: React.FC<LocalDataSettingsPanelProps> = ({ vaultExporting, vaultDeleting, vaultMessage, deleteConfirmation, onDeleteConfirmationChange, onExport, onDelete }) => (
  <div className="space-y-8">
    <div>
      <h2 className="text-lg font-bold text-slate-900">Datos locales</h2>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Los portafolios se conservan al desinstalar. Desde aquí puedes crear un respaldo legible o eliminarlos de forma explícita.</p>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl items-start gap-3">
          <span className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600"><DatabaseBackup size={20} /></span>
          <div><h3 className="text-sm font-bold text-slate-900">Exportar respaldo integral</h3><p className="mt-1 text-xs leading-5 text-slate-500">Incluye portafolios, documentos, análisis, borradores y estado de trabajo en un JSON con hash SHA-256. El respaldo queda sin cifrar en la ubicación que elijas; protégelo como información confidencial.</p></div>
        </div>
        <button type="button" onClick={onExport} disabled={vaultExporting} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"><Download size={15} /> {vaultExporting ? 'Exportando…' : 'Exportar respaldo'}</button>
      </div>
    </section>
    <section className="rounded-2xl border border-red-200 bg-red-50 p-5" aria-labelledby="delete-vault-title">
      <div className="flex items-start gap-3">
        <span className="rounded-xl border border-red-200 bg-white p-2 text-red-600"><Trash2 size={20} /></span>
        <div className="min-w-0 flex-1">
          <h3 id="delete-vault-title" className="text-sm font-bold text-red-900">Eliminar toda la bóveda local</h3>
          <p className="mt-1 text-xs leading-5 text-red-800">La eliminación es irreversible. Exporta primero un respaldo si necesitas conservar el trabajo.</p>
          <label htmlFor="delete-vault-confirmation" className="mt-4 block text-xs font-bold uppercase tracking-wider text-red-800">Escribe ELIMINAR para habilitar la acción</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="delete-vault-confirmation" value={deleteConfirmation} onChange={(event) => onDeleteConfirmationChange(event.target.value)} autoComplete="off" className="min-h-10 flex-1 rounded-xl border border-red-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200" />
            <button type="button" onClick={onDelete} disabled={deleteConfirmation !== 'ELIMINAR' || vaultDeleting} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-xs font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={15} /> {vaultDeleting ? 'Eliminando…' : 'Eliminar datos'}</button>
          </div>
        </div>
      </div>
    </section>
    <p className="text-xs text-slate-600" role="status">{vaultMessage}</p>
  </div>
);
