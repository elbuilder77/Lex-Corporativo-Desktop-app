import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileQuestion,
  RotateCcw,
  Scale,
} from 'lucide-react';
import type { DocumentAnalysisResult } from '../types';

interface FiscalAnalysisResultPanelProps {
  title: string;
  result: DocumentAnalysisResult;
  onReset: () => void;
  onExport?: () => void;
  exporting?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
}

const list = (value?: string[]) => Array.isArray(value) ? value.filter(Boolean) : [];

const ListCard: React.FC<{
  title: string;
  items: string[];
  tone: 'slate' | 'amber' | 'emerald' | 'blue';
  icon: React.ReactNode;
}> = ({ title, items, tone, icon }) => {
  if (!items.length) return null;
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
  };
  return (
    <section className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold">{icon}{title}</h4>
      <ul className="space-y-2 text-sm leading-6">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export const FiscalAnalysisResultPanel: React.FC<FiscalAnalysisResultPanelProps> = ({
  title,
  result,
  onReset,
  onExport,
  exporting = false,
  onContinue,
  continueLabel = 'Continuar expediente',
}) => {
  const normalizedRisk = Math.max(0, Math.min(100, Number(result.riskScore) || 0));
  const preparation = 100 - normalizedRisk;
  const missing = [...list(result.missingClauses), ...list(result.missingData)];
  const risks = list(result.risks?.map((risk) => `${risk.title}: ${risk.explanation}`));
  const foundations = list(result.legalFoundations?.map((foundation) => (
    `${foundation.law || foundation.title}${foundation.article ? ` · ${foundation.article}` : ''}`
  )));

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onReset} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:border-fiscal/30 hover:text-fiscal">
          <RotateCcw size={16} /> Nueva revisión
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
        <header className="flex flex-col gap-5 border-b border-slate-100 pb-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-fiscal-light">Resultado preventivo</p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-slate-950">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{result.summary}</p>
          </div>
          <div className="min-w-36 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <span className="block text-xs font-bold uppercase tracking-wider text-emerald-700">Preparación</span>
            <strong className="mt-1 block text-4xl font-black text-fiscal">{preparation}</strong>
            <span className="text-xs text-emerald-800">de 100</span>
          </div>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ListCard title="Hallazgos y riesgos" items={risks} tone="slate" icon={<AlertTriangle size={17} />} />
          <ListCard title="Información o evidencia pendiente" items={missing} tone="amber" icon={<FileQuestion size={17} />} />
          <ListCard title="Siguientes acciones" items={list(result.recommendedActions)} tone="emerald" icon={<CheckCircle2 size={17} />} />
          <ListCard title="Fundamentos recuperados" items={foundations} tone="blue" icon={<Scale size={17} />} />
        </div>

        {result.riskCategories && Object.values(result.riskCategories).some((items) => items?.length) && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <h4 className="text-sm font-bold text-slate-900">Pilares de revisión fiscal</h4>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Object.entries(result.riskCategories).map(([category, items]) => items?.length ? (
                <div key={category}>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{category.replace(/([A-Z])/g, ' $1')}</span>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{items.join(' · ')}</p>
                </div>
              ) : null)}
            </div>
          </section>
        )}
      </article>
    </div>
  );
};

export default FiscalAnalysisResultPanel;
