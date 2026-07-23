import React from 'react';
import { X } from 'lucide-react';
import type { AnalyzedDocumentHistory } from '../../types';
import { cn } from '../../lib/utils';

interface DocumentAnalysisHistoryPanelProps {
  open: boolean;
  history: AnalyzedDocumentHistory[];
  onClose: () => void;
  onSelect: (item: AnalyzedDocumentHistory) => void;
}

export const DocumentAnalysisHistoryPanel: React.FC<DocumentAnalysisHistoryPanelProps> = ({ open, history, onClose, onSelect }) => (
  <>
    {open && (
      <button
        type="button"
        className="fixed inset-0 z-20 bg-slate-900/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar historial"
      />
    )}
    <aside
      aria-label="Historial de dictámenes"
      aria-hidden={!open}
      className={cn('fixed right-0 top-0 z-30 h-full w-[min(22rem,92vw)] transform border-l border-slate-200 bg-white/95 pt-[72px] shadow-[0_0_40px_rgba(0,0,0,0.1)] backdrop-blur-xl transition-transform duration-300', open ? 'translate-x-0' : 'translate-x-full')}
    >
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Dictámenes Previos</h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-500 transition-colors hover:text-slate-900" aria-label="Cerrar historial"><X size={16} /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto scrollbar-hide">
          {history.length === 0 ? (
            <div className="mt-10 text-center text-sm text-slate-500">No hay historial en este portafolio.</div>
          ) : (
            history.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelect(item)}
                className="group w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-all duration-300 hover:bg-slate-100 hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">{new Date(item.timestamp).toLocaleDateString()}</span>
                  <span className={cn('rounded px-1.5 py-0.5 text-xs font-black uppercase', item.result.riskScore > 70 ? 'border border-red-200 bg-red-50 text-red-600' : 'border border-emerald-200 bg-emerald-50 text-emerald-600')}>{item.result.riskScore} RSK</span>
                </div>
                <p className="mb-1 truncate text-sm font-bold text-slate-900">{item.files.map((file) => file.name).join(', ')}</p>
                <p className="line-clamp-2 text-xs leading-relaxed text-slate-600 group-hover:text-slate-700">{item.result.summary}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </aside>
  </>
);
