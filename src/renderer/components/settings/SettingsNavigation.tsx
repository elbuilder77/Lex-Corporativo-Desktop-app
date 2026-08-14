import React from 'react';
import { Bot, DatabaseBackup, FileText, Shield } from 'lucide-react';

export type SettingsTab = 'ia' | 'data' | 'security' | 'legal';

export const SETTINGS_TABS: ReadonlyArray<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
  { id: 'ia', label: 'Inteligencia Artificial (IA)', icon: <Bot size={16} /> },
  { id: 'data', label: 'Datos y Bóveda Local', icon: <DatabaseBackup size={16} /> },
  { id: 'security', label: 'Seguridad y Trazabilidad', icon: <Shield size={16} /> },
  { id: 'legal', label: 'Acerca de y Legal', icon: <FileText size={16} /> },
];

interface SettingsNavigationProps {
  activeTab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
}

export const SettingsNavigation: React.FC<SettingsNavigationProps> = ({ activeTab, onSelect }) => (
  <nav className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-1" aria-label="Secciones de configuración">
    {SETTINGS_TABS.map((tab) => (
      <button
        type="button"
        key={tab.id}
        onClick={() => onSelect(tab.id)}
        className={`flex min-w-0 items-center gap-2.5 rounded-xl px-3.5 py-3 text-left text-xs font-bold transition-all ${
          activeTab === tab.id
            ? 'bg-slate-950 text-white shadow-xs'
            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950'
        }`}
        aria-current={activeTab === tab.id ? 'page' : undefined}
      >
        <span className="shrink-0">{tab.icon}</span>
        <span className="truncate">{tab.label}</span>
      </button>
    ))}
  </nav>
);
