import React, { useEffect, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ProcessingSetupDialog } from './ProcessingSetupDialog';
import { Menu } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useUiStore } from '../store/useUiStore';

const NotificationHub = lazy(() => import('./NotificationHub').then(m => ({ default: m.NotificationHub })));

export const AppShell = ({ children }: { children: React.ReactNode }) => {
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
      <ProcessingSetupDialog />

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

      <main id="main-content" className={`flex-1 relative bg-slate-50 text-slate-900 overflow-hidden ${hasSidebar && sidebarOpen && isMobile ? 'pointer-events-none md:pointer-events-auto' : ''}`}>
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
};
