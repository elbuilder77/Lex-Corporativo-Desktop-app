import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, AlertTriangle, Wifi, CloudOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logoMarkUrl from '../assets/logo-mark.png';
import { useUiStore } from '../store/useUiStore';
import { useCaseStore } from '../store/useCaseStore';
import { LegalSettingsPanel } from './settings/LegalSettingsPanel';
import { LocalDataSettingsPanel } from './settings/LocalDataSettingsPanel';
import { PreferencesSettingsPanel, type DefaultWorkspace } from './settings/PreferencesSettingsPanel';
import { SETTINGS_TABS, SettingsNavigation, type SettingsTab } from './settings/SettingsNavigation';
import { StationSettingsPanel } from './settings/StationSettingsPanel';
import { TraceabilitySettingsPanel } from './settings/TraceabilitySettingsPanel';
import { DEFAULT_BYOK_MODELS, type ByokProvider } from '../../shared/byok-models';

type ByokProviderStatus = {
  model: string;
  hasApiKey: boolean;
  keyStatus: 'missing' | 'ready' | 'unreadable';
  requiresApiKeyReset: boolean;
  apiKeyFingerprint?: string;
  updatedAt?: string;
};

const BYOK_PROVIDER_LABELS: Record<ByokProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
};

const EMPTY_PROVIDER_SETTINGS: Record<ByokProvider, ByokProviderStatus> = {
  gemini: { model: DEFAULT_BYOK_MODELS.gemini, hasApiKey: false, keyStatus: 'missing', requiresApiKeyReset: false },
  openai: { model: DEFAULT_BYOK_MODELS.openai, hasApiKey: false, keyStatus: 'missing', requiresApiKeyReset: false },
  anthropic: { model: DEFAULT_BYOK_MODELS.anthropic, hasApiKey: false, keyStatus: 'missing', requiresApiKeyReset: false },
};

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { runtimeHealth, runtimeHealthLoading, refreshRuntimeHealth } = useUiStore();
  const clearAllCaseState = useCaseStore((state) => state.clearAllState);
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<SettingsTab>(requestedTab === 'ia' ? 'ia' : 'profile');
  const [byokEnabled, setByokEnabled] = useState(false);
  const [byokProvider, setByokProvider] = useState<ByokProvider>('gemini');
  const [byokProviders, setByokProviders] = useState<Record<ByokProvider, ByokProviderStatus>>(EMPTY_PROVIDER_SETTINGS);
  const [byokModel, setByokModel] = useState('gemini-3.5-flash');
  const [byokApiKey, setByokApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [byokKeyStatus, setByokKeyStatus] = useState<'missing' | 'ready' | 'unreadable'>('missing');
  const [apiKeyFingerprint, setApiKeyFingerprint] = useState<string | undefined>();
  const [strictPrivacy, setStrictPrivacy] = useState(true);
  const [automaticUpdatesEnabled, setAutomaticUpdatesEnabled] = useState(false);
  const [maxInputChars, setMaxInputChars] = useState(60000);
  const [byokStatus, setByokStatus] = useState<'idle' | 'saving' | 'testing' | 'ok' | 'error'>('idle');
  const [byokMessage, setByokMessage] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [updateMessage, setUpdateMessage] = useState('');
  const [defaultWorkspace, setDefaultWorkspace] = useState<DefaultWorkspace>('instructivo');
  const [preferenceSaved, setPreferenceSaved] = useState(false);
  const [ledgerStatus, setLedgerStatus] = useState<{ path: string; exists: boolean; size: number } | null>(null);
  const [ledgerExporting, setLedgerExporting] = useState(false);
  const [ledgerMessage, setLedgerMessage] = useState('');
  const [vaultExporting, setVaultExporting] = useState(false);
  const [vaultDeleting, setVaultDeleting] = useState(false);
  const [vaultMessage, setVaultMessage] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const applyByokSettings = (settings: Awaited<ReturnType<typeof window.lexDesktop.byok.getSettings>>) => {
    setByokEnabled(settings.enabled);
    setByokProvider(settings.provider);
    setByokProviders(settings.providers);
    setByokModel(settings.model);
    setHasApiKey(settings.hasApiKey);
    setByokKeyStatus(settings.keyStatus);
    setApiKeyFingerprint(settings.apiKeyFingerprint);
    setStrictPrivacy(settings.strictPrivacy);
    setAutomaticUpdatesEnabled(settings.automaticUpdatesEnabled);
    setMaxInputChars(settings.maxInputChars);
  };

  const handleProviderChange = (provider: ByokProvider) => {
    const status = byokProviders[provider];
    setByokProvider(provider);
    setByokModel(status?.model || DEFAULT_BYOK_MODELS[provider]);
    setHasApiKey(Boolean(status?.hasApiKey));
    setByokKeyStatus(status?.keyStatus || 'missing');
    setApiKeyFingerprint(status?.apiKeyFingerprint);
    setByokApiKey('');
    setByokEnabled(Boolean(status?.hasApiKey));
    setByokStatus('idle');
    setByokMessage('');
  };

  useEffect(() => {
    const savedWorkspace = localStorage.getItem('lex_default_workspace');
    if (savedWorkspace === 'engineering' || savedWorkspace === 'fiscal') {
      setDefaultWorkspace(savedWorkspace);
    }

    window.lexDesktop?.byok?.getSettings().then(applyByokSettings).catch(() => undefined);

    window.lexDesktop?.traceability?.getStatus()
      .then(setLedgerStatus)
      .catch(() => setLedgerStatus(null));

    void refreshRuntimeHealth();
  }, [refreshRuntimeHealth]);

  useEffect(() => {
    if (requestedTab && SETTINGS_TABS.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab as SettingsTab);
    }
  }, [requestedTab]);

  const handleSaveByok = async () => {
    setByokStatus('saving');
    setByokMessage('');
    try {
      const settings = await window.lexDesktop.byok.saveSettings({
        enabled: byokEnabled,
        provider: byokProvider,
        model: byokModel,
        apiKey: byokApiKey.trim() || undefined,
        strictPrivacy,
        automaticUpdatesEnabled: strictPrivacy ? false : automaticUpdatesEnabled,
        maxInputChars,
      });
      applyByokSettings(settings);
      setByokApiKey('');
      setByokStatus('ok');
      setByokMessage(settings.enabled ? `${BYOK_PROVIDER_LABELS[settings.provider]} BYOK quedó activo.` : 'Modo local seleccionado.');
    } catch (err: any) {
      setByokStatus('error');
      setByokMessage(err?.message || 'No se pudo guardar la configuración.');
    }
  };

  const handleTestByok = async () => {
    setByokStatus('testing');
    setByokMessage('');
    try {
      await window.lexDesktop.byok.testConnection({
        provider: byokProvider,
        model: byokModel,
        apiKey: byokApiKey.trim() || undefined,
      });
      setByokStatus('ok');
      setByokMessage(`Conexión con ${BYOK_PROVIDER_LABELS[byokProvider]} verificada.`);
    } catch (err: any) {
      setByokStatus('error');
      setByokMessage(err?.message || `No se pudo conectar con ${BYOK_PROVIDER_LABELS[byokProvider]}.`);
    }
  };

  const handleClearByok = async () => {
    setByokStatus('saving');
    setByokMessage('');
    try {
      const settings = await window.lexDesktop.byok.clearKey({ provider: byokProvider });
      applyByokSettings(settings);
      setByokApiKey('');
      setByokStatus('ok');
      setByokMessage('API key eliminada. La app selecciona el modo local.');
    } catch (err: any) {
      setByokStatus('error');
      setByokMessage(err?.message || 'No se pudo eliminar la API key.');
    }
  };

  const handleCheckUpdates = async () => {
    setUpdateStatus('checking');
    setUpdateMessage('');
    try {
      const result = await window.lexDesktop.settings.checkForUpdates();
      if (result.ok) {
        setUpdateStatus('ok');
        setUpdateMessage(result.version ? `Búsqueda completada. Versión detectada: ${result.version}.` : 'Búsqueda completada.');
      } else {
        setUpdateStatus(result.status === 'dev-mode' ? 'ok' : 'error');
        setUpdateMessage(result.message || 'No se encontraron actualizaciones.');
      }
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdateMessage(err?.message || 'No se pudo revisar actualizaciones.');
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('lex_default_workspace', defaultWorkspace);
    setPreferenceSaved(true);
    window.setTimeout(() => setPreferenceSaved(false), 2500);
  };

  const handleExportLedger = async () => {
    setLedgerExporting(true);
    setLedgerMessage('');
    try {
      const result = await window.lexDesktop.traceability.exportLedger();
      if (result.success) {
        setLedgerMessage(`Bitácora exportada en ${result.filePath}.`);
      } else if (result.reason === 'empty') {
        setLedgerMessage('La bitácora aún no contiene decisiones para exportar.');
      }
      setLedgerStatus(await window.lexDesktop.traceability.getStatus());
    } catch (err: any) {
      setLedgerMessage(err?.message || 'No se pudo exportar la bitácora.');
    } finally {
      setLedgerExporting(false);
    }
  };

  const handleExportVault = async () => {
    setVaultExporting(true);
    setVaultMessage('');
    try {
      const result = await window.lexDesktop.cases.exportAll();
      if (result.success) {
        setVaultMessage(`Respaldo de ${result.caseCount} portafolio(s) exportado en ${result.filePath}.`);
      } else if (result.canceled) {
        setVaultMessage('Exportación cancelada; no se modificó la bóveda local.');
      }
    } catch (err: any) {
      setVaultMessage(err?.message || 'No se pudo exportar el respaldo integral.');
    } finally {
      setVaultExporting(false);
    }
  };

  const handleDeleteVault = async () => {
    if (deleteConfirmation !== 'ELIMINAR') return;
    const accepted = window.confirm('Esta acción elimina permanentemente todos los portafolios, documentos, análisis y borradores locales. ¿Deseas continuar?');
    if (!accepted) return;

    setVaultDeleting(true);
    setVaultMessage('');
    try {
      const result = await window.lexDesktop.cases.deleteAll({ confirmation: 'DELETE_ALL_LOCAL_DATA' });
      clearAllCaseState();
      setDeleteConfirmation('');
      setVaultMessage(`Se eliminaron permanentemente ${result.deleted} portafolio(s) locales.`);
    } catch (err: any) {
      setVaultMessage(err?.message || 'No se pudieron eliminar los datos locales.');
    } finally {
      setVaultDeleting(false);
    }
  };

  const localGenerationReady = Boolean(runtimeHealth?.rust.binaryExists && runtimeHealth.rust.expectedGgufModelExists);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 text-slate-700 scrollbar-hide flex flex-col font-sans">
      <header className="pl-16 pr-4 md:px-8 py-5 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
            <SettingsIcon className="text-legal-gold" size={20} />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-slate-900 tracking-tight">Configuración</h2>
            <p className="text-xs text-slate-500 mt-0.5">Procesamiento, datos y preferencias de esta estación.</p>
          </div>
        </div>
      </header>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto w-full max-w-6xl flex-1 px-5 py-7 md:px-8 md:py-10"
      >
        <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
          {/* Sidebar nav */}
          <div className="min-w-0">
            <SettingsNavigation activeTab={activeTab} onSelect={setActiveTab} />
          </div>

          {/* Content area */}
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-9 min-h-[450px]">
            {activeTab === 'profile' && (
              <StationSettingsPanel
                imageUrl={logoMarkUrl}
                onReturnToCover={() => {
                  localStorage.removeItem('lex_station_opened');
                  navigate('/');
                }}
              />
            )}
            {activeTab === 'preferences' && (
              <PreferencesSettingsPanel
                runtimeChecks={runtimeHealth?.checks || []}
                runtimeHealthLoading={runtimeHealthLoading}
                defaultWorkspace={defaultWorkspace}
                preferenceSaved={preferenceSaved}
                onRefreshRuntime={() => void refreshRuntimeHealth()}
                onWorkspaceChange={(workspace) => {
                  setDefaultWorkspace(workspace);
                  setPreferenceSaved(false);
                }}
                onSave={handleSavePreferences}
              />
            )}
            {activeTab === 'ia' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-2">Modo de procesamiento</h2>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                    Lex Corporativo puede operar localmente o usar Gemini, OpenAI y Anthropic Claude con una API key de tu propia cuenta.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-5 rounded-2xl border ${!byokEnabled ? (localGenerationReady ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-200') : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-emerald-100 flex items-center justify-center">
                        <CloudOff size={17} className="text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">En este equipo</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{localGenerationReady ? 'Motor y modelo instalados en este equipo.' : 'Seleccionable, pero la inferencia no está instalada.'}</p>
                      </div>
                    </div>
                    <p className={`mt-3 text-xs font-bold uppercase tracking-wider ${localGenerationReady ? 'text-emerald-700' : 'text-amber-800'}`}>{localGenerationReady ? 'Generación disponible' : 'Motor o GGUF pendiente'}</p>
                  </div>

                  <div className={`p-5 rounded-2xl border ${byokEnabled ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-blue-100 flex items-center justify-center">
                        <Wifi size={17} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">API propia</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{BYOK_PROVIDER_LABELS[byokProvider]} con tu API key.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-6 bg-white rounded-2xl border border-slate-200">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Privacidad y conexiones</h3>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Controla cualquier conexión externa que no sea iniciada por el usuario.
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${strictPrivacy ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                      {strictPrivacy ? 'Conexiones de fondo bloqueadas' : 'Conexiones de fondo permitidas'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={strictPrivacy}
                        onChange={(e) => {
                          setStrictPrivacy(e.target.checked);
                          if (e.target.checked) setAutomaticUpdatesEnabled(false);
                        }}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-legal-gold"
                      />
                      <span>
                        <span className="block text-sm font-bold text-slate-900">Privacidad estricta</span>
                        <span className="block text-xs text-slate-500 leading-relaxed mt-1">
                          Impide conexiones ajenas al flujo. Si BYOK está activo, el proveedor sólo se contacta al ejecutar una operación compatible.
                        </span>
                      </span>
                    </label>

                    <label className={`flex items-start gap-3 p-4 rounded-xl border ${strictPrivacy ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-200 bg-slate-50'} cursor-pointer`}>
                      <input
                        type="checkbox"
                        checked={automaticUpdatesEnabled && !strictPrivacy}
                        disabled={strictPrivacy}
                        onChange={(e) => setAutomaticUpdatesEnabled(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-legal-gold"
                      />
                      <span>
                        <span className="block text-sm font-bold text-slate-900">Buscar updates al iniciar</span>
                        <span className="block text-xs text-slate-500 leading-relaxed mt-1">
                          Permite consultar GitHub automáticamente cuando la app instalada abre.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {updateStatus === 'ok' && <CheckCircle2 size={15} className="text-emerald-600" />}
                      {updateStatus === 'error' && <AlertTriangle size={15} className="text-red-500" />}
                      <span>{updateMessage || 'La búsqueda manual de updates solo se ejecuta cuando el usuario la solicita.'}</span>
                    </div>
                    <button
                      onClick={handleCheckUpdates}
                      disabled={updateStatus === 'checking'}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold transition-colors"
                    >
                      <RefreshCw size={14} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
                      {updateStatus === 'checking' ? 'Buscando...' : 'Buscar updates'}
                    </button>
                  </div>
                </div>

                <div className="space-y-5 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label htmlFor="byok-provider" className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Proveedor</label>
                    <select
                      id="byok-provider"
                      value={byokProvider}
                      onChange={(event) => handleProviderChange(event.target.value as ByokProvider)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-legal-gold/10 focus:border-legal-gold/50 bg-white font-medium transition-all"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic Claude</option>
                    </select>
                    <p className="mt-2 text-xs text-slate-500">Cada proveedor conserva por separado su modelo y su key cifrada por el sistema operativo.</p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={byokEnabled}
                      onChange={(e) => setByokEnabled(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-legal-gold"
                    />
                    <span>
                      <span className="block text-sm font-bold text-slate-900">Usar {BYOK_PROVIDER_LABELS[byokProvider]} como modo de procesamiento</span>
                      <span className="block text-xs text-slate-500 leading-relaxed mt-1">
                        Al guardar y activar, las consultas, análisis y redacciones compatibles usarán este proveedor hasta que desactives BYOK.
                      </span>
                    </span>
                  </label>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
                    <strong>Qué sale del equipo:</strong> al ejecutar un flujo BYOK se envían por HTTPS la instrucción, una selección limitada del texto extraído y los fundamentos locales recuperados. El archivo original y la bóveda completa no se transmiten. El proveedor puede tratar o conservar lo enviado conforme a tu cuenta y sus propias políticas.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">API key de {BYOK_PROVIDER_LABELS[byokProvider]}</label>
                      <input
                        type="password"
                        value={byokApiKey}
                        onChange={(e) => setByokApiKey(e.target.value)}
                        placeholder={hasApiKey ? 'API key guardada. Escribe una nueva para reemplazarla.' : `Pega aquí tu API key de ${BYOK_PROVIDER_LABELS[byokProvider]}`}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-legal-gold/10 focus:border-legal-gold/50 bg-white font-medium transition-all"
                      />
                      {hasApiKey && (
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          Key guardada localmente. Huella: <code className="bg-slate-200 px-1 py-0.5 rounded">{apiKeyFingerprint}</code>
                        </p>
                      )}
                      {byokKeyStatus === 'unreadable' && (
                        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          La key guardada ya no puede descifrarse en este perfil. Escribe una nueva para reactivar BYOK.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Modelo</label>
                      <input
                        type="text"
                        value={byokModel}
                        onChange={(e) => setByokModel(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-legal-gold/10 focus:border-legal-gold/50 bg-white font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_150px] gap-3 items-end">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Límite de texto enviado al proveedor</label>
                      <input
                        type="range"
                        min={10000}
                        max={200000}
                        step={5000}
                        value={maxInputChars}
                        onChange={(e) => setMaxInputChars(Number(e.target.value))}
                        className="w-full accent-slate-900"
                      />
                      <p className="mt-2 text-xs font-medium text-slate-500">
                        Control de costo y exposición: se recorta primero la evidencia, conservando las instrucciones y el contrato de salida.
                      </p>
                    </div>
                    <input
                      type="number"
                      min={10000}
                      max={200000}
                      step={5000}
                      value={maxInputChars}
                      onChange={(e) => setMaxInputChars(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-legal-gold/10 focus:border-legal-gold/50 bg-white font-medium transition-all"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {byokStatus === 'ok' && <CheckCircle2 size={15} className="text-emerald-600" />}
                      {byokStatus === 'error' && <AlertTriangle size={15} className="text-red-500" />}
                      <span>{byokMessage || (byokEnabled ? `${BYOK_PROVIDER_LABELS[byokProvider]} procesará automáticamente los flujos compatibles.` : localGenerationReady ? 'Modo local seleccionado y disponible.' : 'Modo local seleccionado; la generación requiere instalar el motor y el modelo GGUF.')}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {hasApiKey && (
                        <button
                          onClick={handleClearByok}
                          disabled={byokStatus === 'saving' || byokStatus === 'testing'}
                          className="px-4 py-2 rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors"
                        >
                          Eliminar key
                        </button>
                      )}
                      <button
                        onClick={handleTestByok}
                        disabled={byokStatus === 'saving' || byokStatus === 'testing' || (!hasApiKey && !byokApiKey.trim())}
                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold transition-colors"
                      >
                        {byokStatus === 'testing' ? 'Probando...' : 'Probar conexión'}
                      </button>
                      <button
                        onClick={handleSaveByok}
                        disabled={byokStatus === 'saving' || byokStatus === 'testing'}
                        className="px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 text-xs font-bold transition-colors shadow-md"
                      >
                        {byokStatus === 'saving' ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    Importante: el modo local mantiene los documentos en la computadora. Mientras BYOK permanezca activado, cada operación compatible enviará instrucciones, texto extraído y fundamentos seleccionados a {BYOK_PROVIDER_LABELS[byokProvider]}; el archivo original no se transmite. Para información confidencial utiliza un proyecto de API y políticas aprobadas por tu organización.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'trazabilidad' && (
              <TraceabilitySettingsPanel
                ledgerStatus={ledgerStatus}
                ledgerExporting={ledgerExporting}
                ledgerMessage={ledgerMessage}
                onExport={() => void handleExportLedger()}
              />
            )}
            {activeTab === 'data' && (
              <LocalDataSettingsPanel
                vaultExporting={vaultExporting}
                vaultDeleting={vaultDeleting}
                vaultMessage={vaultMessage}
                deleteConfirmation={deleteConfirmation}
                onDeleteConfirmationChange={setDeleteConfirmation}
                onExport={() => void handleExportVault()}
                onDelete={() => void handleDeleteVault()}
              />
            )}
            {activeTab === 'legal' && (
              <LegalSettingsPanel
                onOpenTerms={() => navigate('/terms')}
                onOpenPrivacy={() => navigate('/privacy')}
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
