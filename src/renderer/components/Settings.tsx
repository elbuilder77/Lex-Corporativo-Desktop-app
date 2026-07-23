import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { User, Settings as SettingsIcon, Shield, Lock, FileText, AlertTriangle, LogOut, HelpCircle, ChevronRight, KeyRound, Wifi, CloudOff, CheckCircle2, RefreshCw, Download, DatabaseBackup, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { endLocalSession } from '../services/local-desktop';
import logoMarkUrl from '../assets/logo-mark.png';
import { useUiStore } from '../store/useUiStore';
import { useCaseStore } from '../store/useCaseStore';

type ByokProvider = 'gemini' | 'openai' | 'anthropic';
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

const DEFAULT_BYOK_MODELS: Record<ByokProvider, string> = {
  gemini: 'gemini-3.5-flash',
  openai: 'gpt-5.6-terra',
  anthropic: 'claude-sonnet-4-20250514',
};

const EMPTY_PROVIDER_SETTINGS: Record<ByokProvider, ByokProviderStatus> = {
  gemini: { model: DEFAULT_BYOK_MODELS.gemini, hasApiKey: false, keyStatus: 'missing', requiresApiKeyReset: false },
  openai: { model: DEFAULT_BYOK_MODELS.openai, hasApiKey: false, keyStatus: 'missing', requiresApiKeyReset: false },
  anthropic: { model: DEFAULT_BYOK_MODELS.anthropic, hasApiKey: false, keyStatus: 'missing', requiresApiKeyReset: false },
};

export const Settings: React.FC = () => {
  const { user, logoutUser } = useAuthStore();
  const navigate = useNavigate();
  const { runtimeHealth, runtimeHealthLoading, refreshRuntimeHealth } = useUiStore();
  const clearAllCaseState = useCaseStore((state) => state.clearAllState);
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'ia' | 'trazabilidad' | 'data' | 'legal' | 'session'>(requestedTab === 'ia' ? 'ia' : 'profile');
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
  const [defaultWorkspace, setDefaultWorkspace] = useState<'instructivo' | 'engineering' | 'fiscal'>('instructivo');
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

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: <User size={16} /> },
    { id: 'preferences', label: 'Preferencias', icon: <SettingsIcon size={16} /> },
    { id: 'ia', label: 'IA y API', icon: <KeyRound size={16} /> },
    { id: 'trazabilidad', label: 'Trazabilidad y Logs', icon: <Shield size={16} /> },
    { id: 'data', label: 'Datos locales', icon: <DatabaseBackup size={16} /> },
    { id: 'legal', label: 'Legal y Privacidad', icon: <FileText size={16} /> },
    { id: 'session', label: 'Sesión', icon: <Lock size={16} /> },
  ] as const;

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
    if (requestedTab && tabs.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab as typeof activeTab);
    }
  }, [requestedTab]);

  const handleLogout = async () => {
    logoutUser();
    try { await endLocalSession(); } catch { }
    navigate('/');
  };

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

  const runtimeCheck = (id: string) => runtimeHealth?.checks.find((check) => check.id === id);
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
            <p className="text-xs text-slate-500 mt-0.5">Gestiona tu identidad y preferencias en Lex Corporativo.</p>
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
            <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-1" aria-label="Secciones de configuración">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all sm:text-sm ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200'
                  }`}
                >
                  {tab.icon}
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content area */}
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-9 min-h-[450px]">
            {activeTab === 'profile' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-6">Perfil de Usuario</h2>
                  <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                    <img
                      src={user?.photoURL || logoMarkUrl}
                      alt="Perfil"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md"
                    />
                    <div>
                      <p className="text-lg font-bold text-slate-900">{user?.displayName || 'Usuario Lex'}</p>
                      <p className="text-sm text-slate-500 font-medium">{user?.email}</p>
                      <span className="inline-flex mt-2 px-2 py-0.5 bg-legal-gold/10 text-legal-golddark text-[10px] font-bold uppercase tracking-wider rounded border border-legal-gold/20">
                        Perfil local
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      El perfil es local a este equipo. La aplicación no requiere cuenta en línea para operar portafolios, consultas o documentos.
                    </p>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-8">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Preferencias del Sistema</h2>

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5" aria-labelledby="runtime-status-title">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 id="runtime-status-title" className="text-sm font-bold text-slate-900">Recursos de esta estación</h3>
                      <p className="mt-1 text-xs text-slate-500">Disponibilidad comprobada; no representa conexión a internet ni una licencia comercial.</p>
                    </div>
                    <button type="button" onClick={() => void refreshRuntimeHealth()} disabled={runtimeHealthLoading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                      <RefreshCw size={14} className={runtimeHealthLoading ? 'animate-spin' : ''} /> Comprobar
                    </button>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {['vault', 'rag', 'rust', 'gguf'].map((id) => {
                      const check = runtimeCheck(id);
                      return (
                        <div key={id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                          {check?.ok ? <CheckCircle2 size={15} className="text-emerald-600" /> : <AlertTriangle size={15} className="text-amber-600" />}
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{check?.label || 'Comprobando recurso'}</span>
                          <span className={`text-[9px] font-bold uppercase ${check?.ok ? 'text-emerald-700' : 'text-amber-700'}`}>{check?.ok ? 'Listo' : 'Pendiente'}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <div className="space-y-6">
                  <div className="group">
                    <label htmlFor="default-workspace" className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pantalla al iniciar</label>
                    <div className="relative">
                      <select
                        id="default-workspace"
                        value={defaultWorkspace}
                        onChange={(event) => {
                          setDefaultWorkspace(event.target.value as typeof defaultWorkspace);
                          setPreferenceSaved(false);
                        }}
                        className="w-full max-w-sm rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-legal-gold/10 focus:border-legal-gold/50 bg-slate-50 font-medium transition-all appearance-none"
                      >
                        <option value="instructivo">Inicio</option>
                        <option value="engineering">Ingeniería Jurídica</option>
                        <option value="fiscal">Fiscal</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronRight size={16} className="rotate-90" />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Define la primera herramienta que se abre después de entrar a la estación.</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
                  <p className="text-[11px] text-slate-400 font-medium">La preferencia se guarda únicamente en este dispositivo.</p>
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-slate-800"
                  >
                    {preferenceSaved && <CheckCircle2 size={15} className="text-emerald-300" />}
                    {preferenceSaved ? 'Guardado' : 'Guardar preferencia'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'ia' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-2">IA y API propia</h2>
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
                        <h3 className="text-sm font-bold text-slate-900">Modo local</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{localGenerationReady ? 'Motor y modelo instalados en este equipo.' : 'Seleccionable, pero la inferencia no está instalada.'}</p>
                      </div>
                    </div>
                    <p className={`mt-3 text-[10px] font-bold uppercase tracking-wider ${localGenerationReady ? 'text-emerald-700' : 'text-amber-800'}`}>{localGenerationReady ? 'Generación disponible' : 'Motor o GGUF pendiente'}</p>
                  </div>

                  <div className={`p-5 rounded-2xl border ${byokEnabled ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-blue-100 flex items-center justify-center">
                        <Wifi size={17} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">BYOK multiproveedor</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{BYOK_PROVIDER_LABELS[byokProvider]} con tu API key.</p>
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
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${strictPrivacy ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
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
                    <label htmlFor="byok-provider" className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Proveedor BYOK</label>
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
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">API key de {BYOK_PROVIDER_LABELS[byokProvider]}</label>
                      <input
                        type="password"
                        value={byokApiKey}
                        onChange={(e) => setByokApiKey(e.target.value)}
                        placeholder={hasApiKey ? 'API key guardada. Escribe una nueva para reemplazarla.' : `Pega aquí tu API key de ${BYOK_PROVIDER_LABELS[byokProvider]}`}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-legal-gold/10 focus:border-legal-gold/50 bg-white font-medium transition-all"
                      />
                      {hasApiKey && (
                        <p className="text-[10px] text-slate-400 font-medium mt-2">
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
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Modelo</label>
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
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Límite de texto enviado al proveedor</label>
                      <input
                        type="range"
                        min={10000}
                        max={200000}
                        step={5000}
                        value={maxInputChars}
                        onChange={(e) => setMaxInputChars(Number(e.target.value))}
                        className="w-full accent-slate-900"
                      />
                      <p className="text-[10px] text-slate-400 font-medium mt-2">
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
              <div className="space-y-8">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Auditoría y Trazabilidad Local</h2>

                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex gap-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                    <Shield size={20} className="text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Bitácora Local de Decisiones (Ledger)</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Las operaciones jurídicas locales y BYOK compatibles quedan registradas
                      en una bitácora JSONL saneada en este equipo. Este registro almacena hashes de entradas y salidas, 
                      identificadores exactos de fuentes, vínculos afirmación–fuente y metadatos mínimos de trazabilidad, sin guardar el texto completo del portafolio.
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-2">
                      Ruta local: <code className="break-all bg-slate-200 px-1 py-0.5 rounded">{ledgerStatus?.path || 'Consultando ruta local...'}</code>
                    </p>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {ledgerStatus?.exists
                        ? `${Math.max(1, Math.round(ledgerStatus.size / 1024))} KB disponibles`
                        : 'Sin registros todavía'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500" role="status">{ledgerMessage}</p>
                  <button
                    onClick={handleExportLedger}
                    disabled={ledgerExporting || !ledgerStatus?.exists}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-md"
                  >
                    <Download size={16} />
                    {ledgerExporting ? 'Exportando...' : 'Exportar bitácora'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Datos locales</h2>
                  <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
                    Los portafolios se conservan al desinstalar. Desde aquí puedes crear un respaldo legible o eliminarlos de forma explícita.
                  </p>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex max-w-2xl items-start gap-3">
                      <span className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600"><DatabaseBackup size={20} /></span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Exportar respaldo integral</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Incluye portafolios, documentos, análisis, borradores y estado de trabajo en un JSON con hash SHA-256. El respaldo queda sin cifrar en la ubicación que elijas; protégelo como información confidencial.</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => void handleExportVault()} disabled={vaultExporting} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                      <Download size={15} /> {vaultExporting ? 'Exportando…' : 'Exportar respaldo'}
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-red-200 bg-red-50 p-5" aria-labelledby="delete-vault-title">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl border border-red-200 bg-white p-2 text-red-600"><Trash2 size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <h3 id="delete-vault-title" className="text-sm font-bold text-red-900">Eliminar toda la bóveda local</h3>
                      <p className="mt-1 text-xs leading-5 text-red-800">La eliminación es irreversible. Exporta primero un respaldo si necesitas conservar el trabajo.</p>
                      <label htmlFor="delete-vault-confirmation" className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-red-800">Escribe ELIMINAR para habilitar la acción</label>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input id="delete-vault-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" className="min-h-10 flex-1 rounded-xl border border-red-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200" />
                        <button type="button" onClick={() => void handleDeleteVault()} disabled={deleteConfirmation !== 'ELIMINAR' || vaultDeleting} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-xs font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40">
                          <Trash2 size={15} /> {vaultDeleting ? 'Eliminando…' : 'Eliminar datos'}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <p className="text-xs text-slate-600" role="status">{vaultMessage}</p>
              </div>
            )}

            {activeTab === 'legal' && (
              <div className="space-y-8">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Legal y Transparencia</h2>

                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => navigate('/terms')} className="w-full flex items-center justify-between p-5 rounded-2xl border border-slate-200 hover:border-legal-gold/30 hover:bg-slate-50 transition-all text-left group">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-white transition-colors">
                            <FileText size={18} className="text-slate-400 group-hover:text-legal-gold" />
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Términos y Condiciones</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-all" />
                  </button>
                  
                  <button onClick={() => navigate('/privacy')} className="w-full flex items-center justify-between p-5 rounded-2xl border border-slate-200 hover:border-legal-gold/30 hover:bg-slate-50 transition-all text-left group">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-white transition-colors">
                            <Shield size={18} className="text-slate-400 group-hover:text-legal-gold" />
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Aviso de Privacidad</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4 uppercase tracking-wider">
                      <HelpCircle size={16} className="text-legal-gold" /> Protocolo de Inteligencia Jurídica
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-3 font-medium leading-relaxed">
                      <li className="flex gap-2"><span className="text-legal-gold">•</span> Lex Corporativo es un sistema de soporte documental asistido, no constituye asesoría legal vinculante.</li>
                      <li className="flex gap-2"><span className="text-legal-gold">•</span> Toda resolución generada por el sistema debe ser validada por un profesional del derecho.</li>
                      <li className="flex gap-2"><span className="text-legal-gold">•</span> En modo local, el procesamiento permanece en este equipo. Con BYOK, la selección mostrada en IA y API se transmite al proveedor elegido bajo sus políticas.</li>
                    </ul>
                </div>
              </div>
            )}

            {activeTab === 'session' && (
              <div className="space-y-8">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Gestión de Sesión</h2>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <Lock size={18} className="text-slate-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">Sesión Local</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            La estación trabaja sin autenticación en la nube. Los portafolios y registros se conservan localmente en este dispositivo.
                        </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-6 py-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl text-sm font-bold transition-all group shadow-sm"
                  >
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Cerrar Sesión Activa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
