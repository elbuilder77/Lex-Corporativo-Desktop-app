import React, { useRef, useState } from 'react';
import { FileText, FileUp, Loader2, ShieldCheck, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { ensureModuleActivity } from '../lib/case-access';
import { runFiscalAnalysis } from '../lib/fiscal-analysis';
import { generateAnalysisPDF } from '../lib/pdf-generator';
import { useCaseStore } from '../store/useCaseStore';
import { useUiStore } from '../store/useUiStore';
import type { DocumentAnalysisResult } from '../types';
import { FiscalAnalysisResultPanel } from './FiscalAnalysisResultPanel';

const PREPARATION_INSTRUCTION = `Evalúa integralmente la preparación fiscal de la operación. Revisa materialidad, CFDI, contraprestación, pagos, entregables, razón de negocios, deducibilidad, IVA acreditable y posible exposición al artículo 69-B del CFF. Separa evidencia disponible, evidencia pendiente y siguientes acciones. No inventes hechos ni fundamentos.`;

const ACCEPTED_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];

export const FiscalPreparation: React.FC = () => {
  const { notify, setActiveTab } = useUiStore();
  const { currentCaseId, setCurrentCaseId, addFiscalAnalysis, fiscalOperationState, updateFiscalOperationState, completeFiscalOperationStep } = useCaseStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState(fiscalOperationState.description || '');
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const addFiles = (selected: File[]) => {
    const accepted = selected.filter((file) => {
      const mime = file.name.toLowerCase().endsWith('.md') ? 'text/markdown' : file.type;
      return ACCEPTED_TYPES.includes(mime) && file.size <= 15 * 1024 * 1024;
    });
    if (accepted.length !== selected.length) {
      notify('Sólo se admiten PDF, TXT o Markdown de hasta 15 MB.', 'warning', 'Evidencia no compatible');
    }
    setFiles((current) => [...current, ...accepted].slice(0, 5));
  };

  const analyze = async () => {
    if (!description.trim()) {
      notify('Describe la operación que quieres preparar.', 'warning', 'Falta contexto');
      return;
    }
    setIsAnalyzing(true);
    setResult(null);
    setProgress('Preparando expediente local…');

    try {
      const caseId = await ensureModuleActivity('fiscal', currentCaseId);
      setCurrentCaseId(caseId);
      const operationTitle = description.trim().replace(/\s+/g, ' ').slice(0, 72);
      updateFiscalOperationState({
        title: operationTitle || 'Operación fiscal',
        description: description.trim(),
        evidenceFiles: files.map((file) => ({ name: file.name, type: file.type })),
      });
      window.lexDesktop.analysis.onProgress((state) => setProgress(state.label));
      const response = await runFiscalAnalysis({
        caseId,
        context: description,
        instruction: PREPARATION_INSTRUCTION,
        files,
        syntheticFileName: 'Descripcion_Operacion_Fiscal.txt',
      });
      setResult(response.result);
      addFiscalAnalysis({
        id: response.requestId,
        requestId: response.requestId,
        timestamp: new Date().toISOString(),
        files: files.map((file) => ({ name: file.name, type: file.type })),
        result: response.result,
        module: 'fiscal',
        ecosystem: 'fiscal',
        promptProfile: response.promptProfile,
        currentDocumentOnly: true,
        customInstruction: description,
        executionMode: response.requestedExecutionMode,
        engine: response.engine,
      });
      completeFiscalOperationStep('preparation');
      notify('Estado preventivo generado y guardado en el portafolio local.', 'success', 'Preparación fiscal');
    } catch (error: any) {
      notify(error?.message || 'No se pudo revisar la operación.', 'error', 'Preparación fiscal');
    } finally {
      setIsAnalyzing(false);
      setProgress('');
    }
  };

  const reset = () => {
    setDescription(fiscalOperationState.description || '');
    setFiles([]);
    setResult(null);
  };

  const exportResult = async () => {
    if (!result) return;
    setIsExporting(true);
    try {
      await generateAnalysisPDF({
        title: 'Estado Preventivo Fiscal',
        subtitle: 'Preparación fiscal de operación',
        riskScore: result.riskScore,
        summary: result.summary,
        pillars: [
          { title: 'PARTES', content: result.detectedParties?.join('\n') || 'Sin partes identificadas.' },
          { title: 'OBLIGACIONES', content: result.detectedObligations?.join('\n') || 'Sin obligaciones identificadas.' },
          { title: 'EVIDENCIA PENDIENTE', content: [...(result.missingClauses || []), ...(result.missingData || [])].join('\n') || 'Sin pendientes registrados.' },
        ],
        risks: result.risks?.map((risk) => `${risk.title}: ${risk.explanation}`) || [],
        recommendation: result.recommendedActions?.join('\n') || 'Revisión profesional recomendada.',
        moduleName: 'Lex Corporativo · Fiscal',
        filenamePrefix: 'Estado_Preventivo_Fiscal',
      });
      notify('Estado preventivo exportado en PDF.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo exportar el PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50/60 px-5 py-5 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        {!result ? (
          <>
            <header className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-fiscal/10 text-fiscal">
                <ShieldCheck size={24} strokeWidth={1.8} />
              </div>
              <div><h2 className="text-2xl font-bold text-slate-950">Preparación fiscal de operación</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">Describe el asunto e integra la evidencia inicial para abrir un expediente continuo.</p></div>
            </header>

            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <label htmlFor="fiscal-operation" className="text-base font-bold text-slate-900">Describe la operación</label>
              <textarea
                id="fiscal-operation"
                value={description}
                onChange={(event) => { setDescription(event.target.value); updateFiscalOperationState({ description: event.target.value }); }}
                rows={3}
                disabled={isAnalyzing}
                placeholder="Ej: Pago de 500,000 MXN a un proveedor de servicios de marketing. Tenemos CFDI y transferencia bancaria, pero no existe contrato formal…"
                className="mt-4 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-800 outline-none transition focus:border-fiscal/50 focus:ring-4 focus:ring-fiscal/10"
              />

              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5">
                <input ref={inputRef} type="file" multiple accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" className="hidden" onChange={(event) => { addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-slate-900">Evidencia opcional</p>
                    <p className="mt-1 text-sm text-slate-500">Contratos, CFDI, pagos o entregables en PDF, TXT o Markdown. Máximo 5 archivos.</p>
                  </div>
                  <button type="button" onClick={() => inputRef.current?.click()} disabled={isAnalyzing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-fiscal/40 hover:text-fiscal disabled:opacity-50">
                    <FileUp size={18} /> Adjuntar
                  </button>
                </div>
                {files.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {files.map((file) => (
                      <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-2 rounded-full border border-fiscal/20 bg-white px-3 py-1.5 text-xs font-semibold text-fiscal">
                        <FileText size={13} /> {file.name}
                        <button type="button" onClick={() => setFiles((current) => current.filter((item) => item !== file))} aria-label={`Quitar ${file.name}`} className="rounded-full p-0.5 hover:bg-fiscal/10"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {isAnalyzing && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-fiscal/15 bg-fiscal/5 px-4 py-3 text-sm font-semibold text-fiscal">
                  <Loader2 size={17} className="animate-spin" /> {progress || 'Analizando expediente…'}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => void analyze()} disabled={isAnalyzing || !description.trim()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-fiscal px-6 text-sm font-bold text-white transition hover:bg-fiscal-light disabled:cursor-not-allowed disabled:opacity-40">
                  {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  {isAnalyzing ? 'Revisando operación' : 'Revisar preparación'}
                </button>
              </div>
            </motion.section>
          </>
        ) : (
          <FiscalAnalysisResultPanel title="Estado preventivo de la operación" result={result} onReset={reset} onExport={() => void exportResult()} exporting={isExporting} onContinue={() => setActiveTab('fiscal-materiality')} continueLabel="Continuar a materialidad" />
        )}
      </div>
    </div>
  );
};

export default FiscalPreparation;
