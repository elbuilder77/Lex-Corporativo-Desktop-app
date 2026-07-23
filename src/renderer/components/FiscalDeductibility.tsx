import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ReceiptText } from 'lucide-react';
import { motion } from 'framer-motion';
import { ensureModuleActivity } from '../lib/case-access';
import { generateAnalysisPDF } from '../lib/pdf-export';
import { useCaseStore } from '../store/useCaseStore';
import { useUiStore } from '../store/useUiStore';
import type { DocumentAnalysisResult } from '../types';
import { FiscalAnalysisResultPanel } from './FiscalAnalysisResultPanel';

type Probability = 'Alta' | 'Media' | 'Baja';
type Question = { id: string; label: string; placeholder?: string; options?: string[] };

const QUESTIONS: Question[] = [
  { id: 'expenseType', label: 'Tipo de gasto', placeholder: 'Ej: honorarios, renta, mercancía, publicidad, viáticos…' },
  { id: 'amount', label: 'Monto', placeholder: 'Ej: $85,000 MXN más IVA' },
  { id: 'cfdi', label: '¿Existe CFDI vigente que ampare el gasto?', options: ['Sí, CFDI vigente', 'Sí, pero requiere revisión', 'No'] },
  { id: 'paymentMethod', label: 'Método de pago', options: ['Transferencia, cheque o tarjeta desde cuenta del contribuyente', 'Efectivo', 'Compensación, tercero u otro medio'] },
  { id: 'businessNeed', label: 'Uso o necesidad del gasto', placeholder: 'Describe para qué se usó y por qué fue estrictamente indispensable…' },
  { id: 'documentaryEvidence', label: 'Evidencia documental', options: ['Contrato, entregables, recepción y pagos completos', 'Evidencia parcial', 'Sin evidencia adicional al CFDI'] },
  { id: 'economicActivityRelation', label: 'Relación con la actividad económica', options: ['Directa y demostrable con ingresos u operación', 'Indirecta o de soporte administrativo', 'No claramente relacionada'] },
  { id: 'vatRequirements', label: 'IVA trasladado y requisitos de acreditamiento', options: ['IVA expreso y separado, efectivamente pagado y gasto deducible', 'IVA identificado, pero pago o deducibilidad pendiente', 'Sin IVA trasladado o requisitos incompletos'] },
];

interface Assessment {
  deductibility: Probability;
  vatCredit: Probability;
  fulfilled: string[];
  missing: string[];
  actions: string[];
}

const probability = (score: number): Probability => score >= 6 ? 'Alta' : score >= 3 ? 'Media' : 'Baja';

export function buildDeductibilityAssessment(answers: Record<string, string>): Assessment {
  const fulfilled: string[] = [];
  const missing: string[] = [];
  const actions: string[] = [];
  let deductionScore = 0;
  let vatScore = 0;

  if (answers.cfdi?.startsWith('Sí, CFDI vigente')) {
    fulfilled.push('CFDI vigente que ampara la erogación.'); deductionScore += 2; vatScore += 2;
  } else if (answers.cfdi?.startsWith('Sí')) {
    fulfilled.push('Existe CFDI sujeto a validación.'); missing.push('Validar vigencia, datos fiscales y concepto del CFDI.'); deductionScore += 1; vatScore += 1;
  } else missing.push('CFDI vigente que ampare la erogación.');

  if (answers.paymentMethod?.startsWith('Transferencia')) {
    fulfilled.push('Pago bancario trazable desde cuenta del contribuyente.'); deductionScore += 2; vatScore += 1;
  } else missing.push('Medio de pago bancario trazable y conciliable.');

  if ((answers.businessNeed?.trim().length || 0) > 20) {
    fulfilled.push('Se documentó la necesidad del gasto y su uso en el negocio.'); deductionScore += 1;
  } else missing.push('Narrativa suficiente de estricta indispensabilidad y razón de negocios.');

  if (answers.documentaryEvidence?.startsWith('Contrato')) {
    fulfilled.push('Soporte documental robusto de contrato, ejecución, recepción y pago.'); deductionScore += 2;
  } else if (answers.documentaryEvidence?.startsWith('Evidencia parcial')) {
    fulfilled.push('Existe evidencia parcial de la operación.'); missing.push('Completar contrato, entregables, aceptación y trazabilidad de pagos.'); deductionScore += 1;
  } else missing.push('Evidencia distinta al CFDI que demuestre materialidad.');

  if (answers.economicActivityRelation?.startsWith('Directa')) {
    fulfilled.push('Relación directa con la actividad económica e ingresos.'); deductionScore += 2;
  } else if (answers.economicActivityRelation?.startsWith('Indirecta')) {
    fulfilled.push('Relación administrativa que requiere justificación reforzada.'); missing.push('Vincular el gasto con la conservación o generación de ingresos.'); deductionScore += 1;
  } else missing.push('Relación demostrable con la actividad económica.');

  if (answers.vatRequirements?.startsWith('IVA expreso')) {
    fulfilled.push('IVA expreso, separado, pagado y vinculado con gasto deducible.'); vatScore += 3;
  } else if (answers.vatRequirements?.startsWith('IVA identificado')) {
    missing.push('Comprobar pago efectivo del IVA y deducibilidad de la erogación.'); vatScore += 1;
  } else missing.push('Integrar requisitos de IVA trasladado, pago efectivo y acreditamiento.');

  actions.push('Integrar expediente con CFDI XML/PDF, contrato u orden, entregables, recepción, comprobante bancario y justificación de negocio.');
  if (missing.length) actions.push('Asignar responsable y fecha de cierre a cada requisito pendiente antes de presentar la deducción o acreditamiento.');

  return {
    deductibility: probability(deductionScore),
    vatCredit: probability(vatScore + Math.min(deductionScore, 3)),
    fulfilled,
    missing: [...new Set(missing)],
    actions,
  };
}

function toDocumentResult(answers: Record<string, string>, assessment: Assessment): DocumentAnalysisResult {
  const weak = assessment.deductibility === 'Baja' || assessment.vatCredit === 'Baja';
  const medium = assessment.deductibility === 'Media' || assessment.vatCredit === 'Media';
  const riskScore = weak ? 80 : medium ? 50 : 20;
  return {
    summary: `Evaluación preliminar de ${answers.expenseType || 'gasto'} por ${answers.amount || 'monto no precisado'}. Probabilidad de deducibilidad ${assessment.deductibility} y de IVA acreditable ${assessment.vatCredit}.`,
    documentType: 'Evaluación de deducibilidad e IVA',
    riskScore,
    detectedParties: [],
    detectedObligations: assessment.fulfilled,
    missingClauses: [],
    missingData: assessment.missing,
    risks: assessment.missing.map((item, index) => ({
      title: `Requisito pendiente ${index + 1}`,
      severity: weak ? 'high' : 'medium',
      explanation: item,
      relatedClauses: [],
      legalFoundations: [],
    })),
    recommendedActions: assessment.actions,
    checklist: assessment.fulfilled,
    riskCategories: {
      deducibilidad: [`Probabilidad ${assessment.deductibility}`, ...assessment.missing],
      ivaAcreditable: [`Probabilidad ${assessment.vatCredit}`],
      materialidad: assessment.fulfilled,
    },
    legalFoundations: [
      { id: 'lisr-27', title: 'Requisitos de las deducciones', law: 'LISR', article: '27' },
      { id: 'liva-5', title: 'Requisitos del acreditamiento', law: 'LIVA', article: '5' },
      { id: 'cff-29', title: 'Comprobantes fiscales digitales', law: 'CFF', article: '29 y 29-A' },
    ],
    confidence: 'high',
    engine: 'rules',
  };
}

export const FiscalDeductibility: React.FC = () => {
  const { notify, setActiveTab } = useUiStore();
  const { currentCaseId, setCurrentCaseId, addFiscalAnalysis, fiscalOperationState, updateFiscalOperationState, completeFiscalOperationStep } = useCaseStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(fiscalOperationState.deductibilityAnswers || {});
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const question = QUESTIONS[step];
  const answer = answers[question.id] || '';
  const assessment = useMemo(() => buildDeductibilityAssessment(answers), [answers]);

  const updateAnswer = (id: string, value: string) => {
    const nextAnswers = { ...answers, [id]: value };
    setAnswers(nextAnswers);
    updateFiscalOperationState({ deductibilityAnswers: nextAnswers });
  };

  const finish = async () => {
    const nextResult = toDocumentResult(answers, assessment);
    const caseId = await ensureModuleActivity('fiscal', currentCaseId);
    setCurrentCaseId(caseId);
    const id = crypto.randomUUID();
    addFiscalAnalysis({
      id,
      requestId: id,
      timestamp: new Date().toISOString(),
      files: [],
      result: nextResult,
      module: 'fiscal',
      ecosystem: 'fiscal',
      promptProfile: 'fiscal_analysis',
      currentDocumentOnly: true,
      customInstruction: Object.entries(answers).map(([key, value]) => `${key}: ${value}`).join('\n'),
      executionMode: 'local',
      engine: 'rules',
    });
    completeFiscalOperationStep('deductibility');
    setResult(nextResult);
    notify('Evaluación de deducibilidad e IVA guardada localmente.', 'success', 'Deducibilidad e IVA');
  };

  const next = () => {
    if (!answer.trim()) return;
    if (step < QUESTIONS.length - 1) setStep((current) => current + 1);
    else void finish();
  };

  const reset = () => { setStep(0); setAnswers({}); updateFiscalOperationState({ deductibilityAnswers: {} }); setResult(null); };

  const exportResult = async () => {
    if (!result) return;
    setIsExporting(true);
    try {
      await generateAnalysisPDF({
        title: 'Revisión de Deducibilidad e IVA',
        subtitle: `${answers.expenseType || 'Gasto'} · ${answers.amount || 'Monto no precisado'}`,
        riskScore: result.riskScore,
        summary: result.summary,
        pillars: [
          { title: 'DEDUCIBILIDAD', content: assessment.deductibility },
          { title: 'IVA ACREDITABLE', content: assessment.vatCredit },
          { title: 'REQUISITOS CUMPLIDOS', content: assessment.fulfilled.join('\n') || 'Sin requisitos confirmados.' },
        ],
        risks: assessment.missing,
        recommendation: assessment.actions.join('\n'),
        moduleName: 'Lex Corporativo · Fiscal',
        filenamePrefix: 'Revision_Deducibilidad_IVA',
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
            <header className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-fiscal/10 text-fiscal"><ReceiptText size={24} strokeWidth={1.8} /></div>
              <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold text-slate-950">Deducibilidad e IVA acreditable</h2><span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">Evaluación por reglas</span></div><p className="mt-1 max-w-3xl text-sm text-slate-600">Ordena requisitos cumplidos, pendientes y acciones sin depender de un modelo generativo.</p></div>
            </header>

            <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1.5 bg-slate-100"><div className="h-full bg-fiscal transition-all" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} /></div>
              <div className="p-7 md:p-10">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-400"><span>Pregunta {step + 1} de {QUESTIONS.length}</span><span>{Math.round(((step + 1) / QUESTIONS.length) * 100)}%</span></div>
                <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} className="mt-10">
                  <h3 className="text-2xl font-bold text-slate-900">{question.label}</h3>
                  {question.options ? (
                    <div className="mt-7 grid gap-3">
                      {question.options.map((option) => <button key={option} type="button" onClick={() => updateAnswer(question.id, option)} className={`rounded-2xl border p-4 text-left text-sm font-semibold transition ${answer === option ? 'border-fiscal bg-fiscal/5 text-fiscal ring-2 ring-fiscal/10' : 'border-slate-200 text-slate-600 hover:border-fiscal/30'}`}>{option}</button>)}
                    </div>
                  ) : (
                    <input autoFocus type="text" value={answer} onChange={(event) => updateAnswer(question.id, event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') next(); }} placeholder={question.placeholder} aria-label={question.label} className="mt-7 w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-800 outline-none focus:border-fiscal focus:ring-4 focus:ring-fiscal/10" />
                  )}
                  <div className="mt-8 flex items-center justify-between">
                    <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:invisible"><ArrowLeft size={17} /> Anterior</button>
                    <button type="button" onClick={next} disabled={!answer.trim()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-fiscal px-6 text-sm font-bold text-white hover:bg-fiscal-light disabled:cursor-not-allowed disabled:opacity-40">{step === QUESTIONS.length - 1 ? 'Generar evaluación' : 'Siguiente'} <ArrowRight size={17} /></button>
                  </div>
                </motion.div>
              </div>
            </section>

          </>
        ) : (
          <FiscalAnalysisResultPanel title="Resultado de deducibilidad e IVA" result={result} onReset={reset} onExport={() => void exportResult()} exporting={isExporting} onContinue={() => setActiveTab('fiscal-documentation')} continueLabel="Continuar a documentación" />
        )}
      </div>
    </div>
  );
};

export default FiscalDeductibility;
