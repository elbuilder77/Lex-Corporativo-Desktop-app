import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logoMarkUrl from '../assets/logo-mark.png';
import { useUiStore } from '../store/useUiStore';
import { useCaseStore } from '../store/useCaseStore';
import { LegalSettingsPanel } from './settings/LegalSettingsPanel';
import { LocalDataSettingsPanel } from './settings/LocalDataSettingsPanel';
import { SETTINGS_TABS, SettingsNavigation, type SettingsTab } from './settings/SettingsNavigation';
import { TraceabilitySettingsPanel } from './settings/TraceabilitySettingsPanel';
import { IaSettingsPanel } from './settings/IaSettingsPanel';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';
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
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    requestedTab === 'data' || requestedTab === 'security' || requestedTab === 'legal' ? requestedTab : 'ia'
  );
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
  const [ledgerStatus, setLedgerStatus] = useState<{ path: string; exists: boolean; size: number } | null>(null);
  const [ledgerExporting, setLedgerExporting] = useState(false);
  const [ledgerMessage, setLedgerMessage] = useState('');
  const [vaultExporting, setVaultExporting] = useState(false);
  const [vaultDeleting, setVaultDeleting] = useState(false);
  const [vaultMessage, setVaultMessage] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [dialogState, confirm] = useConfirmDialog();

  const containerVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
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
        enabled: true,
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
      setByokMessage(`${BYOK_PROVIDER_LABELS[settings.provider]} BYOK quedó activo.`);
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
      setByokMessage(`Conexión con ${BYOK_PROVIDER_LABELS[byokProvider]} verificada exitosamente.`);
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
      setByokMessage('API key eliminada. Las funciones generativas quedan desactivadas.');
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
    const accepted = await confirm({
      title: 'Eliminar datos locales',
      message: 'Esta acción elimina permanentemente todos los portafolios, documentos, análisis y borradores locales. ¿Deseas continuar?',
      confirmLabel: 'Eliminar todo',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!accepted) return;

    setVaultDeleting(true);
    setVaultMessage('');
    try {
      const result = await window.lexDesktop.cases.deleteAll({ confirmation: 'DELETE_ALL_LOCAL_DATA' });
      if (result.deleted !== undefined) {
        clearAllCaseState();
        setDeleteConfirmation('');
        setVaultMessage('Se eliminó la bóveda local y se restableció el estado inicial.');
        window.location.reload();
      } else {
        setVaultMessage('No se pudo restablecer la bóveda local.');
      }
    } catch (err: any) {
      setVaultMessage(err?.message || 'Fallo al eliminar la bóveda local.');
    } finally {
      setVaultDeleting(false);
    }
  };

  const runtimeChecks = [
    { id: 'vault', label: 'Bóveda local (SQLite)', ok: runtimeHealth?.capabilities.vault.ready ?? false },
    { id: 'rag', label: 'Corpus legal (LanceDB)', ok: runtimeHealth?.capabilities.legalSearch.ready ?? false },
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-50 text-slate-800">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 md:px-8">
        
        {/* Header Principal de Configuración */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white p-5 rounded-2xl shadow-xs window-drag-region">
          <div className="flex items-center gap-3">
            <img src={logoMarkUrl} alt="Lex Corporativo" className="h-9 w-9 rounded-lg object-contain window-no-drag" />
            <div>
              <h1 className="text-base font-bold text-slate-950">Configuración</h1>
              <p className="text-xs text-slate-500">Ajustes de IA, almacenamiento local y privacidad</p>
            </div>
          </div>
          <div className="flex items-center gap-2 window-no-drag">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {byokEnabled ? `${BYOK_PROVIDER_LABELS[byokProvider]} Activo` : 'IA Desconectada'}
            </span>
          </div>
        </header>

        {/* Layout: Menú de 4 Pestañas + Panel Activo */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside>
            <div className="sticky top-6">
              <SettingsNavigation activeTab={activeTab} onSelect={setActiveTab} />
            </div>
          </aside>

          <main className="min-w-0">
            <motion.div
              key={activeTab}
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-6"
            >
              {activeTab === 'ia' && (
                <IaSettingsPanel
                  byokEnabled={byokEnabled}
                  strictPrivacy={strictPrivacy}
                  setStrictPrivacy={setStrictPrivacy}
                  automaticUpdatesEnabled={automaticUpdatesEnabled}
                  setAutomaticUpdatesEnabled={setAutomaticUpdatesEnabled}
                  updateStatus={updateStatus}
                  updateMessage={updateMessage}
                  handleCheckUpdates={handleCheckUpdates}
                  byokProvider={byokProvider}
                  handleProviderChange={handleProviderChange}
                  byokApiKey={byokApiKey}
                  setByokApiKey={setByokApiKey}
                  hasApiKey={hasApiKey}
                  apiKeyFingerprint={apiKeyFingerprint}
                  byokKeyStatus={byokKeyStatus}
                  byokModel={byokModel}
                  setByokModel={setByokModel}
                  maxInputChars={maxInputChars}
                  setMaxInputChars={setMaxInputChars}
                  byokStatus={byokStatus}
                  byokMessage={byokMessage}
                  handleClearByok={handleClearByok}
                  handleTestByok={handleTestByok}
                  handleSaveByok={handleSaveByok}
                />
              )}

              {activeTab === 'data' && (
                <LocalDataSettingsPanel
                  runtimeChecks={runtimeChecks}
                  runtimeHealthLoading={runtimeHealthLoading}
                  onRefreshRuntime={() => void refreshRuntimeHealth()}
                  vaultExporting={vaultExporting}
                  vaultDeleting={vaultDeleting}
                  vaultMessage={vaultMessage}
                  deleteConfirmation={deleteConfirmation}
                  onDeleteConfirmationChange={setDeleteConfirmation}
                  onExport={() => void handleExportVault()}
                  onDelete={() => void handleDeleteVault()}
                />
              )}

              {activeTab === 'security' && (
                <TraceabilitySettingsPanel
                  ledgerStatus={ledgerStatus}
                  ledgerExporting={ledgerExporting}
                  ledgerMessage={ledgerMessage}
                  onExport={() => void handleExportLedger()}
                />
              )}

              {activeTab === 'legal' && (
                <LegalSettingsPanel
                  onOpenTerms={() => navigate('/terms')}
                  onOpenPrivacy={() => navigate('/privacy')}
                />
              )}
            </motion.div>
          </main>
        </div>

      </div>

      <ConfirmDialog {...dialogState} />
    </div>
  );
};

export default Settings;
