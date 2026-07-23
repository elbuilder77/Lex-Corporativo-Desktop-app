import React from 'react';
import { DatabaseBackup, FileText, KeyRound, Settings, Shield, User } from 'lucide-react';

export type SettingsTab = 'profile' | 'preferences' | 'ia' | 'trazabilidad' | 'data' | 'legal';

export const SETTINGS_TABS: ReadonlyArray<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
  { id: 'profile', label: 'Estación', icon: <User size={16} /> },
  { id: 'preferences', label: 'Preferencias', icon: <Settings size={16} /> },
  { id: 'ia', label: 'IA y API', icon: <KeyRound size={16} /> },
  { id: 'trazabilidad', label: 'Trazabilidad y Logs', icon: <Shield size={16} /> },
  { id: 'data', label: 'Datos locales', icon: <DatabaseBackup size={16} /> },
  { id: 'legal', label: 'Legal y Privacidad', icon: <FileText size={16} /> },
];

interface SettingsNavigationProps {
  activeTab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
}

export const SettingsNavigation: React.FC<SettingsNavigationProps> = ({ activeTab, onSelect }) => (
  <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-1" aria-label="Secciones de configuración">
    {SETTINGS_TABS.map((tab) => (
      <button
        type="button"
        key={tab.id}
        onClick={() => onSelect(tab.id)}
        className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all sm:text-sm ${
          activeTab === tab.id
            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
            : 'border border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900'
        }`}
        aria-current={activeTab === tab.id ? 'page' : undefined}
      >
        {tab.icon}
        <span className="truncate">{tab.label}</span>
      </button>
    ))}
  </nav>
);
