import React from 'react';
import { AlertTriangle, CheckCircle2, DatabaseBackup, Download, RefreshCw, Trash2 } from 'lucide-react';

interface RuntimeCheckSummary {
  id: string;
  label: string;
  ok: boolean;
}

interface LocalDataSettingsPanelProps {
  runtimeChecks: RuntimeCheckSummary[];
  runtimeHealthLoading: boolean;
  onRefreshRuntime: () => void;
  vaultExporting: boolean;
  vaultDeleting: boolean;
  vaultMessage: string;
  deleteConfirmation: string;
  onDeleteConfirmationChange: (value: string) => void;
  onExport: () => void;
  onDelete: () => void;
}

const CHECK_IDS = ['vault', 'rag'];

export const LocalDataSettingsPanel: React.FC<LocalDataSettingsPanelProps> = ({
  runtimeChecks,
  runtimeHealthLoading,
  onRefreshRuntime,
  vaultExporting,
  vaultDeleting,
  vaultMessage,
  deleteConfirmation,
  onDeleteConfirmationChange,
  onExport,
  onDelete,
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-base font-bold text-slate-950">Datos y Bóveda Local</h2>
      <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
        Tus expedientes, contratos redactados y revisiones se almacenan en una base de datos local SQLite cifrada. Desde aquí puedes verificar el estado de los recursos, exportar un respaldo o gestionar la información.
      </p>
    </div>

    {/* Estado de Recursos Locales */}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Recursos y Motores del Sistema
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Componentes de almacenamiento y búsqueda instalados en este equipo.</p>
        </div>
        <button
          type="button"
          onClick={onRefreshRuntime}
          disabled={runtimeHealthLoading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={runtimeHealthLoading ? 'animate-spin' : ''} /> Comprobar estado
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CHECK_IDS.map((id) => {
          const check = runtimeChecks.find((item) => item.id === id);
          return (
            <div key={id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <div className="flex items-center gap-2.5">
                {check?.ok ? (
                  <CheckCircle2 size={16} className="text-emerald-600" />
                ) : (
                  <AlertTriangle size={16} className="text-amber-600" />
                )}
                <span className="text-xs font-bold text-slate-800">
                  {id === 'vault' ? 'Bóveda Cifrada (SQLite)' : 'Motor RAG y Leyes (LanceDB)'}
                </span>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${check?.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
                {check?.ok ? 'Listo' : 'Revisar'}
              </span>
            </div>
          );
        })}
      </div>
    </section>

    {/* Exportar Respaldo */}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3 max-w-xl">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
            <DatabaseBackup size={20} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Exportar Respaldo Completo
            </h3>
            <p className="text-xs leading-relaxed text-slate-500 mt-1">
              Descarga una copia íntegra de todos tus contratos, documentos, análisis y plantillas en un archivo JSON con validación SHA-256 para transferir o respaldar tu trabajo.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={vaultExporting}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 shadow-xs"
        >
          <Download size={14} /> {vaultExporting ? 'Exportando respaldo...' : 'Descargar respaldo (.json)'}
        </button>
      </div>
    </section>

    {/* Eliminar Bóveda */}
    <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-xs space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-rose-100 p-2.5 text-rose-700">
          <Trash2 size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
            Eliminar datos de la bóveda local
          </h3>
          <p className="text-xs leading-relaxed text-rose-900 mt-1">
            Esta acción eliminará de forma irreversible todos los documentos y expedientes guardados en este equipo. Exporta un respaldo previamente si deseas conservar tus archivos.
          </p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2 max-w-lg">
            <input
              placeholder="Escribe ELIMINAR para confirmar"
              value={deleteConfirmation}
              onChange={(e) => onDeleteConfirmationChange(e.target.value)}
              className="flex-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs text-slate-900 outline-hidden focus:ring-2 focus:ring-rose-400 font-bold"
            />
            <button
              type="button"
              onClick={onDelete}
              disabled={deleteConfirmation !== 'ELIMINAR' || vaultDeleting}
              className="rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-40 transition shadow-xs"
            >
              {vaultDeleting ? 'Eliminando...' : 'Eliminar bóveda'}
            </button>
          </div>
        </div>
      </div>
    </section>

    {vaultMessage && (
      <p className="text-xs text-slate-600 font-medium" role="status">{vaultMessage}</p>
    )}
  </div>
);
