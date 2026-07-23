import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Settings2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUiStore, type RuntimeHealth } from '../store/useUiStore';

export type RuntimeCapability = keyof RuntimeHealth['capabilities'];

interface CapabilityGateProps {
  capability: RuntimeCapability;
  children: React.ReactNode;
}

export const CapabilityGate: React.FC<CapabilityGateProps> = ({ capability, children }) => {
  const navigate = useNavigate();
  const { runtimeHealth, runtimeHealthLoading, refreshRuntimeHealth } = useUiStore();

  useEffect(() => {
    if (!runtimeHealth && !runtimeHealthLoading) void refreshRuntimeHealth();
  }, [refreshRuntimeHealth, runtimeHealth, runtimeHealthLoading]);

  const state = runtimeHealth?.capabilities[capability];
  const settingsTarget = capability === 'legalGeneration' || capability === 'localAssistant'
    ? '/settings?tab=ia'
    : '/settings?tab=preferences';
  if (state?.ready) return <>{children}</>;

  if (!runtimeHealth || runtimeHealthLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 px-6" role="status" aria-live="polite">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
          <RefreshCw size={18} className="animate-spin text-legal-golddark" /> Comprobando recursos de esta estación…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-slate-50 px-5 py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-amber-200 bg-white p-7 shadow-sm" aria-labelledby={`capability-${capability}`}>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertTriangle size={23} />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Herramienta no disponible todavía</p>
        <h1 id={`capability-${capability}`} className="mt-2 font-serif text-2xl font-bold text-slate-950">
          {state?.label || 'Recurso local pendiente'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{state?.detail || 'No fue posible comprobar esta capacidad.'}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate(settingsTarget)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800">
            <Settings2 size={17} /> Revisar configuración
          </button>
          <button type="button" onClick={() => void refreshRuntimeHealth()} disabled={runtimeHealthLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
            {runtimeHealthLoading ? <RefreshCw size={17} className="animate-spin" /> : <ShieldCheck size={17} />} Comprobar de nuevo
          </button>
        </div>
      </section>
    </div>
  );
};

export default CapabilityGate;
