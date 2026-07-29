import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileQuestion,
  RotateCcw,
} from 'lucide-react';
import type { DocumentAnalysisResult } from '../types';
import { buildFiscalEvidenceMatrix, summarizeFiscalEvidence } from '../lib/fiscal-evidence';
import { useCaseStore } from '../store/useCaseStore';
import { FiscalEvidenceMatrix } from './FiscalEvidenceMatrix';
import { FiscalSaveButton } from './FiscalSaveButton';

interface FiscalAnalysisResultPanelProps {
  title: string;
  result: DocumentAnalysisResult;
  onReset: () => void;
  onExport?: () => void;
  exporting?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
}

export const FiscalAnalysisResultPanel: React.FC<FiscalAnalysisResultPanelProps> = ({
  title,
  result,
  onReset,
  onExport,
  exporting = false,
  onContinue,
  continueLabel = 'Continuar',
}) => {
  const { fiscalOperationState, toggleFiscalEvidenceResolved } = useCaseStore();
  const evidence = result.evidenceMatrix?.length
    ? result.evidenceMatrix
    : buildFiscalEvidenceMatrix(result);
  const summary = summarizeFiscalEvidence(evidence, fiscalOperationState.resolvedEvidenceIds);
  const noEvidence = evidence.length === 0;
  const nextAction = result.recommendedActions?.find(Boolean) || (noEvidence
    ? 'Revisar el contenido antes de continuar.'
    : summary.missing + summary.attention > 0
    ? 'Revisar los elementos pendientes.'
    : 'Conservar la evidencia disponible.');
  const status = noEvidence
    ? 'Revisión incompleta'
    : summary.missing > 0
    ? 'Falta documentación'
    : summary.attention > 0
      ? 'Requiere atención'
      : 'Sin pendientes identificados';

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap justify-end gap-2">
        <FiscalSaveButton name={result.documentType || title} />
        <button type="button" onClick={onReset} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:border-fiscal/30 hover:text-fiscal">
          <RotateCcw size={16} /> Revisar de nuevo
        </button>
        {onExport && (
          <button type="button" onClick={onExport} disabled={exporting} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-fiscal px-4 text-sm font-semibold text-white hover:bg-fiscal-light disabled:opacity-50">
            <FileCheck2 size={16} /> {exporting ? 'Preparando PDF' : 'Exportar PDF'}
          </button>
        )}
        {onContinue && (
          <button type="button" onClick={onContinue} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">
            {continueLabel} <ArrowRight size={16} />
          </button>
        )}
      </div>

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 md:p-8">
        <header className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-fiscal-light">Resultado</p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-slate-950">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{result.summary}</p>
          </div>
          <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">{status}</span>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de la revisión">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 size={18} />
            <strong className="mt-3 block text-2xl font-black">{summary.supported}</strong>
            <span className="text-xs font-bold">Disponible</span>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-900">
            <AlertTriangle size={18} />
            <strong className="mt-3 block text-2xl font-black">{summary.attention}</strong>
            <span className="text-xs font-bold">Requiere atención</span>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <FileQuestion size={18} />
            <strong className="mt-3 block text-2xl font-black">{summary.missing}</strong>
            <span className="text-xs font-bold">Falta documentación</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Siguiente acción</span>
            <p className="mt-2 line-clamp-3 text-sm font-semibold leading-5">{nextAction}</p>
          </div>
        </section>

        <FiscalEvidenceMatrix
          items={evidence}
          resolvedIds={fiscalOperationState.resolvedEvidenceIds}
          onToggleResolved={toggleFiscalEvidenceResolved}
        />
      </article>
    </div>
  );
};

export default FiscalAnalysisResultPanel;
