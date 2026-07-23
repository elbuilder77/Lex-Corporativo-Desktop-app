import React from 'react';
import { AlertTriangle, House } from 'lucide-react';

interface StationSettingsPanelProps {
  imageUrl: string;
  onReturnToCover: () => void;
}

export const StationSettingsPanel: React.FC<StationSettingsPanelProps> = ({ imageUrl, onReturnToCover }) => (
  <div className="space-y-8">
    <div>
      <h2 className="mb-6 text-lg font-bold text-slate-900">Esta estación</h2>
      <div className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <img src={imageUrl} alt="Marca Lex Corporativo" className="h-20 w-20 rounded-2xl border-2 border-white object-cover shadow-md" />
        <div>
          <p className="text-lg font-bold text-slate-900">Estación local Lex Corporativo</p>
          <span className="mt-2 inline-flex rounded border border-legal-gold/20 bg-legal-gold/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-legal-golddark">Sin cuenta en la nube</span>
        </div>
      </div>
    </div>
    <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
      <AlertTriangle size={18} className="shrink-0 text-amber-500" />
      <p className="text-xs font-medium leading-relaxed text-amber-800">Esta instalación funciona como una estación local. No requiere cuenta en línea para operar portafolios, consultas o documentos.</p>
    </div>
    <div className="border-t border-slate-100 pt-6">
      <button type="button" onClick={onReturnToCover} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-100">
        <House size={17} /> Volver a la portada
      </button>
    </div>
  </div>
);
