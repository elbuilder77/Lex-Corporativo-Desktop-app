import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, KeyRound, Loader2, ShieldCheck, Wifi, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../store/useUiStore';

type Provider = 'gemini' | 'openai' | 'anthropic';

const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
};

export const ProcessingSetupDialog: React.FC = () => {
  const navigate = useNavigate();
  const { processingSetupIntent, dismissProcessingSetup, runtimeHealth, refreshRuntimeHealth, notify } = useUiStore();
  const [provider, setProvider] = useState<Provider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!processingSetupIntent) return;
    setApiKey('');
    setMessage('');
    window.lexDesktop.byok.getSettings().then((settings) => {
      setProvider(settings.provider);
      setModel(settings.model);
      setHasKey(settings.hasApiKey);
    }).catch(() => setMessage('No se pudo leer la configuración de procesamiento.'));
  }, [processingSetupIntent]);

  useEffect(() => {
    if (!processingSetupIntent) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissProcessingSetup();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dismissProcessingSetup, processingSetupIntent]);

  if (!processingSetupIntent) return null;

  const localReady = runtimeHealth?.capabilities.localAssistant.ready ?? false;
  const corpusReady = runtimeHealth?.capabilities.legalSearch.ready ?? false;
  const vaultReady = runtimeHealth?.capabilities.vault.ready ?? false;

  const selectProvider = async (nextProvider: Provider) => {
    setProvider(nextProvider);
    setApiKey('');
    setMessage('');
    try {
      const settings = await window.lexDesktop.byok.getSettings();
      setModel(settings.providers[nextProvider].model);
      setHasKey(settings.providers[nextProvider].hasApiKey);
    } catch {
      setHasKey(false);
    }
  };

  const activateByok = async () => {
    if (!hasKey && apiKey.trim().length < 10) {
      setMessage('Escribe una API key válida para continuar.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await window.lexDesktop.byok.testConnection({ provider, model, apiKey: apiKey.trim() || undefined });
      await window.lexDesktop.byok.saveSettings({ enabled: true, provider, model, apiKey: apiKey.trim() || undefined });
      await refreshRuntimeHealth();
      notify(`${PROVIDER_LABELS[provider]} quedó conectado. Vuelve a ejecutar la acción cuando estés listo.`, 'success', 'Procesamiento configurado');
      dismissProcessingSetup();
    } catch (error: any) {
      setMessage(error?.message || `No se pudo conectar con ${PROVIDER_LABELS[provider]}.`);
    } finally {
      setSaving(false);
    }
  };

  const activateLocal = async () => {
    setSaving(true);
    try {
      await window.lexDesktop.byok.saveSettings({ enabled: false });
      await refreshRuntimeHealth();
      notify('Procesamiento local seleccionado.', 'success');
      dismissProcessingSetup();
    } catch (error: any) {
      setMessage(error?.message || 'No se pudo seleccionar el procesamiento local.');
    } finally {
      setSaving(false);
    }
  };

  const openInstallation = () => {
    dismissProcessingSetup();
    navigate('/settings?tab=preferences');
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="processing-setup-title">
      <button type="button" className="absolute inset-0" aria-label="Cerrar configuración de procesamiento" onClick={dismissProcessingSetup} />
      <section className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-[#f8f6f1] shadow-2xl">
        <header className="flex items-start gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-legal-gold"><ShieldCheck size={19} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-legal-golddark">Antes de continuar</p>
            <h2 id="processing-setup-title" className="mt-1 font-serif text-2xl font-bold text-slate-950">Elige cómo procesar esta acción</h2>
            <p className="mt-1 text-sm text-slate-600">Para {processingSetupIntent}, usa el motor de este equipo o conecta una API de tu organización.</p>
          </div>
          <button type="button" onClick={dismissProcessingSetup} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button>
        </header>

        <div className="space-y-5 p-5">
          {(!corpusReady || !vaultReady) && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              <p><strong>La base local también requiere atención.</strong> La API puede quedar conectada ahora, pero la función jurídica necesita {`${!vaultReady ? 'el portafolio cifrado' : ''}${!vaultReady && !corpusReady ? ' y ' : ''}${!corpusReady ? 'el corpus e índice local' : ''}`} antes de ejecutarse.</p>
            </div>
          )}

          <section className="rounded-xl border border-blue-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Wifi size={17} /></span>
              <div><h3 className="text-sm font-bold text-slate-950">API propia</h3><p className="mt-1 text-xs leading-5 text-slate-600">Configuración rápida. La key queda cifrada por el sistema operativo y el proveedor recibe solo texto seleccionado de la operación compatible.</p></div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
              <select value={provider} onChange={(event) => void selectProvider(event.target.value as Provider)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800">
                <option value="gemini">Google Gemini</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic Claude</option>
              </select>
              <div className="relative">
                <KeyRound size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={hasKey ? 'Key guardada; deja vacío para conservarla' : `API key de ${PROVIDER_LABELS[provider]}`} className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10" />
              </div>
            </div>
            {message && <p className="mt-3 text-xs font-semibold text-red-700">{message}</p>}
            <button type="button" onClick={() => void activateByok()} disabled={saving || (!hasKey && apiKey.trim().length < 10)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-40">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Probar y usar {PROVIDER_LABELS[provider]}
            </button>
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-slate-300 bg-white p-4 sm:flex-row sm:items-center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800"><CloudOff size={17} /></span>
            <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-slate-950">Procesamiento local</h3><p className="mt-1 text-xs leading-5 text-slate-600">No envía el contenido a un proveedor. Requiere motor, modelo y base jurídica instalados.</p></div>
            {localReady && corpusReady && vaultReady
              ? <button type="button" onClick={() => void activateLocal()} disabled={saving} className="min-h-10 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-xs font-bold text-emerald-900 hover:bg-emerald-100">Usar local</button>
              : <button type="button" onClick={openInstallation} className="min-h-10 rounded-lg border border-slate-300 px-4 text-xs font-bold text-slate-700 hover:bg-slate-100">Revisar instalación</button>}
          </section>

          <button type="button" onClick={dismissProcessingSetup} className="text-xs font-bold text-slate-600 hover:text-slate-950">Seguir editando sin ejecutar</button>
        </div>
      </section>
    </div>
  );
};

export default ProcessingSetupDialog;
