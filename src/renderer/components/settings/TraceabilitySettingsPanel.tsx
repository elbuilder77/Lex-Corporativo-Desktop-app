import React from 'react';
import { Download, Shield } from 'lucide-react';

interface TraceabilitySettingsPanelProps {
  ledgerStatus: { path: string; exists: boolean; size: number } | null;
  ledgerExporting: boolean;
  ledgerMessage: string;
  onExport: () => void;
}

export const TraceabilitySettingsPanel: React.FC<TraceabilitySettingsPanelProps> = ({ ledgerStatus, ledgerExporting, ledgerMessage, onExport }) => (
  <div className="space-y-8">
    <h2 className="mb-6 text-lg font-bold text-slate-900">Auditoría y Trazabilidad Local</h2>
    <div className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200"><Shield size={20} className="text-slate-600" /></div>
      <div>
        <h3 className="text-sm font-bold text-slate-900">Bitácora Local de Decisiones (Ledger)</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Las operaciones jurídicas locales y BYOK compatibles quedan registradas en una bitácora JSONL saneada en este equipo. Este registro almacena hashes de entradas y salidas, identificadores exactos de fuentes, vínculos afirmación–fuente y metadatos mínimos de trazabilidad, sin guardar el texto completo del portafolio.</p>
        <p className="mt-2 text-xs font-medium text-slate-500">Ruta local: <code className="break-all rounded bg-slate-200 px-1 py-0.5">{ledgerStatus?.path || 'Consultando ruta local...'}</code></p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500">{ledgerStatus?.exists ? `${Math.max(1, Math.round(ledgerStatus.size / 1024))} KB disponibles` : 'Sin registros todavía'}</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
      <p className="text-xs text-slate-500" role="status">{ledgerMessage}</p>
      <button type="button" onClick={onExport} disabled={ledgerExporting || !ledgerStatus?.exists} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
        <Download size={16} />{ledgerExporting ? 'Exportando...' : 'Exportar bitácora'}
      </button>
    </div>
  </div>
);
