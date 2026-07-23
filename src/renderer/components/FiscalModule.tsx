import React from 'react';
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardList,
  FileSignature,
  FolderOpen,
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
import { useNavigate } from 'react-router-dom';
import { CapabilityGate, type RuntimeCapability } from './CapabilityGate';

const FISCAL_TABS: Array<{
  tab: ModuleTab;
  label: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}> = [
  { tab: 'fiscal-consultation', label: 'Consulta', title: 'Consulta Fiscal', icon: Search },
  { tab: 'fiscal-preparation', label: 'Preparación', title: 'Preparación de Operación', icon: ShieldCheck },
  { tab: 'fiscal-materiality', label: 'Materialidad', title: 'Materialidad', icon: ClipboardList },
  { tab: 'fiscal-deductibility', label: 'Deducibilidad / IVA', title: 'Deducibilidad e IVA', icon: ReceiptText },
  { tab: 'fiscal-documentation', label: 'Documentación', title: 'Documentación Fiscal', icon: FileSignature },
  { tab: 'fiscal-regulations', label: 'Normativa', title: 'Biblioteca Normativa', icon: BookOpen },
];

const FISCAL_TAB_IDS = FISCAL_TABS.map((item) => item.tab);

const OPERATION_STEPS = [
  { step: 'preparation', tab: 'fiscal-preparation', label: 'Preparación' },
  { step: 'materiality', tab: 'fiscal-materiality', label: 'Materialidad' },
  { step: 'deductibility', tab: 'fiscal-deductibility', label: 'Deducibilidad' },
  { step: 'documentation', tab: 'fiscal-documentation', label: 'Documentos' },
] as const;

export const FiscalModule: React.FC = () => {
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useUiStore();
  const { currentCaseId, fiscalOperationState } = useCaseStore();
  const effectiveTab: ModuleTab = activeTab === 'analysis'
    ? 'fiscal-preparation'
    : FISCAL_TAB_IDS.includes(activeTab)
      ? activeTab
      : 'fiscal-consultation';
  const activeConfig = FISCAL_TABS.find((item) => item.tab === effectiveTab) || FISCAL_TABS[0];
  const ActiveIcon = activeConfig.icon;
  const completedCount = fiscalOperationState.completedSteps.length;
  const operationTitle = fiscalOperationState.title || (currentCaseId ? 'Operación fiscal en curso' : 'Sin operación activa');
  const activeCapability: RuntimeCapability = effectiveTab === 'fiscal-deductibility'
    ? 'rulesAssessment'
    : effectiveTab === 'fiscal-regulations'
      ? 'legalSearch'
      : 'legalGeneration';

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 md:px-8">
        <div className="flex min-h-12 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fiscal text-white shadow-sm">
            <Calculator size={22} strokeWidth={1.8} />
          </span>
          <span className="h-10 w-1 rounded-full bg-fiscal" />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-fiscal">Lex Fiscal</p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <h1 className="truncate font-serif text-xl font-bold text-slate-950 md:text-2xl">{activeConfig.title}</h1>
              <p className="hidden text-sm text-slate-500 lg:block">Centro preventivo de preparación fiscal</p>
            </div>
          </div>
        </div>
      </header>

      <section className="hidden shrink-0 items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5 md:flex md:px-8" aria-label="Avance de la operación fiscal">
        <div className="min-w-0 w-52 shrink-0">
          <p className="truncate text-xs font-bold text-slate-900">{operationTitle}</p>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{completedCount} de {OPERATION_STEPS.length} etapas completas</p>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-1">
          {OPERATION_STEPS.map((item) => {
            const completed = fiscalOperationState.completedSteps.includes(item.step);
            const active = effectiveTab === item.tab;
            return (
              <button key={item.step} type="button" onClick={() => setActiveTab(item.tab)} className={cn('inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-bold transition', active ? 'bg-fiscal text-white' : 'text-slate-600 hover:bg-white', completed && !active && 'text-emerald-700')}>
                <CheckCircle2 size={13} className={cn('shrink-0', completed ? 'opacity-100' : 'opacity-35')} /> <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => navigate('/portafolio')} className="inline-flex min-w-max items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"><FolderOpen size={14} /> Portafolio</button>
      </section>

      <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 md:hidden" aria-label="Herramientas fiscales">
        {FISCAL_TABS.map((item) => {
          const Icon = item.icon;
          const active = effectiveTab === item.tab;
          return (
            <button key={item.tab} type="button" onClick={() => setActiveTab(item.tab)} aria-current={active ? 'page' : undefined} className={cn('inline-flex min-w-max items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition', active ? 'border-fiscal/20 bg-fiscal/10 text-fiscal' : 'border-slate-200 bg-white text-slate-500')}>
              <Icon size={14} /> {item.label}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-hidden">
        <CapabilityGate capability={activeCapability}>
          {effectiveTab === 'fiscal-consultation' && <FiscalConsultation />}
          {effectiveTab === 'fiscal-preparation' && <FiscalPreparation />}
          {effectiveTab === 'fiscal-materiality' && <FiscalMateriality />}
          {effectiveTab === 'fiscal-deductibility' && <FiscalDeductibility />}
          {effectiveTab === 'fiscal-documentation' && <FiscalDocumentation />}
          {effectiveTab === 'fiscal-regulations' && <FiscalNormativeLibrary />}
        </CapabilityGate>
      </div>

      <span className="pointer-events-none absolute bottom-5 right-5 hidden h-11 w-11 items-center justify-center rounded-2xl border border-fiscal/10 bg-white/70 text-fiscal/20 xl:flex">
        <ActiveIcon size={20} />
      </span>
    </div>
  );
};

export default FiscalModule;
