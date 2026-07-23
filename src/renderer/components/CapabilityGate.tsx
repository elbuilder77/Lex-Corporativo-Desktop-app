import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Settings2 } from 'lucide-react';
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
  const contextualMessage: Record<RuntimeCapability, string> = {
    vault: 'Puedes explorar el portafolio. Para guardar cambios, esta estación necesita acceso al cifrado seguro del sistema.',
    legalSearch: 'Puedes preparar tu consulta. La búsqueda se ejecutará cuando estén listos el corpus y su índice local.',
    legalGeneration: 'Puedes completar el flujo. Antes de generar, elige procesamiento local o conecta una API propia.',
    rulesAssessment: 'La evaluación funciona sin IA; el cifrado local solo es necesario para conservar el resultado.',
    localAssistant: 'La guía interactiva necesita el motor local o una API propia activa.',
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {!state?.ready && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50/90 px-4 py-2.5 text-amber-950" role="status" aria-live="polite">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2">
            {runtimeHealthLoading && !runtimeHealth
              ? <RefreshCw size={15} className="shrink-0 animate-spin" />
              : <AlertTriangle size={15} className="shrink-0" />}
            <p className="min-w-0 flex-1 text-xs leading-5">
              <strong>{state?.label || 'Comprobando esta función'}.</strong>{' '}
              {state ? contextualMessage[capability] : 'La pantalla ya está disponible mientras verificamos los recursos.'}
            </p>
            <button type="button" onClick={() => navigate(settingsTarget)} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold text-amber-950 hover:bg-amber-100">
              <Settings2 size={14} /> Configurar
            </button>
            <button type="button" onClick={() => void refreshRuntimeHealth()} disabled={runtimeHealthLoading} className="inline-flex min-h-8 items-center gap-1.5 px-2 text-xs font-bold text-amber-900 hover:text-amber-950 disabled:opacity-50">
              <RefreshCw size={13} className={runtimeHealthLoading ? 'animate-spin' : ''} /> Reintentar
            </button>
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
};

export default CapabilityGate;
