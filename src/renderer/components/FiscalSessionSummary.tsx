import React from 'react';
import { ArrowRight, CheckCircle2, FileText, ReceiptText } from 'lucide-react';
import type { ModuleTab } from '../types';
import { summarizeFiscalEvidence } from '../lib/fiscal-evidence';
import { useCaseStore } from '../store/useCaseStore';
import { FiscalSaveButton } from './FiscalSaveButton';

interface FiscalSessionSummaryProps {
  onContinue: (tab: ModuleTab) => void;
}

export const FiscalSessionSummary: React.FC<FiscalSessionSummaryProps> = ({ onContinue }) => {
  const {
    fiscalAnalysisHistory,
    fiscalChatHistory,
    fiscalDraftingHistory,
    fiscalOperationState,
  } = useCaseStore();
  const hasSession = Boolean(
    fiscalOperationState.description
    || fiscalOperationState.evidenceFiles.length
    || fiscalOperationState.evidenceMatrix.length
    || fiscalAnalysisHistory.length
    || fiscalChatHistory.length
    || fiscalDraftingHistory.length,
  );
  if (!hasSession) return null;

  const summary = summarizeFiscalEvidence(
    fiscalOperationState.evidenceMatrix,
    fiscalOperationState.resolvedEvidenceIds,
  );
  const nextTab = fiscalOperationState.lastActiveTab || 'fiscal-preparation';
  const pending = summary.attention + summary.missing;

  return (
    <section className="mb-4 flex flex-col gap-4 rounded-2xl border border-fiscal/20 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-fiscal">Sesión actual</p>
        <h2 className="mt-1 truncate text-base font-bold text-slate-950">{fiscalOperationState.title || 'Trabajo fiscal'}</h2>
        {fiscalOperationState.description && <p className="mt-1 line-clamp-1 text-xs text-slate-500">{fiscalOperationState.description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2"><FileText size={13} /> {fiscalOperationState.evidenceFiles.length} archivos</span>
        {fiscalOperationState.cfdiRecords.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2"><ReceiptText size={13} /> {fiscalOperationState.cfdiRecords.length} CFDI</span>}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-2 text-amber-800">{pending} pendientes</span>
        {summary.resolved > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-emerald-800"><CheckCircle2 size={13} /> {summary.resolved} atendidos</span>}
      </div>
      <div className="flex shrink-0 gap-2">
        <FiscalSaveButton name={fiscalOperationState.title || 'Trabajo fiscal'} />
        <button type="button" onClick={() => onContinue(nextTab)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">
          Continuar <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
};

export default FiscalSessionSummary;
