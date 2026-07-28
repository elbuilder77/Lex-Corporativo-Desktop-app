import React, { useEffect } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ChevronLeft,
  ClipboardList,
  FileSignature,
  ReceiptText,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { ModuleTab } from '../types';
import { cn } from '../lib/utils';
import { useUiStore } from '../store/useUiStore';
import { FiscalConsultation } from './FiscalConsultation';
import { FiscalPreparation } from './FiscalPreparation';
import { FiscalMateriality } from './FiscalMateriality';
import { FiscalDeductibility } from './FiscalDeductibility';
import { FiscalDocumentation } from './FiscalDocumentation';
import { FiscalNormativeLibrary } from './FiscalNormativeLibrary';
import { useCaseStore } from '../store/useCaseStore';
import { CapabilityGate, type RuntimeCapability } from './CapabilityGate';
import { Stepper } from './ui/Stepper';

const FISCAL_TOOLS: Array<{
  tab: Exclude<ModuleTab, 'analysis' | 'drafting' | 'fiscal-home'>;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}> = [
  { tab: 'fiscal-consultation', label: 'Consulta asistida', description: 'Respuesta con fundamento local.', icon: Search },
  { tab: 'fiscal-preparation', label: 'Preparación', description: 'Contexto y evidencia de una operación.', icon: ShieldCheck },
  { tab: 'fiscal-materiality', label: 'Materialidad', description: 'Ejecución, trazabilidad y soporte.', icon: ClipboardList },
  { tab: 'fiscal-deductibility', label: 'Deducibilidad e IVA', description: 'Requisitos documentales por reglas.', icon: ReceiptText },
  { tab: 'fiscal-documentation', label: 'Documentación', description: 'Plantillas y documentos fiscales.', icon: FileSignature },
  { tab: 'fiscal-regulations', label: 'Normativa', description: 'Disposiciones de la base local.', icon: BookOpen },
];

const FISCAL_TAB_IDS: ModuleTab[] = FISCAL_TOOLS.map((item) => item.tab);

const OPERATION_STEPS = [
  { step: 'preparation', tab: 'fiscal-preparation', label: 'Preparación' },
  { step: 'materiality', tab: 'fiscal-materiality', label: 'Materialidad' },
  { step: 'deductibility', tab: 'fiscal-deductibility', label: 'Deducibilidad' },
  { step: 'documentation', tab: 'fiscal-documentation', label: 'Documentos' },
] as const;

export const FiscalModule: React.FC = () => {
  const { activeTab, setActiveTab, fiscalGuided, setFiscalGuided } = useUiStore();
  const { currentCaseId, activeModule, fiscalOperationState, updateFiscalOperationState, resetFiscalWork } = useCaseStore();
  const effectiveTab: ModuleTab = activeTab === 'analysis'
    ? 'fiscal-preparation'
    : activeTab === 'fiscal-home' || FISCAL_TAB_IDS.includes(activeTab)
      ? activeTab
      : 'fiscal-home';
  const activeConfig = FISCAL_TOOLS.find((item) => item.tab === effectiveTab);
  const completedCount = fiscalOperationState.completedSteps.length;
  const currentStepIndex = OPERATION_STEPS.findIndex((step) => step.tab === effectiveTab);
  const completedStepIndices = OPERATION_STEPS
    .map((step, index) => fiscalOperationState.completedSteps.includes(step.step) ? index : -1)
    .filter((index) => index !== -1);

  useEffect(() => {
    if (effectiveTab !== 'fiscal-home' && effectiveTab !== fiscalOperationState.lastActiveTab) {
      updateFiscalOperationState({ lastActiveTab: effectiveTab });
    }
  }, [effectiveTab, fiscalOperationState.lastActiveTab, updateFiscalOperationState]);

  const openTool = (tab: ModuleTab) => {
    setFiscalGuided(false);
    setActiveTab(tab);
  };

  const openGuided = () => {
    setFiscalGuided(true);
    setActiveTab('fiscal-preparation');
  };

  const goHome = () => {
    if (currentCaseId && activeModule === 'fiscal') resetFiscalWork();
    setFiscalGuided(false);
    setActiveTab('fiscal-home');
  };

  const activeCapability: RuntimeCapability | null = effectiveTab === 'fiscal-deductibility'
    ? 'rulesAssessment'
    : effectiveTab === 'fiscal-regulations'
      ? 'legalSearch'
      : effectiveTab === 'fiscal-home'
        ? null
        : 'legalGeneration';

  const content = (
    <>
      {effectiveTab === 'fiscal-consultation' && <FiscalConsultation />}
      {effectiveTab === 'fiscal-preparation' && <FiscalPreparation />}
      {effectiveTab === 'fiscal-materiality' && <FiscalMateriality />}
      {effectiveTab === 'fiscal-deductibility' && <FiscalDeductibility />}
      {effectiveTab === 'fiscal-documentation' && <FiscalDocumentation />}
      {effectiveTab === 'fiscal-regulations' && <FiscalNormativeLibrary />}
    </>
  );

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 md:px-8">
        <div className="flex min-h-12 items-center gap-3">
          {effectiveTab === 'fiscal-home' ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fiscal text-white shadow-sm">
              <Calculator size={22} strokeWidth={1.8} />
            </span>
          ) : (
            <button type="button" onClick={goHome} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-fiscal/30 hover:text-fiscal" aria-label="Volver a Fiscal">
              <ChevronLeft size={21} />
            </button>
          )}
          <span className="h-10 w-1 rounded-full bg-fiscal" />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-fiscal">Lex Fiscal</p>
            <h1 className="mt-0.5 truncate font-serif text-xl font-bold text-slate-950 md:text-2xl">{activeConfig?.label || 'Fiscal'}</h1>
          </div>
        </div>
      </header>

      {effectiveTab !== 'fiscal-home' && !fiscalGuided && (
        <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-white px-5 py-2.5 md:px-8" aria-label="Herramientas fiscales">
          {FISCAL_TOOLS.map((item) => {
            const Icon = item.icon;
            const active = effectiveTab === item.tab;
            return (
              <button key={item.tab} type="button" onClick={() => openTool(item.tab)} aria-current={active ? 'page' : undefined} className={cn('inline-flex min-w-max items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition', active ? 'border-fiscal/20 bg-fiscal/10 text-fiscal' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800')}>
                <Icon size={14} /> {item.label}
              </button>
            );
          })}
        </nav>
      )}

      {fiscalGuided && currentStepIndex >= 0 && (
        <section className="hidden shrink-0 items-center gap-6 border-b border-slate-200 bg-slate-50 px-5 py-3 md:flex md:px-8" aria-label="Avance de la revisión fiscal">
          <div className="w-40 shrink-0">
            <p className="text-xs font-bold text-slate-900">Revisión guiada</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{completedCount} de {OPERATION_STEPS.length}</p>
          </div>
          <div className="flex-1 px-4">
            <Stepper
              steps={OPERATION_STEPS.map((step) => step.label)}
              currentStep={currentStepIndex}
              completedSteps={completedStepIndices}
              onStepClick={(index) => setActiveTab(OPERATION_STEPS[index].tab)}
            />
          </div>
          <button type="button" onClick={goHome} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">Salir</button>
        </section>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {effectiveTab === 'fiscal-home' ? (
          <div className="h-full overflow-y-auto px-5 py-6 md:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {FISCAL_TOOLS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.tab} type="button" onClick={() => openTool(item.tab)} className="group flex min-h-28 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-fiscal/30 hover:shadow-md">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fiscal/10 text-fiscal"><Icon size={19} strokeWidth={1.8} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-950">{item.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
                      </span>
                      <ArrowRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-fiscal" />
                    </button>
                  );
                })}
              </div>

              <button type="button" onClick={openGuided} className="group mt-5 flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-slate-900 px-5 py-4 text-left text-white shadow-sm transition hover:bg-slate-800">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10"><ShieldCheck size={19} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Revisión guiada</span><span className="mt-0.5 block text-xs text-slate-300">Preparación · Materialidad · Deducibilidad · Documentación</span></span>
                <ArrowRight size={17} className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-white" />
              </button>
            </div>
          </div>
        ) : activeCapability ? (
          <CapabilityGate capability={activeCapability}>{content}</CapabilityGate>
        ) : content}
      </div>
    </div>
  );
};

export default FiscalModule;
