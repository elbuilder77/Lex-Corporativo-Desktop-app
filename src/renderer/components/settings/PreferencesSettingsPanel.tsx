import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';

export type DefaultWorkspace = 'instructivo' | 'engineering' | 'fiscal';

interface RuntimeCheckSummary {
  id: string;
  label: string;
  ok: boolean;
}

interface PreferencesSettingsPanelProps {
  runtimeChecks: RuntimeCheckSummary[];
  runtimeHealthLoading: boolean;
  defaultWorkspace: DefaultWorkspace;
  preferenceSaved: boolean;
  onRefreshRuntime: () => void;
  onWorkspaceChange: (workspace: DefaultWorkspace) => void;
  onSave: () => void;
}

const CHECK_IDS = ['vault', 'rag', 'rust', 'gguf'];

export const PreferencesSettingsPanel: React.FC<PreferencesSettingsPanelProps> = ({
  runtimeChecks,
  runtimeHealthLoading,
  defaultWorkspace,
  preferenceSaved,
  onRefreshRuntime,
  onWorkspaceChange,
  onSave,
}) => (
  <div className="space-y-8">
    <h2 className="mb-6 text-lg font-bold text-slate-900">Preferencias del Sistema</h2>
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5" aria-labelledby="runtime-status-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="runtime-status-title" className="text-sm font-bold text-slate-900">Recursos de esta estación</h3>
          <p className="mt-1 text-xs text-slate-500">Disponibilidad comprobada; no representa conexión a internet ni una licencia comercial.</p>
        </div>
        <button type="button" onClick={onRefreshRuntime} disabled={runtimeHealthLoading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
          <RefreshCw size={14} className={runtimeHealthLoading ? 'animate-spin' : ''} /> Comprobar
        </button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {CHECK_IDS.map((id) => {
          const check = runtimeChecks.find((item) => item.id === id);
          return (
            <div key={id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              {check?.ok ? <CheckCircle2 size={15} className="text-emerald-600" /> : <AlertTriangle size={15} className="text-amber-600" />}
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{check?.label || 'Comprobando recurso'}</span>
              <span className={`text-xs font-bold uppercase ${check?.ok ? 'text-emerald-700' : 'text-amber-700'}`}>{check?.ok ? 'Listo' : 'Pendiente'}</span>
            </div>
          );
        })}
      </div>
    </section>

    <div className="space-y-6">
      <div className="group">
        <label htmlFor="default-workspace" className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Pantalla al iniciar</label>
        <div className="relative">
          <select id="default-workspace" value={defaultWorkspace} onChange={(event) => onWorkspaceChange(event.target.value as DefaultWorkspace)} className="w-full max-w-sm appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium transition-all focus:border-legal-gold/50 focus:outline-none focus:ring-4 focus:ring-legal-gold/10">
            <option value="instructivo">Inicio</option>
            <option value="engineering">Ingeniería Jurídica</option>
            <option value="fiscal">Fiscal</option>
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><ChevronRight size={16} className="rotate-90" /></div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Define la primera herramienta que se abre al abrir la estación.</p>
      </div>
    </div>

    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
      <p className="text-xs font-medium text-slate-500">La preferencia se guarda únicamente en este dispositivo.</p>
      <button type="button" onClick={onSave} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-slate-800">
        {preferenceSaved && <CheckCircle2 size={15} className="text-emerald-300" />}{preferenceSaved ? 'Guardado' : 'Guardar preferencia'}
      </button>
    </div>
  </div>
);
