import React, { useRef, useState } from 'react';
import { ModuleTab } from '../types';
import { House, Landmark, FileSignature, BookOpen, X, Calculator, Settings, FolderOpen, ChevronLeft, ChevronRight, Search, ClipboardList, ShieldCheck, ReceiptText } from 'lucide-react';
import { cn } from '../lib/utils';
import { BRAND_CONTENT } from '../lib/product-content';
import logoUrl from '../assets/logo-mark.png';

import { useUiStore } from '../store/useUiStore';
import { useCaseStore } from '../store/useCaseStore';
import { useNavigate, useLocation } from 'react-router-dom';

const fiscalSubItems: { tab: ModuleTab; label: string; icon: React.ReactNode }[] = [
  { tab: 'fiscal-consultation', label: 'Consulta', icon: <Search size={14} /> },
  { tab: 'fiscal-preparation', label: 'Preparación', icon: <ShieldCheck size={14} /> },
  { tab: 'fiscal-materiality', label: 'Materialidad', icon: <ClipboardList size={14} /> },
  { tab: 'fiscal-deductibility', label: 'Deducibilidad / IVA', icon: <ReceiptText size={14} /> },
  { tab: 'fiscal-documentation', label: 'Documentación', icon: <FileSignature size={14} /> },
  { tab: 'fiscal-regulations', label: 'Normativa', icon: <BookOpen size={14} /> },
];

export const Sidebar: React.FC = () => {
  const [logoError, setLogoError] = useState(false);
  const [temporarilyExpanded, setTemporarilyExpanded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  
  const { activeTab, setActiveTab, setSidebarOpen, isMobile, sidebarCollapsed, setSidebarCollapsed, runtimeHealth } = useUiStore();

  const currentPath = location.pathname;
  const searchMatter = new URLSearchParams(location.search).get('materia') === 'fiscal' ? 'fiscal' : 'mercantil';
  const visuallyCollapsed = !isMobile && sidebarCollapsed && !temporarilyExpanded;
  
  const ecosystemItems = [
    {
      path: '/instructivo',
      label: 'Estación',
      description: 'Instructivo interactivo',
      icon: <BookOpen size={18} />,
      badge: null,
      subItems: null,
      activeColor: 'text-legal-gold',
      activeBg: 'bg-slate-100',
      activeBorder: 'border-slate-300',
      dot: 'bg-slate-400',
    },
    {
      path: '/portafolio',
      label: 'Portafolio',
      description: 'Actividad legal reciente',
      icon: <FolderOpen size={18} />,
      badge: null,
      subItems: null,
      activeColor: 'text-legal-gold',
      activeBg: 'bg-slate-100',
      activeBorder: 'border-slate-300',
      dot: 'bg-slate-400',
    },
    {
      path: '/buscador',
      label: 'Consultas',
      description: 'Consulta y fundamentos locales',
      icon: <Search size={18} />,
      badge: null,
      subItems: null,
      activeColor: searchMatter === 'fiscal' ? 'text-fiscal-light' : 'text-blue-400',
      activeBg: searchMatter === 'fiscal' ? 'bg-fiscal-light/10' : 'bg-blue-400/10',
      activeBorder: searchMatter === 'fiscal' ? 'border-fiscal-light/40' : 'border-blue-400/40',
      dot: searchMatter === 'fiscal' ? 'bg-fiscal-light' : 'bg-blue-400',
    },
    {
      path: '/ingenieria-juridica',
      label: 'Documentos y contratos',
      description: 'Ingeniería Jurídica',
      icon: <FileSignature size={18} />,
      badge: null,
      subItems: null,
      activeColor: 'text-blue-400',
      activeBg: 'bg-blue-400/10',
      activeBorder: 'border-blue-400/40',
      dot: 'bg-blue-400',
    },
    {
      path: '/fiscal',
      label: 'Flujo Fiscal',
      description: 'Materialidad, CFDI y cumplimiento',
      icon: <Calculator size={18} />,
      badge: null,
      subItems: fiscalSubItems,
      activeColor: 'text-fiscal-light',
      activeBg: 'bg-fiscal-light/10',
      activeBorder: 'border-fiscal-light/40',
      dot: 'bg-fiscal-light',
    },
    {
      path: '/settings',
      label: 'Configuración',
      description: 'Ajustes del sistema',
      icon: <Settings size={18} />,
      badge: null,
      subItems: null,
      activeColor: 'text-legal-gold',
      activeBg: 'bg-slate-100',
      activeBorder: 'border-slate-300',
      dot: 'bg-slate-400',
    },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setActiveTab(path.includes('fiscal') ? 'fiscal-consultation' : 'analysis');
    if (path.includes('ingenieria-juridica')) {
      useCaseStore.getState().switchModule('engineering');
    } else if (path.includes('fiscal')) {
      useCaseStore.getState().switchModule('fiscal');
    }
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleReturnToCover = () => {
    localStorage.removeItem('lex_station_opened');
    navigate('/');
  };

  return (
    <aside
      ref={sidebarRef}
      onMouseEnter={() => { if (!isMobile && sidebarCollapsed) setTemporarilyExpanded(true); }}
      onMouseLeave={() => setTemporarilyExpanded(false)}
      onFocusCapture={() => { if (!isMobile && sidebarCollapsed) setTemporarilyExpanded(true); }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTemporarilyExpanded(false);
      }}
      className={cn(
      "relative z-50 flex h-full flex-col border-r border-slate-800 bg-legal-rail shadow-[4px_0_24px_rgba(0,0,0,0.2)] transition-all duration-300",
      isMobile ? "w-72 max-w-[86vw]" : visuallyCollapsed ? "w-[72px]" : "w-[260px]"
    )}
    >
      <div className={cn(
        "absolute inset-0 bg-gradient-to-b pointer-events-none opacity-20",
        useCaseStore.getState().activeModule === 'engineering' ? "from-blue-500/20 via-transparent to-transparent" :
        useCaseStore.getState().activeModule === 'fiscal' ? "from-emerald-500/20 via-transparent to-transparent" :
        "from-slate-500/20 via-transparent to-transparent"
      )} />

      <div className="p-4 border-b border-slate-800 h-[72px] flex items-center justify-between relative z-10">
        <button
          type="button"
          className="flex min-w-0 items-center gap-3 overflow-hidden text-left"
          onClick={() => handleNavigate('/instructivo')}
          aria-label="Ir a Inicio"
        >
          <div className="w-8 h-8 flex items-center justify-center shrink-0 transition-transform hover:scale-105">
            {logoError ? (
              <Landmark size={24} className="text-legal-gold" />
            ) : (
              <img 
                src={logoUrl} 
                alt={BRAND_CONTENT.logo.alt}
                className="w-full h-full object-contain brightness-200"
                onError={() => setLogoError(true)}
              />
            )}
          </div>
          {!visuallyCollapsed && (
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-white tracking-[0.02em] truncate">{BRAND_CONTENT.name}</h1>
              <p className="mt-1 truncate text-xs font-bold uppercase tracking-wider text-slate-500">Estación privada</p>
            </div>
          )}
        </button>
        
        {isMobile && (
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {!isMobile && (
        <button 
          type="button"
          onClick={() => {
            setSidebarCollapsed(!sidebarCollapsed);
            setTemporarilyExpanded(false);
          }}
          className="absolute -right-3 top-8 w-6 h-6 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center border border-slate-700 shadow-md transition-all z-50 cursor-pointer hover:scale-110"
          title={sidebarCollapsed ? "Mantener menú abierto" : "Contraer a riel"}
          aria-label={sidebarCollapsed ? "Mantener menú abierto" : "Contraer a riel"}
        >
          {sidebarCollapsed ? <ChevronRight size={12} className="ml-0.5" /> : <ChevronLeft size={12} className="mr-0.5" />}
        </button>
      )}

      <div className={cn("px-3 py-2 space-y-4 flex-1 overflow-y-auto scrollbar-hide", visuallyCollapsed && "px-1")}>
        {!visuallyCollapsed && (
          <div className="px-3 pb-2 pt-1">
            <div className="h-px bg-gradient-to-r from-slate-800 via-slate-800/50 to-transparent" />
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Flujo de trabajo</p>
          </div>
        )}
        <nav className="space-y-1 relative">
          {!visuallyCollapsed && <div className="absolute left-[21px] top-4 bottom-4 w-px bg-slate-800/50" />}
          {ecosystemItems.map((item) => {
            const isActive = currentPath === item.path;
            const capability = item.path === '/portafolio'
              ? runtimeHealth?.capabilities.vault
              : item.path === '/buscador'
                ? runtimeHealth?.capabilities.legalSearch
                : item.path === '/ingenieria-juridica'
                  ? runtimeHealth?.capabilities.legalGeneration
                  : null;
            const availabilityBadge = capability && !capability.ready ? null : item.badge;
            return (
              <div key={item.path} className="py-1">
                <button
                  type="button"
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-300 relative group overflow-hidden cursor-pointer",
                    isActive
                      ? 'bg-slate-900 text-white border border-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent',
                    visuallyCollapsed && "justify-center px-0 gap-0"
                  )}
                  title={capability && !capability.ready ? `${item.label}: ${capability.detail}` : visuallyCollapsed ? item.label : undefined}
                >
                  {isActive && <div className={cn("absolute left-0 top-2 bottom-2 w-1 rounded-r-full shadow-none", item.dot)} />}
                  <span className={cn(isActive ? item.activeColor : "text-slate-400 group-hover:text-slate-600", visuallyCollapsed && "mx-auto")}>
                    {item.icon}
                  </span>
                  
                  {!visuallyCollapsed && (
                    <span className="flex-1 text-left min-w-0 truncate flex items-center justify-between">
                      <span>{item.label}</span>
                      {availabilityBadge && (
                        <span className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider transition-all duration-300",
                          availabilityBadge === 'Seleccionado'
                            ? "bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.15)]" 
                            : "bg-slate-900/60 text-slate-500 border border-slate-800/80"
                        )}>
                          {availabilityBadge === 'Pendiente' ? null : availabilityBadge}
                        </span>
                      )}
                    </span>
                  )}
                </button>

                {item.subItems && isActive && !visuallyCollapsed && (
                  <div className="mx-2 mb-2 mt-1 space-y-0.5 border-l border-emerald-500/25 pl-2">
                    {item.subItems.map((sub) => (
                      <button
                        type="button"
                        key={sub.tab}
                        onClick={() => {
                          setActiveTab(sub.tab);
                          if (isMobile) setSidebarOpen(false);
                          else setTemporarilyExpanded(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 min-w-0 group/sub cursor-pointer",
                          activeTab === sub.tab
                            ? `text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 shadow-sm`
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
                        )}
                      >
                        <span className={cn(
                          "flex-shrink-0 transition-transform duration-200",
                          activeTab === sub.tab ? "scale-110" : "group-hover/sub:scale-110"
                        )}>{sub.icon}</span>
                        <span className="truncate">{sub.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-3 border-t border-slate-800 space-y-3 relative z-10">
        <div className="space-y-2">
          {!visuallyCollapsed ? (
            <div className="flex items-center gap-2">
              <button type="button" className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-800/50" onClick={() => handleNavigate('/settings')}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 shadow-sm">
                  LC
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-slate-300 truncate group-hover:text-white transition-colors">
                    Estación local
                  </p>
                  <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Configuración
                  </p>
                </div>
              </button>
              <button type="button" onClick={handleReturnToCover} className="rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-800 hover:text-white" aria-label="Volver a la portada" title="Volver a la portada">
                <House size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 shadow-sm hover:bg-slate-800" onClick={() => handleNavigate('/settings')} title="Configuración" aria-label="Abrir configuración">
                LC
              </button>
              <button type="button" onClick={handleReturnToCover} className="rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-800 hover:text-white" title="Volver a la portada" aria-label="Volver a la portada">
                <House size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
