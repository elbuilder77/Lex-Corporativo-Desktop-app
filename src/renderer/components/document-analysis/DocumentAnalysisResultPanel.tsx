import React from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Scale,
} from 'lucide-react';
import type { DocumentAnalysisResult } from '../../types';
import { cn } from '../../lib/utils';

interface DocumentAnalysisResultPanelProps {
  result: DocumentAnalysisResult;
  reportTitle: string;
  expandedRisks: Record<number, boolean>;
  zoomLevel: number;
  isExportingPdf: boolean;
  onToggleRisk: (index: number) => void;
  onZoomChange: (zoom: number) => void;
  onExport: () => void;
}

export const DocumentAnalysisResultPanel: React.FC<DocumentAnalysisResultPanelProps> = ({
  result,
  reportTitle,
  expandedRisks,
  zoomLevel,
  isExportingPdf,
  onToggleRisk,
  onZoomChange,
  onExport,
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] animate-in fade-in slide-in-from-bottom-8 duration-700">
    <div className="relative flex items-start justify-between overflow-hidden bg-slate-900 p-8 text-white">
      <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-legal-gold opacity-10 blur-3xl" />

      <div className="relative z-10 flex w-full items-start justify-between gap-6">
        <div>
          <h3 className="mb-2 font-serif text-2xl font-bold text-white">{reportTitle}</h3>
          <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-legal-gold/70">
            <span className="rounded-md bg-white/10 px-2 py-1">Tipo: {result.documentType || 'Jurídico'}</span>
            <span className="rounded-md bg-white/10 px-2 py-1">Confianza: {result.confidence}</span>
            <span className="rounded-md bg-white/10 px-2 py-1">Motor: {result.engine}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(0.8, zoomLevel - 0.1))}
            className="flex h-8 w-8 items-center justify-center rounded-md font-serif text-base italic text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Reducir texto"
          >
            A-
          </button>
          <div className="mx-1 h-4 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(1.5, zoomLevel + 0.1))}
            className="flex h-8 w-8 items-center justify-center rounded-md font-serif text-xl italic text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Aumentar texto"
          >
            A+
          </button>
        </div>
      </div>

      <div className="relative z-10 ml-6 flex shrink-0 flex-col items-end">
        <span className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-300">Índice de revisión</span>
        <div
          className={cn(
            'text-4xl font-black tracking-tighter',
            result.riskScore > 70 ? 'text-red-300' : result.riskScore > 40 ? 'text-amber-300' : 'text-emerald-300',
          )}
        >
          {result.riskScore}<span className="text-xl opacity-50">/100</span>
        </div>
      </div>
    </div>

    <div className="origin-top space-y-8 p-5 md:space-y-10 md:p-8" style={{ zoom: zoomLevel }}>
      <section>
        <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
          <FileText size={14} /> Resumen Ejecutivo
        </h4>
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-base font-medium leading-relaxed text-slate-700">
          {result.summary || 'Sin resumen disponible.'}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Partes Identificadas</h4>
          <ul className="space-y-2">
            {result.detectedParties?.length
              ? result.detectedParties.map((party, index) => (
                  <li key={index} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{party}</li>
                ))
              : <li className="text-sm italic text-slate-500">No detectadas</li>}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Obligaciones Clave</h4>
          <ul className="space-y-2">
            {result.detectedObligations?.length
              ? result.detectedObligations.map((obligation, index) => (
                  <li key={index} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{obligation}</li>
                ))
              : <li className="text-sm italic text-slate-500">No detectadas</li>}
          </ul>
        </div>
      </section>

      {((result.missingData?.length || 0) > 0 || (result.checklist?.length || 0) > 0) && (
        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {(result.missingData?.length || 0) > 0 && (
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Datos Faltantes</h4>
              <ul className="space-y-2">
                {result.missingData?.map((item, index) => (
                  <li key={index} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{item}</li>
                ))}
              </ul>
            </div>
          )}
          {(result.checklist?.length || 0) > 0 && (
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Checklist</h4>
              <ul className="space-y-2">
                {result.checklist?.map((item, index) => (
                  <li key={index} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section>
        <h4 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
          <AlertTriangle size={14} /> Hallazgos y Contingencias ({result.risks?.length || 0})
        </h4>
        {result.risks?.length > 0 ? (
          <div className="space-y-4">
            {result.risks.map((risk, index) => (
              <div key={index} className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => onToggleRisk(index)}
                  className="flex w-full items-center justify-between bg-slate-50 p-5 transition-colors hover:bg-slate-100"
                  aria-expanded={Boolean(expandedRisks[index])}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn('h-2 w-2 rounded-full', risk.severity === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : risk.severity === 'medium' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]')} />
                    <span className="text-base font-bold text-slate-900">{risk.title}</span>
                  </div>
                  {expandedRisks[index] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>

                {expandedRisks[index] && (
                  <div className="space-y-6 border-t border-slate-200 bg-white p-6">
                    <p className="text-base leading-relaxed text-slate-700">{risk.explanation}</p>
                    {risk.relatedClauses?.length > 0 && (
                      <div>
                        <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Cláusulas del Documento:</span>
                        <div className="flex flex-wrap gap-2">
                          {risk.relatedClauses.map((clause, clauseIndex) => (
                            <span key={clauseIndex} className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">{clause}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {risk.legalFoundations?.length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                        <span className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500"><Scale size={12} className="text-legal-gold" /> Fundamentos Recuperados (Corpus Local)</span>
                        <ul className="space-y-4">
                          {risk.legalFoundations.map((foundation, foundationIndex) => (
                            <li key={foundationIndex} className="text-sm leading-relaxed text-slate-700">
                              <strong className="text-slate-900">{foundation.title || foundation.law} {foundation.article ? `Art. ${foundation.article}` : ''}:</strong>{' '}
                              <span className="opacity-80">{foundation.excerpt}</span>
                              {foundation.relevanceScore && <span className="mt-1 block text-xs font-bold uppercase tracking-widest text-slate-500">Confianza Semántica: {(foundation.relevanceScore * 100).toFixed(0)}%</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center"><p className="text-base font-medium text-slate-500">No se identificaron contingencias críticas.</p></div>
        )}
      </section>

      <section>
        <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500"><CheckCircle size={14} /> Acciones Recomendadas</h4>
        {result.recommendedActions?.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {result.recommendedActions.map((action, index) => (
              <li key={index} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 shadow-sm">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100"><Check size={12} className="text-emerald-600" /></div>
                <span className="font-medium leading-relaxed">{action}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-slate-500">No hay acciones correctivas requeridas.</p>
        )}
      </section>
    </div>

    <div className="flex justify-end border-t border-slate-200 bg-white p-5">
      <button
        type="button"
        onClick={onExport}
        disabled={isExportingPdf}
        className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-slate-800 active:scale-95 disabled:cursor-wait disabled:opacity-60"
      >
        <ArrowDownToLine size={14} /> {isExportingPdf ? 'Preparando PDF...' : 'Exportar PDF'}
      </button>
    </div>
  </div>
);
