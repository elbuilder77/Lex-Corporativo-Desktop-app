import type { ModuleTab } from '../types';

export type FiscalAnalysisTab = Extract<
  ModuleTab,
  'analysis' | 'fiscal-materiality' | 'fiscal-deductibility'
>;

export interface FiscalAnalysisWorkflow {
  title: string;
  subtitle: string;
  focusLabel: string;
  focusPlaceholder: string;
  initialInstruction: string;
  expectedOutputs: [string, string, string];
  actionLabel: string;
  reportTitle: string;
  fileNamePrefix: string;
}

export const FISCAL_ANALYSIS_WORKFLOWS: Record<
  FiscalAnalysisTab,
  FiscalAnalysisWorkflow
> = {
  analysis: {
    title: 'Preparación Fiscal de Operación',
    subtitle:
      'Integre contratos, CFDI, pagos y entregables para obtener un estado preventivo de la operación.',
    focusLabel: 'Contexto de la operación',
    focusPlaceholder:
      'Ej: Pago por servicios con CFDI y transferencia; falta contrato firmado y evidencia de entregables.',
    initialInstruction:
      'Evalúa integralmente la preparación fiscal de la operación. Revisa materialidad, CFDI, contraprestación, pagos, entregables, razón de negocios, deducibilidad, IVA acreditable y posible exposición al artículo 69-B del CFF. Separa evidencia disponible, evidencia pendiente y siguientes acciones.',
    expectedOutputs: [
      'Estado de preparación y hallazgos prioritarios',
      'Evidencia disponible y documentación pendiente',
      'Fundamentos fiscales y siguientes acciones',
    ],
    actionLabel: 'Revisar preparación',
    reportTitle: 'Estado Preventivo Fiscal',
    fileNamePrefix: 'Estado_Preventivo_Fiscal',
  },
  'fiscal-materiality': {
    title: 'Materialidad y Evidencia',
    subtitle:
      'Acredite la existencia real de la operación mediante trazabilidad contractual, operativa, financiera y documental.',
    focusLabel: 'Alcance de materialidad',
    focusPlaceholder:
      'Ej: Valida que contrato, CFDI, entregables, comunicaciones, personal y pagos acrediten la prestación efectiva.',
    initialInstruction:
      'Analiza exclusivamente la materialidad y sustancia económica de la operación. Identifica participantes, capacidad del proveedor, ejecución real, entregables, comunicaciones, CFDI, pagos, registros contables y razón de negocios. Clasifica evidencia disponible, evidencia débil y evidencia faltante; no inventes hechos ni fundamentos.',
    expectedOutputs: [
      'Narrativa de ejecución y sustancia económica',
      'Matriz de evidencia disponible y faltante',
      'Acciones para cerrar brechas de materialidad',
    ],
    actionLabel: 'Evaluar materialidad',
    reportTitle: 'Revisión de Materialidad Fiscal',
    fileNamePrefix: 'Revision_Materialidad_Fiscal',
  },
  'fiscal-deductibility': {
    title: 'Deducibilidad e IVA',
    subtitle:
      'Revise requisitos documentales para deducción de ISR y acreditamiento de IVA con soporte local verificable.',
    focusLabel: 'Alcance de deducibilidad',
    focusPlaceholder:
      'Ej: Verifica estricta indispensabilidad, CFDI, método y fecha de pago, retenciones, contabilidad e IVA acreditable.',
    initialInstruction:
      'Analiza exclusivamente la deducibilidad para ISR y el acreditamiento de IVA. Revisa estricta indispensabilidad, relación con la actividad, CFDI, forma y fecha de pago, retenciones, registro contable, actos gravados, materialidad y documentación comprobatoria. Distingue requisitos cumplidos, condicionados y pendientes.',
    expectedOutputs: [
      'Estado documental de deducibilidad ISR',
      'Estado documental de IVA acreditable',
      'Requisitos pendientes y acciones correctivas',
    ],
    actionLabel: 'Revisar deducibilidad',
    reportTitle: 'Revisión de Deducibilidad e IVA',
    fileNamePrefix: 'Revision_Deducibilidad_IVA',
  },
};

export const FISCAL_WORKSPACE_TABS: ModuleTab[] = [
  'analysis',
  'fiscal-materiality',
  'fiscal-deductibility',
  'fiscal-regulations',
];
