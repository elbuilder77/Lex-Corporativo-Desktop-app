import React from 'react';
import { AlertTriangle, Check, CheckCircle2, ChevronDown, FileQuestion, RotateCcw } from 'lucide-react';
import type { FiscalEvidenceRecord } from '../types';
import { summarizeFiscalEvidence } from '../lib/fiscal-evidence';
import { cn } from '../lib/utils';

interface FiscalEvidenceMatrixProps {
  items: FiscalEvidenceRecord[];
  resolvedIds?: string[];
  onToggleResolved?: (evidenceId: string) => void;
}

const statusConfig = {
  supported: {
    label: 'Disponible',
    icon: CheckCircle2,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  attention: {
    label: 'Requiere atención',
    icon: AlertTriangle,
    tone: 'border-orange-200 bg-orange-50 text-orange-900',
  },
  missing: {
    label: 'Falta documentación',
    icon: FileQuestion,
    tone: 'border-amber-200 bg-amber-50 text-amber-900',
  },
} as const;

export const FiscalEvidenceMatrix: React.FC<FiscalEvidenceMatrixProps> = ({
  items,
  resolvedIds = [],
  onToggleResolved,
}) => {
  if (!items.length) return null;
  const resolved = new Set(resolvedIds);
  const summary = summarizeFiscalEvidence(items, resolvedIds);

  return (
    <details className="group mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm font-bold text-slate-900 marker:content-none">
        <span className="flex-1">Detalle de la revisión</span>
        <span className="text-xs font-semibold text-slate-500">
          {summary.attention + summary.missing} pendientes{summary.resolved ? ` · ${summary.resolved} atendidos` : ''}
        </span>
        <ChevronDown size={17} className="text-slate-400 transition group-open:rotate-180" />
      </summary>

      <div className="divide-y divide-slate-100 border-t border-slate-200">
        {items.map((item) => {
          const isResolved = item.status !== 'supported' && resolved.has(item.id);
          const config = statusConfig[item.status];
          const Icon = isResolved ? Check : config.icon;
          return (
            <article key={item.id} className={cn('px-5 py-4', isResolved && 'bg-slate-50/80')}>
              <div className="flex items-start gap-3">
                <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', isResolved ? 'border-slate-200 bg-white text-slate-500' : config.tone)}>
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h5 className={cn('text-sm font-bold text-slate-900', isResolved && 'text-slate-500 line-through')}>{item.title}</h5>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-bold', isResolved ? 'border-slate-200 bg-white text-slate-500' : config.tone)}>
                      {isResolved ? 'Atendido' : config.label}
                    </span>
                  </div>
                  {item.detail && <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>}
                  {(item.sourceFiles.length > 0 || item.foundations.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {item.sourceFiles.length > 0 && <span>Archivos considerados: {item.sourceFiles.join(', ')}</span>}
                      {item.foundations.length > 0 && <span>Referencia: {item.foundations.join(' · ')}</span>}
                    </div>
                  )}
                  {item.action && !isResolved && <p className="mt-2 text-xs font-semibold text-slate-700">Siguiente acción: {item.action}</p>}
                </div>
                {onToggleResolved && item.status !== 'supported' && (
                  <button
                    type="button"
                    onClick={() => onToggleResolved(item.id)}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    aria-label={isResolved ? `Reabrir ${item.title}` : `Marcar como atendido ${item.title}`}
                  >
                    {isResolved ? <RotateCcw size={13} /> : <Check size={14} />}
                    {isResolved ? 'Reabrir' : 'Atendido'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </details>
  );
};

export default FiscalEvidenceMatrix;
