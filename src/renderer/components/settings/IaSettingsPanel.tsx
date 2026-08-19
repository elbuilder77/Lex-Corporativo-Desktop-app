import React from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, RefreshCw, ShieldCheck, Sparkles, Wifi } from 'lucide-react';
import { ByokProvider, DEFAULT_BYOK_MODELS } from '../../../shared/byok-models';
import { cn } from '../../lib/utils';

const BYOK_PROVIDER_LABELS: Record<ByokProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
};

const PROVIDER_DESCRIPTIONS: Record<ByokProvider, string> = {
  gemini: 'El mejor modelo de Google: Gemini 3.7 Flash con ultra-baja latencia y 1M de contexto.',
  openai: 'Modelo GPT-4o mini con alta velocidad y precisión estructurada.',
  anthropic: 'Modelo Claude 3.5 Sonnet con máxima profundidad en razonamiento jurídico.',
};

export interface IaSettingsPanelProps {
  byokEnabled: boolean;
  strictPrivacy: boolean;
  setStrictPrivacy: (strict: boolean) => void;
  automaticUpdatesEnabled: boolean;
  setAutomaticUpdatesEnabled: (enabled: boolean) => void;
  updateStatus: 'idle' | 'checking' | 'ok' | 'error';
  updateMessage: string;
  handleCheckUpdates: () => void;
  byokProvider: ByokProvider;
  handleProviderChange: (provider: ByokProvider) => void;
  byokApiKey: string;
  setByokApiKey: (key: string) => void;
  hasApiKey: boolean;
  apiKeyFingerprint?: string;
  byokKeyStatus: 'missing' | 'ready' | 'unreadable';
  byokModel: string;
  setByokModel: (model: string) => void;
  maxInputChars: number;
  setMaxInputChars: (chars: number) => void;
  byokStatus: 'idle' | 'saving' | 'testing' | 'ok' | 'error';
  byokMessage: string;
  handleClearByok: () => void;
  handleTestByok: () => void;
  handleSaveByok: () => void;
}

export const IaSettingsPanel: React.FC<IaSettingsPanelProps> = ({
  byokEnabled,
  strictPrivacy,
  setStrictPrivacy,
  automaticUpdatesEnabled,
  setAutomaticUpdatesEnabled,
  updateStatus,
  updateMessage,
  handleCheckUpdates,
  byokProvider,
  handleProviderChange,
  byokApiKey,
  setByokApiKey,
  hasApiKey,
  apiKeyFingerprint,
  byokKeyStatus,
  byokModel,
  setByokModel,
  maxInputChars,
  setMaxInputChars,
  byokStatus,
  byokMessage,
  handleClearByok,
  handleTestByok,
  handleSaveByok,
}) => {
  const providers: ByokProvider[] = ['gemini', 'openai', 'anthropic'];

  return (
    <div className="space-y-6">
      
      {/* Encabezado de sección */}
      <div>
        <h2 className="text-base font-bold text-slate-950">Inteligencia Artificial y Modelos (BYOK)</h2>
        <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
          Conecta tu propia API key de Google Gemini, OpenAI o Anthropic Claude. La búsqueda RAG, el corpus legal y la base de datos permanecen en tu computadora.
        </p>
      </div>

      {/* Selector de Proveedor */}
      <section className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Selecciona tu proveedor de IA
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          {providers.map((p) => {
            const active = byokProvider === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handleProviderChange(p)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition shadow-xs',
                  active
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{BYOK_PROVIDER_LABELS[p]}</span>
                  {active && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  {PROVIDER_DESCRIPTIONS[p]}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Formulario de Clave y Modelo */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Credenciales para {BYOK_PROVIDER_LABELS[byokProvider]}
            </h3>
          </div>
          {hasApiKey && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 size={12} /> Key activa ({apiKeyFingerprint})
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              API Key de {BYOK_PROVIDER_LABELS[byokProvider]}
            </label>
            <input
              type="password"
              value={byokApiKey}
              onChange={(e) => setByokApiKey(e.target.value)}
              placeholder={hasApiKey ? '•••••••••••••••••••••••••••• (Escribe una nueva para cambiarla)' : 'Pega aquí tu clave API'}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 outline-hidden transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            />
            {byokKeyStatus === 'unreadable' && (
              <p className="mt-1.5 text-xs text-amber-700 font-medium">
                La clave guardada no puede descifrarse. Ingresa una nueva clave.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Modelo Optimizado
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 font-mono font-semibold">
              <Sparkles size={14} className="text-blue-600 shrink-0" />
              <span>
                {byokProvider === 'gemini' && 'Gemini 3.7 Flash'}
                {byokProvider === 'openai' && 'GPT-4o mini'}
                {byokProvider === 'anthropic' && 'Claude 3.5 Sonnet'}
              </span>
            </div>
          </div>
        </div>

        {/* Límite de texto */}
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Límite de caracteres por petición:</span>
            <span className="font-mono font-bold text-slate-900">{maxInputChars.toLocaleString()} caracteres</span>
          </div>
          <input
            type="range"
            min={10000}
            max={200000}
            step={5000}
            value={maxInputChars}
            onChange={(e) => setMaxInputChars(Number(e.target.value))}
            className="w-full accent-slate-950"
          />
        </div>

        {/* Estado y Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 text-xs">
            {byokStatus === 'ok' && <CheckCircle2 size={14} className="text-emerald-600" />}
            {byokStatus === 'error' && <AlertTriangle size={14} className="text-rose-600" />}
            {byokStatus === 'testing' && <Loader2 size={14} className="animate-spin text-blue-600" />}
            <span className="text-slate-600 font-medium">
              {byokMessage || (hasApiKey ? `${BYOK_PROVIDER_LABELS[byokProvider]} listo para operar.` : 'Ingresa tu clave para activar la generación con IA.')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasApiKey && (
              <button
                type="button"
                onClick={handleClearByok}
                disabled={byokStatus === 'saving' || byokStatus === 'testing'}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
              >
                Eliminar clave
              </button>
            )}
            <button
              type="button"
              onClick={handleTestByok}
              disabled={byokStatus === 'saving' || byokStatus === 'testing' || (!hasApiKey && !byokApiKey.trim())}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              {byokStatus === 'testing' ? 'Probando...' : 'Probar conexión'}
            </button>
            <button
              type="button"
              onClick={handleSaveByok}
              disabled={byokStatus === 'saving' || byokStatus === 'testing'}
              className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-50 shadow-xs"
            >
              {byokStatus === 'saving' ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </div>
      </section>

      {/* Privacidad Estricta */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Control de Privacidad y Red
            </h3>
          </div>
          <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', strictPrivacy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600')}>
            {strictPrivacy ? 'Privacidad Estricta Activa' : 'Privacidad Estándar'}
          </span>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 cursor-pointer hover:bg-slate-50 transition">
          <input
            type="checkbox"
            checked={strictPrivacy}
            onChange={(e) => {
              setStrictPrivacy(e.target.checked);
              if (e.target.checked) setAutomaticUpdatesEnabled(false);
            }}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-400"
          />
          <div>
            <span className="block text-xs font-bold text-slate-900">Modo de Privacidad Estricta</span>
            <span className="block text-[11px] leading-relaxed text-slate-500 mt-0.5">
              Bloquea cualquier comunicación de red en segundo plano. Únicamente se conecta con el proveedor de IA en el momento exacto en que solicitas redactar, auditar o consultar.
            </span>
          </div>
        </label>
      </section>

    </div>
  );
};
