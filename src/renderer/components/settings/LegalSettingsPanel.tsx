import React from 'react';
import { ChevronRight, FileText, HelpCircle, Shield } from 'lucide-react';

interface LegalSettingsPanelProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export const LegalSettingsPanel: React.FC<LegalSettingsPanelProps> = ({ onOpenTerms, onOpenPrivacy }) => (
  <div className="space-y-8">
    <h2 className="mb-6 text-lg font-bold text-slate-900">Legal y Transparencia</h2>
    <div className="grid grid-cols-1 gap-3">
      <button type="button" onClick={onOpenTerms} className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 p-5 text-left transition-all hover:border-legal-gold/30 hover:bg-slate-50">
        <div className="flex items-center gap-4"><div className="rounded-lg bg-slate-50 p-2 transition-colors group-hover:bg-white"><FileText size={18} className="text-slate-400 group-hover:text-legal-gold" /></div><span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Términos y Condiciones</span></div><ChevronRight size={16} className="text-slate-300 transition-all group-hover:translate-x-1" />
      </button>
      <button type="button" onClick={onOpenPrivacy} className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 p-5 text-left transition-all hover:border-legal-gold/30 hover:bg-slate-50">
        <div className="flex items-center gap-4"><div className="rounded-lg bg-slate-50 p-2 transition-colors group-hover:bg-white"><Shield size={18} className="text-slate-400 group-hover:text-legal-gold" /></div><span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">Aviso de Privacidad</span></div><ChevronRight size={16} className="text-slate-300 transition-all group-hover:translate-x-1" />
      </button>
    </div>
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900"><HelpCircle size={16} className="text-legal-gold" /> Protocolo de Inteligencia Jurídica</h3>
      <ul className="space-y-3 text-xs font-medium leading-relaxed text-slate-600">
        <li className="flex gap-2"><span className="text-legal-gold">•</span> Lex Corporativo es un sistema de soporte documental asistido, no constituye asesoría legal vinculante.</li>
        <li className="flex gap-2"><span className="text-legal-gold">•</span> Toda resolución generada por el sistema debe ser validada por un profesional del derecho.</li>
        <li className="flex gap-2"><span className="text-legal-gold">•</span> El corpus, la búsqueda y la bóveda permanecen locales. En funciones generativas, la selección mostrada en IA y API se transmite al proveedor elegido bajo sus políticas.</li>
      </ul>
    </div>
  </div>
);
