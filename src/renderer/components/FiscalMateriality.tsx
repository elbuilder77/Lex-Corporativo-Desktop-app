import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ClipboardList, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ensureModuleActivity } from '../lib/case-access';
import { runFiscalAnalysis } from '../lib/fiscal-analysis';
import { generateAnalysisPDF } from '../lib/pdf-export';
import { useCaseStore } from '../store/useCaseStore';
import { useUiStore } from '../store/useUiStore';
import type { DocumentAnalysisResult } from '../types';
import { FiscalAnalysisResultPanel } from './FiscalAnalysisResultPanel';
import { useProcessingGuard } from '../hooks/useProcessingGuard';

type Question = { id: string; label: string; placeholder?: string; options?: string[] };

const QUESTIONS: Question[] = [
  { id: 'tipo_operacion', label: '¿Qué tipo de operación se realizó?', placeholder: 'Ej: Prestación de servicios, compra de mercancía…' },
  { id: 'proveedor', label: '¿Quién es el proveedor o contraparte?', placeholder: 'Razón social y datos relevantes del proveedor' },
  { id: 'monto', label: '¿Cuál es el monto aproximado de la operación?', placeholder: 'Ej: $500,000 MXN más IVA' },
  { id: 'contrato', label: '¿Existe un contrato firmado que ampare la operación?', options: ['Sí', 'No', 'En proceso'] },
  { id: 'entregables', label: '¿Existen entregables físicos o digitales?', options: ['Sí, completos', 'Parciales', 'No hay entregables'] },
  { id: 'razon_negocios', label: '¿Cuál es la razón de negocios de esta operación?', placeholder: 'Explica la necesidad operativa y el beneficio esperado…' },
];

const MATERIALITY_INSTRUCTION = `Analiza exclusivamente la materialidad y sustancia económica de la operación. Identifica participantes, capacidad del proveedor, ejecución real, entregables, comunicaciones, CFDI, pagos, registros contables y razón de negocios. Clasifica evidencia disponible, evidencia débil y evidencia faltante. Evalúa exposición al artículo 69-B del CFF sin inventar hechos ni fundamentos.`;

export const FiscalMateriality: React.FC = () => {
  const { notify, setActiveTab } = useUiStore();
  const canAnalyze = useProcessingGuard('legalGeneration', 'generar la evaluación de materialidad');
  const { currentCaseId, setCurrentCaseId, addFiscalAnalysis, fiscalOperationState, updateFiscalOperationState, completeFiscalOperationStep } = useCaseStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(fiscalOperationState.materialityAnswers || {});
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const question = QUESTIONS[step];
  const answer = answers[question.id] || '';

  const updateAnswer = (id: string, value: string) => {
    const nextAnswers = { ...answers, [id]: value };
    setAnswers(nextAnswers);
    updateFiscalOperationState({ materialityAnswers: nextAnswers });
  };

  const submit = async () => {
    if (!canAnalyze()) return;
    setIsProcessing(true);
    setProgress('Consolidando respuestas…');
    const context = QUESTIONS.map((item) => `${item.label}\n${answers[item.id] || '[DATO FALTANTE]'}`).join('\n\n');
    try {
      const caseId = await ensureModuleActivity('fiscal', currentCaseId);
      setCurrentCaseId(caseId);
      window.lexDesktop.analysis.onProgress((state) => setProgress(state.label));
      const response = await runFiscalAnalysis({
        caseId,
        context,
        instruction: MATERIALITY_INSTRUCTION,
        syntheticFileName: 'Cuestionario_Materialidad.txt',
      });
      setResult(response.result);
      addFiscalAnalysis({
        id: response.requestId,
        requestId: response.requestId,
        timestamp: new Date().toISOString(),
        files: [],
        result: response.result,
        module: 'fiscal',
        ecosystem: 'fiscal',
        promptProfile: response.promptProfile,
        currentDocumentOnly: true,
        customInstruction: context,
        executionMode: response.requestedExecutionMode,
        engine: response.engine,
      });
      completeFiscalOperationStep('materiality');
      notify('Evaluación de materialidad guardada en el portafolio local.', 'success', 'Materialidad');
    } catch (error: any) {
      notify(error?.message || 'No se pudo evaluar la materialidad.', 'error', 'Materialidad');
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  const next = () => {
    if (!answer.trim()) return;
    if (step < QUESTIONS.length - 1) setStep((current) => current + 1);
    else void submit();
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    updateFiscalOperationState({ materialityAnswers: {} });
    setResult(null);
  };

  const exportResult = async () => {
    if (!result) return;
    setIsExporting(true);
    try {
      await generateAnalysisPDF({
        title: 'Revisión de Materialidad Fiscal',
        subtitle: 'Materialidad, razón de negocios y trazabilidad',
        riskScore: result.riskScore,
        summary: result.summary,
        pillars: [
          { title: 'OPERACIÓN', content: answers.tipo_operacion || '[DATO FALTANTE]' },
          { title: 'CONTRAPARTE', content: answers.proveedor || '[DATO FALTANTE]' },
          { title: 'RAZÓN DE NEGOCIOS', content: answers.razon_negocios || '[DATO FALTANTE]' },
        ],
        risks: result.risks?.map((risk) => `${risk.title}: ${risk.explanation}`) || [],
        recommendation: result.recommendedActions?.join('\n') || 'Completar el expediente probatorio.',
        moduleName: 'Lex Corporativo · Fiscal',
        filenamePrefix: 'Revision_Materialidad_Fiscal',
      });
      notify('Evaluación exportada en PDF.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo exportar el PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50/60 px-5 py-7 md:px-8">
      <div className="mx-auto max-w-5xl space-y-7">
        {!result ? (
          <>
            <header className="flex flex-col gap-4 rounded-2xl border border-fiscal/15 bg-fiscal/5 p-5 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-fiscal shadow-sm">
                <ClipboardList size={24} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1"><h2 className="text-2xl font-bold text-slate-950">Materialidad</h2><p className="mt-1 text-sm text-slate-600">Completa la sustancia económica y trazabilidad de la misma operación.</p></div>
              <div className="flex items-center gap-2 text-xs font-bold text-fiscal"><BookOpen size={16} /> CFF 69-B · CFF 5-A · LISR 27</div>
            </header>

            <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1.5 bg-slate-100"><div className="h-full bg-fiscal transition-all" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} /></div>
              <div className="p-7 md:p-10">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-400">
                  <span>Pregunta {step + 1} de {QUESTIONS.length}</span>
                  <span>{Math.round(((step + 1) / QUESTIONS.length) * 100)}%</span>
                </div>

                {isProcessing ? (
                  <div className="flex min-h-64 flex-col items-center justify-center text-center">
                    <Loader2 size={34} className="animate-spin text-fiscal" />
                    <p className="mt-4 text-sm font-semibold text-slate-600">{progress || 'Analizando materialidad…'}</p>
                  </div>
                ) : (
                  <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} className="mt-10">
                    <h3 className="text-2xl font-bold text-slate-900">{question.label}</h3>
                    {question.options ? (
                      <div className="mt-7 grid gap-3">
                        {question.options.map((option) => (
                          <button key={option} type="button" onClick={() => updateAnswer(question.id, option)} className={`rounded-2xl border p-4 text-left text-sm font-semibold transition ${answer === option ? 'border-fiscal bg-fiscal/5 text-fiscal ring-2 ring-fiscal/10' : 'border-slate-200 text-slate-600 hover:border-fiscal/30'}`}>
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input autoFocus type="text" value={answer} onChange={(event) => updateAnswer(question.id, event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') next(); }} placeholder={question.placeholder} aria-label={question.label} className="mt-7 w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-800 outline-none focus:border-fiscal focus:ring-4 focus:ring-fiscal/10" />
                    )}
                    <div className="mt-8 flex items-center justify-between">
                      <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:invisible"><ArrowLeft size={17} /> Anterior</button>
                      <button type="button" onClick={next} disabled={!answer.trim()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-fiscal px-6 text-sm font-bold text-white hover:bg-fiscal-light disabled:cursor-not-allowed disabled:opacity-40">{step === QUESTIONS.length - 1 ? 'Generar evaluación' : 'Siguiente'} <ArrowRight size={17} /></button>
                    </div>
                  </motion.div>
                )}
              </div>
            </section>
          </>
        ) : (
          <FiscalAnalysisResultPanel title="Resultado de materialidad" result={result} onReset={reset} onExport={() => void exportResult()} exporting={isExporting} onContinue={() => setActiveTab('fiscal-deductibility')} continueLabel="Continuar a deducibilidad" />
        )}
      </div>
    </div>
  );
};

export default FiscalMateriality;
