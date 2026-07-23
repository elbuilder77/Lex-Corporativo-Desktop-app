import React, { useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Menu } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const Introduction = lazy(() => import('./components/Introduction').then(m => ({ default: m.Introduction })));
const NotificationHub = lazy(() => import('./components/NotificationHub').then(m => ({ default: m.NotificationHub })));
const EcosystemFrame = lazy(() => import('./components/EcosystemFrame').then(m => ({ default: m.EcosystemFrame })));
const FiscalModule = lazy(() => import('./components/FiscalModule').then(m => ({ default: m.FiscalModule })));
const LegalEngineering = lazy(() => import('./components/LegalEngineering').then(m => ({ default: m.LegalEngineering })));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsConditions = lazy(() => import('./components/TermsConditions').then(m => ({ default: m.TermsConditions })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const Portafolio = lazy(() => import('./components/Portafolio').then(m => ({ default: m.Portafolio })));
const Instructivo = lazy(() => import('./components/Instructivo').then(m => ({ default: m.Instructivo })));
const BuscadorLegal = lazy(() => import('./components/BuscadorLegal').then(m => ({ default: m.BuscadorLegal })));

import { useAuthStore } from './store/useAuthStore';
import { useUiStore } from './store/useUiStore';
import { useCaseStore } from './store/useCaseStore';
import { getLocalUser, getSubscriptionStatus, purgeExpiredCases, upsertCase, startLocalSession, endLocalSession } from './services/local-desktop';
import { AppView } from './types';

const DEFAULT_CASE_RETENTION_DAYS = 5;
const DEFAULT_WORKSPACE_KEY = 'lex_default_workspace';

function getCaseRetentionDays(): number {
  const raw = Number(import.meta.env.VITE_CASE_RETENTION_DAYS || DEFAULT_CASE_RETENTION_DAYS);
  if (!Number.isFinite(raw)) return DEFAULT_CASE_RETENTION_DAYS;
  return Math.min(Math.max(Math.trunc(raw), 1), 365);
}

function getRetentionUntil(): string {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + getCaseRetentionDays());
  return expiresAt.toISOString();
}

function pathToView(path: string): AppView {
  switch(path) {
    case '/': return AppView.INTRODUCTION;
    case '/ingenieria-juridica': return AppView.LEGAL_ENGINEERING;
    case '/fiscal': return AppView.FISCAL;
    case '/privacy': return AppView.PRIVACY;
    case '/terms': return AppView.TERMS;
    case '/settings': return AppView.SETTINGS;
    case '/portafolio': return AppView.PORTAFOLIO;
    case '/buscador': return AppView.SETTINGS;
    case '/instructivo': return AppView.SETTINGS; // Reusing Settings view type or just treating as setting
    default: return AppView.INTRODUCTION;
  }
}

function viewToPath(view: AppView): string {
  switch(view) {
    case AppView.INTRODUCTION: return '/';
    case AppView.LEGAL_ENGINEERING: return '/ingenieria-juridica';
    case AppView.FISCAL: return '/fiscal';
    case AppView.PRIVACY: return '/privacy';
    case AppView.TERMS: return '/terms';
    case AppView.SETTINGS: return '/settings';
    case AppView.PORTAFOLIO: return '/portafolio';
    // instructivo isn't mapped backwards strictly, it's fine
    default: return '/';
  }
}



function Layout({ children }: { children: React.ReactNode }) {
  const { isMobile, sidebarOpen, setSidebarOpen, sidebarCollapsed, notifications, dismissNotification } = useUiStore();
  const location = useLocation();

  const noSidebarRoutes = ['/', '/privacy', '/terms'];
  const hasSidebar = !noSidebarRoutes.includes(location.pathname);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  useEffect(() => {
    const applyViewportState = (matches: boolean) => {
      useUiStore.getState().setIsMobile(matches);
      useUiStore.getState().setSidebarOpen(!matches);
    };
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    applyViewportState(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => applyViewportState(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <div className={`flex h-screen ${hasSidebar ? 'bg-slate-50 text-slate-900' : 'bg-slate-50 text-slate-900'} overflow-hidden font-sans selection:bg-legal-gold/30`}>
      <Suspense fallback={null}>
        <NotificationHub notifications={notifications} onDismiss={dismissNotification} />
      </Suspense>

      {hasSidebar && sidebarOpen && isMobile && (
        <button
          type="button"
          aria-label="Cerrar menú lateral"
          className="fixed inset-0 bg-black/50 z-[70] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {hasSidebar && (!isMobile || sidebarOpen) && (
        <div className={`
          fixed inset-y-0 left-0 z-[80]
          md:relative md:inset-auto md:z-[60] md:flex-shrink-0 md:overflow-visible
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen 
            ? `pointer-events-auto translate-x-0 ${isMobile ? 'w-72' : sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}` 
            : 'pointer-events-none -translate-x-full md:translate-x-0 md:w-0'}
        `}>
          <Sidebar />
        </div>
      )}

      <main className={`flex-1 relative ${hasSidebar ? 'bg-slate-50 text-slate-900' : 'bg-slate-50 text-slate-900'} overflow-hidden ${hasSidebar && sidebarOpen && isMobile ? 'pointer-events-none md:pointer-events-auto' : ''}`}>
        {hasSidebar && !sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-4 left-4 z-[90] w-11 h-11 bg-legal-950 text-legal-gold rounded-lg flex items-center justify-center shadow-lg shadow-legal-950/30 hover:bg-legal-900 active:scale-95 transition-all duration-200"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
        )}
        <AnimatePresence mode="popLayout">
          {children}
        </AnimatePresence>
      </main>
    </div>
  );
}

function GlobalEffects() {
  const { user, setUser, setIsAuthReady, setSubscription } = useAuthStore();
  const caseState = useCaseStore();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = window.lexDesktop?.navigation?.onSettings(() => {
      navigate('/settings');
    });

    const handleOnline = () => useUiStore.getState().setIsOnline(true);
    const handleOffline = () => useUiStore.getState().setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe?.();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [navigate]);

  useEffect(() => {
    purgeExpiredCases().then(() => getLocalUser()).then(async (localUser) => {
      setUser(localUser);
      setSubscription(await getSubscriptionStatus(localUser.id));
      setIsAuthReady(true);
    }).catch(() => setIsAuthReady(true));
  }, [setUser, setIsAuthReady, setSubscription]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveSession = useCallback(async () => {
    if (!user || !caseState.currentCaseId) return;

    const sanitizeForStorage = (data: any, keyName?: string): any => {
      if (Array.isArray(data)) {
        if (keyName === 'files') {
          return data.map((file, index) => ({
            fileName: `Archivo procesado ${index + 1}`,
            mimeType: file?.mimeType || 'application/octet-stream',
            fileBase64: '',
            previewUrl: null,
          }));
        }
        return data.map((item) => sanitizeForStorage(item));
      }

      if (data !== null && typeof data === 'object') {
        if (data.type === 'file' && ('data' in data || 'name' in data)) {
          return {
            type: 'file',
            mimeType: data.mimeType,
            data: '',
            name: 'Archivo adjunto procesado',
          };
        }

        const result: any = {};
        for (const key in data) {
          if (key === 'fileName' && typeof data[key] === 'string') {
            result[key] = 'Archivo procesado';
          } else if (key === 'fileBase64' || key === 'previewUrl' || (key === 'data' && data.type === 'file')) {
            result[key] = '';
          } else {
            result[key] = sanitizeForStorage(data[key], key);
          }
        }
        return result;
      }
      return data;
    };

    try {
      let activityName = "Actividad reciente";
      if (caseState.activeModule === 'fiscal' && caseState.fiscalOperationState.title) activityName = caseState.fiscalOperationState.title;
      else if (caseState.engineeringDraftingHistory.length > 0) activityName = "Ingeniería Jurídica";
      else if (caseState.fiscalDraftingHistory.length > 0) activityName = "Generación fiscal";
      else if (caseState.fiscalAnalysisHistory.length > 0) activityName = "Análisis fiscal";

      let activityModule: 'engineering' | 'fiscal' = caseState.activeModule || 'engineering';
      if (!caseState.activeModule && (caseState.fiscalDraftingHistory.length > 0 || caseState.fiscalAnalysisHistory.length > 0)) {
        activityModule = 'fiscal';
      }

      await upsertCase({
        id: caseState.currentCaseId,
        userId: user.id,
        name: activityName,
        module: activityModule,
        date: new Date().toISOString().split('T')[0],
        fiscalAnalysisHistory: sanitizeForStorage(caseState.fiscalAnalysisHistory),
        engineeringDraftingHistory: sanitizeForStorage(caseState.engineeringDraftingHistory),
        fiscalDraftingHistory: sanitizeForStorage(caseState.fiscalDraftingHistory),
        fiscalChatHistory: sanitizeForStorage(caseState.fiscalChatHistory),
        engineeringDraftState: sanitizeForStorage(caseState.engineeringDraftState),
        fiscalDraftState: sanitizeForStorage(caseState.fiscalDraftState),
        fiscalOperationState: sanitizeForStorage(caseState.fiscalOperationState),
        retentionUntil: getRetentionUntil(),
      });
    } catch { }
  }, [user, caseState]);

  useEffect(() => {
    if (!user || !caseState.currentCaseId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveSession();
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [user, caseState, saveSession]);

  return null;
}

// Wrappers

function IntroductionWrapper() {
  const navigate = useNavigate();
  const { user, isAuthReady, logoutUser } = useAuthStore();
  const { notify } = useUiStore();
  const { loadCase, resetCase, currentCaseId } = useCaseStore();

  return (
    <motion.div
      key="intro"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute inset-0 z-50 bg-slate-50"
    >
      <Suspense fallback={
        <div className="h-full w-full flex items-center justify-center bg-slate-50">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-legal-gold border-t-transparent rounded-full" />
        </div>
      }>
        <Introduction
        user={user}
        onStart={(view) => {
          if (!currentCaseId) resetCase();
          navigate(viewToPath(view));
        }}
        onLogin={async () => {
          try {
            const localUser = await startLocalSession();
            useAuthStore.getState().setUser(localUser);
            useAuthStore.getState().setIsAuthReady(true);

            useCaseStore.getState().setCurrentCaseId(null);
            await useCaseStore.getState().fetchRecentCases();

            const defaultWorkspace = localStorage.getItem(DEFAULT_WORKSPACE_KEY);
            navigate(defaultWorkspace === 'engineering' || defaultWorkspace === 'fiscal'
              ? (defaultWorkspace === 'engineering' ? '/ingenieria-juridica' : '/fiscal')
              : '/instructivo');
          } catch {
            notify("No se pudo abrir la estación local.", "error", "Fallo de inicio");
          }
        }}
        onLogout={async () => {
          logoutUser(); useCaseStore.getState().clearAllState();
          try { await endLocalSession(); } catch { /* local session already cleared */ }
          navigate('/'); notify("Sesión local cerrada.", "info");
        }}
        onLoadCase={(c) => { loadCase(c); navigate(c.module === 'fiscal' ? '/fiscal' : '/ingenieria-juridica'); }}
      />
      </Suspense>
    </motion.div>
  );
}




function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthReady } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthReady && !user) {
      navigate('/', { replace: true });
    }
  }, [isAuthReady, user, navigate]);

  if (!isAuthReady) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#121212]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-legal-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) return <>{children}</>;

  return null;
}

function App() {
  return (
    <div className="contents">
      <GlobalEffects />
      <Layout>
        <Suspense fallback={
          <div className="h-full w-full flex items-center justify-center bg-slate-50">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-legal-gold border-t-transparent rounded-full" />
          </div>
        }>
          <Routes>
            <Route path="/" element={<IntroductionWrapper />} />
            <Route path="/portafolio" element={
              <ProtectedRoute>
                <motion.div key="portafolio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="h-full w-full block">
                  <Portafolio />
                </motion.div>
              </ProtectedRoute>
            } />
            <Route path="/buscador" element={
              <ProtectedRoute>
                <motion.div key="buscador" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="h-full w-full block">
                  <BuscadorLegal />
                </motion.div>
              </ProtectedRoute>
            } />
            <Route path="/ingenieria-juridica" element={
              <ProtectedRoute>
                <motion.div key="legal-engineering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="h-full w-full block">
                  <LegalEngineering />
                </motion.div>
              </ProtectedRoute>
            } />
            <Route path="/fiscal" element={
              <ProtectedRoute>
                <motion.div key="fiscal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="h-full w-full block">
                  <EcosystemFrame kind="fiscal">
                    <FiscalModule />
                  </EcosystemFrame>
                </motion.div>
              </ProtectedRoute>
            } />
            <Route path="/privacy" element={
              <motion.div key="privacy" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: "easeOut" }} className="absolute inset-0 z-50 bg-slate-50 text-slate-900">
                <PrivacyPolicy onBack={() => window.history.back()} />
              </motion.div>
            } />
            <Route path="/terms" element={
              <motion.div key="terms" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: "easeOut" }} className="absolute inset-0 z-50 bg-slate-50 text-slate-900">
                <TermsConditions onBack={() => window.history.back()} />
              </motion.div>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="h-full w-full block bg-slate-50 relative z-40">
                  <Settings />
                </motion.div>
              </ProtectedRoute>
            } />
            <Route path="/instructivo" element={
              <ProtectedRoute>
                <motion.div key="instructivo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="h-full w-full block bg-slate-50 relative z-40">
                  <Instructivo />
                </motion.div>
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </Layout>
    </div>
  );
}

export default App;
