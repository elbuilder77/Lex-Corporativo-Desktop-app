import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clipboard,
  Code2,
  Download,
  Edit3,
  Eye,
  FileSignature,
  FileText,
  FolderOpen,
  Globe2,
  History,
  House,
  Landmark,
  ListFilter,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  SearchCheck,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  ShipWheel,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { analyzeEngineeringDocument, draftLegalDocument, type UserReferenceFile } from '../services/ai';
import type { LegalDraftingArea } from '../../shared/legal-contracts';
import type { DocumentAnalysisResult, SavedCase } from '../types';
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  LEGAL_ENGINEERING_TEMPLATES,
  type DraftingTemplate,
  type LegalEngineeringArea,
} from '../lib/constants';
import { getFullTemplateBody } from '../lib/template-bodies';
import { DraftingTemplatePicker } from './DraftingTemplatePicker';
import { UniversalDocumentBadge } from './UniversalDocumentBadge';
import { ensureModuleActivity } from '../lib/case-access';

import { generateDocumentPDF } from '../lib/pdf-export';
import { generateDocumentDocx } from '../lib/docx-export';
import { BRAND_CONTENT } from '../lib/product-content';

import { useCaseStore } from '../store/useCaseStore';
import { useUiStore } from '../store/useUiStore';
import { cn } from '../lib/utils';
import { useProcessingGuard } from '../hooks/useProcessingGuard';
import logoMarkUrl from '../assets/logo-mark.png';
import { LectorNormativoModal } from './LectorNormativoModal';

type WorkspaceTab = 'estacion' | 'drafting' | 'analysis';
type SourceMode = 'template' | 'reference' | 'analysis';

interface GuideMessage {
  role: 'user' | 'model';
  text: string;
}

const ENGINEERING_AREAS: LegalEngineeringArea[] = ['mercantil', 'laboral', 'comercio_exterior', 'aduanal', 'fiscal'];

const AREA_CONTENT: Record<LegalEngineeringArea, {
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
  tone: 'blue' | 'amber' | 'emerald';
  activeClass: string;
  focusPlaceholder: string;
}> = {
  mercantil: {
    label: 'Mercantil y corporativo',
    shortLabel: 'Mercantil',
    description: 'Contratos, actas, poderes, pagarés, gobierno societario y convenios comerciales.',
    icon: <Scale size={16} />,
    tone: 'blue',
    activeClass: 'border-blue-500 bg-blue-50 text-blue-950 ring-2 ring-blue-500/20',
    focusPlaceholder: 'Indica partes, objeto, montos, vigencia, obligaciones y condiciones que debe contener el documento.',
  },
  laboral: {
    label: 'Laboral y relaciones de trabajo',
    shortLabel: 'Laboral',
    description: 'Contratos individuales, teletrabajo, confidencialidad, actas y terminación.',
    icon: <BriefcaseBusiness size={16} />,
    tone: 'amber',
    activeClass: 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20',
    focusPlaceholder: 'Indica patrón, persona trabajadora, puesto, salario, jornada, prestaciones, centro de trabajo y modalidad.',
  },
  comercio_exterior: {
    label: 'Comercio exterior y contratos globales',
    shortLabel: 'Comercio exterior',
    description: 'Compraventa internacional, distribución, Incoterms 2020 y coordinación logística.',
    icon: <Globe2 size={16} />,
    tone: 'emerald',
    activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20',
    focusPlaceholder: 'Indica partes, mercancías, Incoterm, país de origen, entrega, pago, documentos y permisos aplicables.',
  },
  aduanal: {
    label: 'Aduanal y despacho',
    shortLabel: 'Aduanal',
    description: 'Expedientes de pedimento, valor en aduana, rectificaciones y requerimientos.',
    icon: <ShipWheel size={16} />,
    tone: 'blue',
    activeClass: 'border-purple-500 bg-purple-50 text-purple-950 ring-2 ring-purple-500/20',
    focusPlaceholder: 'Indica pedimento, régimen, aduana, importador/exportador, mercancía, valor y documentos soporte.',
  },
  fiscal: {
    label: 'Fiscal y patrimonial',
    shortLabel: 'Fiscal',
    description: 'Contratos con estipulaciones fiscales, mutuo, reconocimientos de adeudo y escritos de defensa.',
    icon: <ReceiptText size={16} />,
    tone: 'emerald',
    activeClass: 'border-teal-500 bg-teal-50 text-teal-950 ring-2 ring-teal-500/20',
    focusPlaceholder: 'Indica partes, objeto de la operación, contraprestación, comprobantes (CFDI), retenciones, pagos y obligaciones de cumplimiento.',
  },
};

const AREA_THEMES: Record<LegalEngineeringArea, {
  text: string;
  border: string;
  rail: string;
  ring: string;
  button: string;
}> = {
  mercantil: {
    text: 'text-blue-700',
    border: 'border-blue-600',
    rail: 'bg-blue-600',
    ring: 'focus:border-blue-600 focus:ring-blue-600/15',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  laboral: {
    text: 'text-amber-700',
    border: 'border-amber-600',
    rail: 'bg-amber-600',
    ring: 'focus:border-amber-500 focus:ring-amber-500/20',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
  comercio_exterior: {
    text: 'text-emerald-700',
    border: 'border-emerald-600',
    rail: 'bg-emerald-600',
    ring: 'focus:border-emerald-500 focus:ring-emerald-500/20',
    button: 'bg-emerald-700 hover:bg-emerald-800',
  },
  aduanal: {
    text: 'text-purple-700',
    border: 'border-purple-600',
    rail: 'bg-purple-600',
    ring: 'focus:border-purple-500 focus:ring-purple-500/20',
    button: 'bg-purple-700 hover:bg-purple-800',
  },
  fiscal: {
    text: 'text-teal-700',
    border: 'border-teal-600',
    rail: 'bg-teal-600',
    ring: 'focus:border-teal-600 focus:ring-teal-600/20',
    button: 'bg-teal-700 hover:bg-teal-800',
  },
};

function isEngineeringArea(area?: string | null): area is LegalEngineeringArea {
  return Boolean(area && area in LEGAL_ENGINEERING_TEMPLATES);
}

function normalizeEngineeringArea(area?: LegalDraftingArea | null): LegalEngineeringArea {
  return isEngineeringArea(area) ? area : 'mercantil';
}

const formatCaseDate = (value?: string) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(date);
};

function isAllowedLegalFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.xml', '.txt', '.md'];
  if (allowedExtensions.some((ext) => name.endsWith(ext))) {
    return true;
  }
  return ALLOWED_FILE_TYPES.includes(file.type);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const LegalEngineering: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const initialWorkspaceTab: WorkspaceTab =
    rawTab === 'drafting' || rawTab === 'analysis'
      ? rawTab
      : 'estacion';

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(initialWorkspaceTab);

  const { notify, runtimeHealth, refreshRuntimeHealth, requestProcessingSetup } = useUiStore();
  const canGenerate = useProcessingGuard('legalGeneration', 'generar este documento');
  const {
    currentCaseId,
    setCurrentCaseId,
    recentCases,
    fetchRecentCases,
    loadCase,
    engineeringDraftState,
    setEngineeringDraftState,
    engineeringDraftingHistory,
    addEngineeringDrafting,
    addEngineeringAnalysis,
    saveEngineeringWork,
  } = useCaseStore();

  const canRestoreEngineeringDraft = Boolean(engineeringDraftState.prompt || engineeringDraftState.generatedDoc);
  const initialArea = canRestoreEngineeringDraft && isEngineeringArea(engineeringDraftState.area)
    ? engineeringDraftState.area
    : 'mercantil';
  const initialTemplate = canRestoreEngineeringDraft && engineeringDraftState.template && isEngineeringArea(engineeringDraftState.area)
    ? engineeringDraftState.template
    : null;
  const initialMode = canRestoreEngineeringDraft && engineeringDraftState.mode === 'analysis' ? 'analysis' : (canRestoreEngineeringDraft ? engineeringDraftState.mode : 'template');

  const [sourceMode, setSourceMode] = useState<SourceMode | 'analysis'>(initialMode);
  const [area, setArea] = useState<LegalEngineeringArea>(initialArea);
  const [analysisAreas, setAnalysisAreas] = useState<LegalEngineeringArea[]>([initialArea]);
  const [prompt, setPrompt] = useState(canRestoreEngineeringDraft ? engineeringDraftState.prompt : '');
  const [selectedTemplate, setSelectedTemplate] = useState<DraftingTemplate | null>(initialTemplate);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState(canRestoreEngineeringDraft ? engineeringDraftState.generatedDoc : '');
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isDraggingDraft, setIsDraggingDraft] = useState(false);
  const [isDraggingAnalysis, setIsDraggingAnalysis] = useState(false);
  const [documentViewMode, setDocumentViewMode] = useState<'letterhead' | 'edit' | 'raw'>('letterhead');
  const [auditFilter, setAuditFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'missing' | 'foundations' | 'actions'>('all');

  // Lector Normativo modal state
  const [lectorState, setLectorState] = useState<{
    isOpen: boolean;
    lawCode: string | null;
    articleNumber?: string | null;
  }>({
    isOpen: false,
    lawCode: null,
  });

  // Estación Hub Guide State
  const [guideMessages, setGuideMessages] = useState<GuideMessage[]>([
    { role: 'model', text: 'Puedo ayudarte a usar las herramientas de Ingeniería Jurídica paso a paso.' },
  ]);
  const [guideInput, setGuideInput] = useState('');
  const [isGuideGenerating, setIsGuideGenerating] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [byokSettings, setByokSettings] = useState<Awaited<ReturnType<typeof window.lexDesktop.byok.getSettings>> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisInputRef = useRef<HTMLInputElement>(null);
  const guideMessagesEndRef = useRef<HTMLDivElement>(null);

  const templates = useMemo(() => LEGAL_ENGINEERING_TEMPLATES[area] || [], [area]);
  const visibleHistory = useMemo(
    () => engineeringDraftingHistory.filter((item) => {
      const itemArea = item.area || item.ecosystem;
      return !itemArea || isEngineeringArea(itemArea);
    }),
    [engineeringDraftingHistory],
  );

  const areaContent = AREA_CONTENT[area];
  const areaTheme = AREA_THEMES[area];

  const vaultReady = runtimeHealth?.capabilities.vault.ready ?? false;
  const corpusReady = runtimeHealth?.capabilities.legalSearch.ready ?? false;
  const byokActive = Boolean(byokSettings?.enabled && byokSettings.hasApiKey);
  const guideReady = byokActive;
  const providerLabel = byokSettings?.provider === 'openai'
    ? 'OpenAI'
    : byokSettings?.provider === 'anthropic'
      ? 'Claude'
      : 'Gemini';
  const processingLabel = byokActive
    ? `${providerLabel} conectado`
    : 'Conectar IA';

  useEffect(() => {
    void refreshRuntimeHealth();
    void fetchRecentCases();
    window.lexDesktop.byok.getSettings().then(setByokSettings).catch(() => setByokSettings(null));
  }, [fetchRecentCases, refreshRuntimeHealth]);

  useEffect(() => {
    if (rawTab === 'consultation') {
      navigate('/buscador', { replace: true });
    }
  }, [navigate, rawTab]);

  useEffect(() => {
    if (rawTab && (rawTab === 'estacion' || rawTab === 'analysis' || rawTab === 'drafting') && rawTab !== workspaceTab) {
      setWorkspaceTab(rawTab);
    }
  }, [rawTab, workspaceTab]);

  useEffect(() => {
    if (helpOpen && (guideMessages.length > 1 || isGuideGenerating)) {
      guideMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [helpOpen, isGuideGenerating, guideMessages]);

  const switchWorkspaceTab = (tab: WorkspaceTab) => {
    setWorkspaceTab(tab);
    setSearchParams(tab === 'estacion' ? {} : { tab });
  };

  useEffect(() => {
    setEngineeringDraftState({
      prompt,
      mode: sourceMode,
      generatedDoc,
      template: selectedTemplate,
      area,
      referenceFileName: referenceFile?.name,
      sourceAnalysisId: analysisId || undefined,
    });
  }, [area, generatedDoc, prompt, referenceFile?.name, selectedTemplate, setEngineeringDraftState, sourceMode, analysisId]);

  const changeArea = (nextArea: LegalEngineeringArea) => {
    setArea(nextArea);
    setSelectedTemplate(null);
    if (sourceMode === 'template') {
      setPrompt('');
    }
    if (analysisAreas.length <= 1) {
      setAnalysisAreas([nextArea]);
    }
  };

  const toggleAnalysisArea = (targetArea: LegalEngineeringArea) => {
    setAnalysisAreas((prev) => {
      if (prev.includes(targetArea)) {
        if (prev.length === 1) {
          notify('Debes mantener al menos una materia seleccionada para la auditoría.', 'info', 'Materias de análisis');
          return prev;
        }
        return prev.filter((a) => a !== targetArea);
      } else {
        return [...prev, targetArea];
      }
    });
  };

  const selectAllAnalysisAreas = () => {
    const allAreas: LegalEngineeringArea[] = ['mercantil', 'fiscal', 'laboral', 'comercio_exterior', 'aduanal'];
    if (analysisAreas.length === allAreas.length) {
      setAnalysisAreas([area]);
    } else {
      setAnalysisAreas(allAreas);
    }
  };

  const resetAnalysis = () => {
    setAnalysisFile(null);
    setAnalysisResult(null);
    setAnalysisId(null);
    setAnalysisPrompt('');
    setAnalysisProgress('');
  };

  const selectTemplate = (template: DraftingTemplate) => {
    setSelectedTemplate(template);
    if (selectedTemplate?.id !== template.id) setPrompt('');
  };

  const applyReferenceFile = (file?: File) => {
    if (!file) return;
    if (!isAllowedLegalFile(file)) {
      notify('Formato no compatible. Admite PDF, Word (.docx), CFDI/XML, TXT o Markdown.', 'warning', 'Formato no compatible');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      notify('El archivo debe pesar 20 MB o menos.', 'warning', 'Archivo demasiado grande');
      return;
    }
    setReferenceFile(file);
    setSelectedTemplate(null);
  };

  const applyAnalysisFile = (file?: File) => {
    if (!file) return;
    if (!isAllowedLegalFile(file)) {
      notify('Formato no compatible. Admite PDF, Word (.docx), CFDI/XML, TXT o Markdown.', 'warning', 'Formato no compatible');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      notify('El archivo debe pesar 20 MB o menos.', 'warning', 'Archivo demasiado grande');
      return;
    }
    setAnalysisFile(file);
    setAnalysisResult(null);
    setAnalysisId(null);
  };

  const handleAnalyzeDocument = async () => {
    if (!analysisFile) {
      notify('Sube el documento que quieres analizar.', 'warning', 'Falta el archivo');
      return;
    }
    if (!canGenerate()) return;
    setIsAnalyzing(true);
    setAnalysisProgress(analysisAreas.length > 1 ? `Iniciando auditoría integral en ${analysisAreas.length} materias...` : 'Extrayendo contenido y estructura del documento...');
    try {
      window.lexDesktop.analysis.onProgress((state) => setAnalysisProgress(state.label));
      const targetCaseId = await ensureModuleActivity('engineering', currentCaseId);
      setCurrentCaseId(targetCaseId);

      const mimeType = analysisFile.name.toLowerCase().endsWith('.md')
        ? 'text/markdown'
        : analysisFile.type as UserReferenceFile['mimeType'];
      const filePayload = {
        name: analysisFile.name,
        mimeType,
        base64: await readFileAsBase64(analysisFile),
      };
      const instruction = analysisPrompt.trim() || `Auditoría ${analysisAreas.length > 1 ? 'integral multidisciplinaria 360°' : `en materia ${areaContent.label}`}. Identifica contingencias, omisiones y fundamentos aplicables.`;
      const response = await analyzeEngineeringDocument([filePayload], instruction, analysisAreas);
      const result = typeof response.result === 'string' ? JSON.parse(response.result) : response.result;
      setAnalysisResult(result);
      setAnalysisId(response.requestId);
      addEngineeringAnalysis({
        id: response.requestId,
        requestId: response.requestId,
        timestamp: new Date().toISOString(),
        files: [{ name: analysisFile.name, type: mimeType }],
        result,
        module: 'engineering',
        ecosystem: analysisAreas.length === 1 ? analysisAreas[0] : ('integral' as any),
        promptProfile: response.promptProfile,
        currentDocumentOnly: true,
        customInstruction: instruction,
        executionMode: response.requestedExecutionMode,
        engine: response.engine,
        provider: response.provider,
      });
      await saveEngineeringWork();
      const provLabel = response.provider === 'openai' ? 'OpenAI' : response.provider === 'anthropic' ? 'Claude' : 'Gemini';
      notify(`Auditoría ${analysisAreas.length > 1 ? 'integral 360°' : 'documental'} completada con ${provLabel} BYOK.`, 'success', 'Ingeniería Jurídica');
    } catch (error: any) {
      notify(error?.message || 'No se pudo analizar el documento.', 'error', 'Ingeniería Jurídica');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  // Remodelación 2: Auto-remediación individual por hallazgo
  const handleRemediateSingleFinding = (title: string, explanation: string, lawReference?: string) => {
    const text = [
      `Redactar cláusula correctiva formal para subsanar la siguiente contingencia jurídica:`,
      `CONTINGENCIA / RIESGO DETECTADO:\n${title}: ${explanation}`,
      lawReference ? `FUNDAMENTO LEGAL APLICABLE:\n${lawReference}` : '',
      `INSTRUCCIONES:\nRedactar la cláusula contractual con técnica jurídica mexicana, subsanando la contingencia y protegiendo a las partes con plena validez legal.`,
    ].filter(Boolean).join('\n\n');

    setPrompt(text);
    setSourceMode('analysis');
    switchWorkspaceTab('drafting');
    notify(`Instrucción de subsanación cargada en el Redactor: "${title}".`, 'success', 'Auto-remediación');
  };

  // Remodelación 2: Puente Directo Integral (Auditoría ➔ Redactor Contractual)
  const deriveDraftFromAnalysis = () => {
    if (!analysisResult) return;
    const missing = [...(analysisResult.missingClauses || []), ...(analysisResult.missingData || [])];
    const risks = analysisResult.risks?.map((r) => `${r.title} (${r.severity}): ${r.explanation}`).filter(Boolean);
    const actions = analysisResult.recommendedActions?.map((a) => `- ${a}`).join('\n');

    const areaLabel = analysisAreas.length > 1
      ? `integral (${analysisAreas.map(a => AREA_CONTENT[a].shortLabel).join(', ')})`
      : areaContent.label;

    const lines = [
      `Redactar adenda o convenio modificatorio correctivo para subsanar los hallazgos de la auditoría jurídica en materia ${areaLabel}.`,
      missing.length ? `CLÁUSULAS Y REQUISITOS FALTANTES OBLIGATORIOS A INCORPORAR:\n${missing.map((m) => `- ${m}`).join('\n')}` : '',
      risks?.length ? `CONTINGENCIAS Y RIESGOS A MITIGAR EN EL CLAUSULADO:\n${risks.map((r) => `- ${r}`).join('\n')}` : '',
      actions ? `ACCIONES CORRECTIVAS A ATENDER:\n${actions}` : '',
      'Redactar con técnica jurídica formal, manteniendo la validez del documento original y subsanando las omisiones y riesgos detectados conforme a la legislación mexicana aplicable.',
    ].filter(Boolean).join('\n\n');

    if (analysisFile) {
      setReferenceFile(analysisFile);
    }
    setSelectedTemplate(null);
    setPrompt(lines);
    setSourceMode('analysis');
    switchWorkspaceTab('drafting');
    notify('Documento auditado e instrucciones cargados en el Redactor Jurídico.', 'success', 'Redacción asistida');
  };

  const handleGenerate = async () => {
    if (sourceMode === 'template' && !selectedTemplate) {
      notify('Selecciona una plantilla para continuar.', 'warning', 'Falta una plantilla');
      return;
    }
    if (sourceMode === 'reference' && !referenceFile) {
      notify('Sube el archivo que quieres corregir o editar.', 'warning', 'Falta el archivo');
      return;
    }
    if (sourceMode === 'analysis' && !referenceFile && !analysisFile && !analysisResult) {
      notify('No hay un documento o dictamen de auditoría cargado como base.', 'warning', 'Falta documento auditado');
      return;
    }
    if (!prompt.trim()) {
      notify(sourceMode === 'reference' || sourceMode === 'analysis' ? 'Describe las correcciones o cambios que necesitas.' : 'Completa los datos e instrucciones del documento.', 'warning', 'Faltan instrucciones');
      return;
    }
    if (!canGenerate()) return;
    setIsGenerating(true);
    try {
      const targetCaseId = await ensureModuleActivity('engineering', currentCaseId);
      setCurrentCaseId(targetCaseId);

      let userReference: UserReferenceFile | undefined;
      const fileToUse = referenceFile || (sourceMode === 'analysis' ? analysisFile : null);
      if (fileToUse) {
        const mimeType = fileToUse.name.toLowerCase().endsWith('.md')
          ? 'text/markdown'
          : fileToUse.type as UserReferenceFile['mimeType'];
        userReference = {
          name: fileToUse.name,
          mimeType,
          base64: await readFileAsBase64(fileToUse),
        };
      }

      const templatePayload = selectedTemplate ? {
        id: selectedTemplate.id,
        title: selectedTemplate.title,
        prompt: selectedTemplate.prompt,
        requiredFields: selectedTemplate.requiredFields,
        output: selectedTemplate.output,
      } : undefined;

      const response = await draftLegalDocument(prompt, area, templatePayload, analysisId || undefined, userReference, targetCaseId);
      setGeneratedDoc(response.result);
      setEngineeringDraftState({ executionMode: response.requestedExecutionMode });
      addEngineeringDrafting({
        id: response.requestId,
        requestId: response.requestId,
        timestamp: new Date().toISOString(),
        prompt,
        area,
        ecosystem: area,
        promptProfile: response.promptProfile,
        templateId: selectedTemplate?.id,
        templateTitle: sourceMode === 'analysis' ? `Adenda Correctiva (${fileToUse?.name || 'Auditoría'})` : selectedTemplate?.title,
        referenceFileName: fileToUse?.name,
        sourceAnalysisId: analysisId || undefined,
        sourceDocumentAnalysis: analysisResult || undefined,
        generatedDoc: response.result,
        executionMode: response.requestedExecutionMode,
        engine: response.engine,
      });
      await saveEngineeringWork();
      const provLabel = response.provider === 'openai' ? 'OpenAI' : response.provider === 'anthropic' ? 'Claude' : 'Gemini';
      notify(`Documento redactado con éxito mediante ${provLabel} BYOK.`, 'success', 'Ingeniería Jurídica');
    } catch (error: any) {
      notify(error?.message || 'No se pudo generar el documento.', 'error', 'Ingeniería Jurídica');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    if (!generatedDoc || isExporting) return;
    setIsExporting(true);
    try {
      const firstLineTitle = generatedDoc.split('\n').find((l) => l.trim().length > 0)?.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
      const docTitle = selectedTemplate?.title
        || (sourceMode === 'analysis' ? 'Adenda y Convenio Modificatorio' : undefined)
        || firstLineTitle
        || 'Instrumento Jurídico';

      const result = await generateDocumentPDF(
        generatedDoc,
        docTitle,
        `Materia: ${areaContent.label} · ${new Date().toLocaleDateString('es-MX')}`,
        `Documento_${areaContent.shortLabel}`,
      );
      if (result.success) notify('Documento exportado en PDF.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo exportar el documento.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDocx = async () => {
    if (!generatedDoc || isExporting) return;
    setIsExporting(true);
    try {
      const firstLineTitle = generatedDoc.split('\n').find((l) => l.trim().length > 0)?.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
      const docTitle = selectedTemplate?.title
        || (sourceMode === 'analysis' ? 'Adenda y Convenio Modificatorio' : undefined)
        || firstLineTitle
        || 'Instrumento Jurídico';

      const result = await generateDocumentDocx(generatedDoc, {
        title: docTitle,
        subtitle: `Materia: ${areaContent.label}`,
        filenamePrefix: `Documento_${areaContent.shortLabel}`,
        ecosystem: areaContent.shortLabel,
      });
      if (result.success) notify('Documento exportado a Microsoft Word (.docx).', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo exportar el documento a Word.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Remodelación 4: Carga directa de machote 100% Offline / Gratuito
  const handleOpenTemplateDirectly = (template: DraftingTemplate) => {
    setSelectedTemplate(template);
    const fullBody = getFullTemplateBody(template);
    setGeneratedDoc(fullBody);
    setDocumentViewMode('letterhead');
    notify(`Machote "${template.title}" cargado en el editor. Listo para editar y exportar sin costo de IA.`, 'success', 'Plantilla Lista');
  };

  const handleExportTemplateDirectly = async (template: DraftingTemplate, format: 'pdf' | 'docx') => {
    const fullBody = getFullTemplateBody(template);
    const docTitle = template.title || 'Plantilla Jurídica';
    setIsExporting(true);
    try {
      if (format === 'pdf') {
        const result = await generateDocumentPDF(
          fullBody,
          docTitle,
          `Materia: ${areaContent.label} · ${new Date().toLocaleDateString('es-MX')}`,
          `Plantilla_${areaContent.shortLabel}`,
        );
        if (result.success) notify('Plantilla exportada en PDF.', 'success');
      } else {
        const result = await generateDocumentDocx(fullBody, {
          title: docTitle,
          subtitle: `Materia: ${areaContent.label}`,
          filenamePrefix: `Plantilla_${areaContent.shortLabel}`,
          ecosystem: areaContent.shortLabel,
        });
        if (result.success) notify('Plantilla exportada a Microsoft Word (.docx).', 'success');
      }
    } catch (error: any) {
      notify(error?.message || 'Error al exportar plantilla.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const resetDocument = () => {
    setGeneratedDoc('');
    setPrompt('');
    setSelectedTemplate(null);
    setReferenceFile(null);
    setAnalysisFile(null);
    setAnalysisResult(null);
    setAnalysisId(null);
    setAnalysisPrompt('');
  };

  const handleSendGuide = async (textToSend: string) => {
    if (!textToSend.trim() || isGuideGenerating) return;
    if (!guideReady) {
      requestProcessingSetup('usar la guía interactiva');
      return;
    }
    const userMessage: GuideMessage = { role: 'user', text: textToSend.trim() };
    setGuideMessages((prev) => [...prev, userMessage]);
    setGuideInput('');
    setIsGuideGenerating(true);
    try {
      if (!window.lexDesktop?.assistant) {
        throw new Error('El asistente local no está disponible.');
      }
      const response = await window.lexDesktop.assistant.askInstructivo({
        query: textToSend.trim(),
        history: guideMessages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      });
      setGuideMessages((prev) => [...prev, { role: 'model', text: response.result }]);
    } catch {
      setGuideMessages((prev) => [...prev, { role: 'model', text: 'No pude procesar tu consulta en este momento.' }]);
    } finally {
      setIsGuideGenerating(false);
    }
  };

  const resumeCase = async (savedCase: SavedCase) => {
    await loadCase(savedCase);
    switchWorkspaceTab('drafting');
  };

  const highRisks = useMemo(() => analysisResult?.risks?.filter((r) => r.severity === 'high') || [], [analysisResult]);
  const mediumRisks = useMemo(() => analysisResult?.risks?.filter((r) => r.severity === 'medium') || [], [analysisResult]);
  const lowRisks = useMemo(() => analysisResult?.risks?.filter((r) => r.severity === 'low') || [], [analysisResult]);

  const hubActions = [
    {
      title: 'Redactar documento',
      description: 'Contratos de servicios, trabajo, pagarés, compraventa, arrendamiento y convenios.',
      icon: FileSignature,
      iconBg: 'bg-blue-50 text-blue-700',
      action: () => switchWorkspaceTab('drafting'),
    },
    {
      title: 'Revisar / Auditar documento',
      description: 'Sube un contrato o archivo para detectar riesgos, omisiones y cláusulas faltantes.',
      icon: ShieldAlert,
      iconBg: 'bg-rose-50 text-rose-700',
      action: () => switchWorkspaceTab('analysis'),
    },
    {
      title: 'Centro de Inteligencia Normativa',
      description: 'Consulta y coteja 7,348 artículos oficiales de leyes federales con lector íntegro.',
      icon: Search,
      iconBg: 'bg-emerald-50 text-emerald-700',
      action: () => navigate('/buscador'),
    },
    {
      title: 'Bóveda de Documentos',
      description: 'Tus contratos, borradores y revisiones almacenados de forma local y privada.',
      icon: FolderOpen,
      iconBg: 'bg-slate-100 text-slate-700',
      action: () => navigate('/portafolio'),
    },
  ];

  // Plantillas rápidas para el estado inicial del Workbench
  const popularTemplates = useMemo(() => {
    return (templates || []).slice(0, 3);
  }, [templates]);

  return (
    <div className="relative h-full overflow-y-auto bg-slate-50 text-slate-800">
      <div className={cn('pointer-events-none sticky left-0 top-0 z-20 h-1 w-full', areaTheme.rail)} />
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-5 md:px-6 space-y-5">
        
        {/* Header Principal de la Suite */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white p-4.5 rounded-2xl shadow-xs window-drag-region">
          <div className="flex items-center gap-3">
            <img src={logoMarkUrl} alt="Lex Corporativo" className="h-8 w-8 rounded-lg object-contain window-no-drag" />
            <div>
              <h1 className="text-base font-bold text-slate-950">Ingeniería Jurídica</h1>
              <p className="text-xs text-slate-500">Estación privada de trabajo legal</p>
            </div>
          </div>

          <div className="flex items-center gap-2 window-no-drag">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
            >
              <History size={14} /> Guardados ({visibleHistory.length})
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings?tab=ia')}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
            >
              <CircleDot size={13} className={byokActive ? 'text-emerald-600' : 'text-amber-600'} />
              {processingLabel}
              <Settings2 size={13} className="text-slate-400" />
            </button>
          </div>
        </header>

        {/* Pestañas Principales: Estación + Redactor + Auditoría */}
        <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3" aria-label="Navegación de Ingeniería Jurídica">
          <button
            type="button"
            onClick={() => switchWorkspaceTab('estacion')}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold transition shadow-xs cursor-pointer',
              workspaceTab === 'estacion'
                ? 'bg-slate-950 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            <House size={15} />
            Estación
          </button>
          <button
            type="button"
            onClick={() => switchWorkspaceTab('drafting')}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold transition shadow-xs cursor-pointer',
              workspaceTab === 'drafting'
                ? 'bg-slate-950 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            <FileSignature size={15} />
            Redactor & Plantillas
          </button>
          <button
            type="button"
            onClick={() => switchWorkspaceTab('analysis')}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold transition shadow-xs cursor-pointer',
              workspaceTab === 'analysis'
                ? 'bg-slate-950 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            <ShieldAlert size={15} />
            Auditoría de Riesgos
          </button>
        </nav>

        {/* Historial Flotante */}
        {showHistory && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" aria-label="Historial de documentos">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Documentos guardados recientemente</h2>
              <button type="button" onClick={() => setShowHistory(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cerrar historial"><X size={15} /></button>
            </div>
            {visibleHistory.length === 0 ? (
              <p className="text-xs text-slate-500">No hay documentos generados recientemente en esta sesión.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setGeneratedDoc(item.generatedDoc || '');
                      setPrompt(item.prompt);
                      setArea(normalizeEngineeringArea(item.area));
                      setShowHistory(false);
                      switchWorkspaceTab('drafting');
                    }}
                    className="flex w-full items-center justify-between gap-4 py-2 text-left hover:text-slate-950 transition cursor-pointer"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-slate-900">{item.templateTitle || item.referenceFileName || 'Documento personalizado'}</span>
                      <span className="block text-[11px] text-slate-500">{AREA_CONTENT[normalizeEngineeringArea(item.area || item.ecosystem)].shortLabel} · {new Date(item.timestamp).toLocaleDateString()}</span>
                    </span>
                    <FileText size={15} className="shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* CARÁTULA OFICIAL: ESTACIÓN                                                */}
        {/* ========================================================================= */}
        {workspaceTab === 'estacion' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <main className="space-y-6">
              {/* Opciones directas */}
              <section className="grid gap-3.5 sm:grid-cols-2">
                {hubActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={item.action}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-slate-300 hover:shadow-sm cursor-pointer"
                    >
                      <div>
                        <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl', item.iconBg)}>
                          <Icon size={20} />
                        </span>
                        <h2 className="mt-3 text-sm font-bold text-slate-950 group-hover:text-blue-900 transition-colors">
                          {item.title}
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          {item.description}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-slate-950">
                        <span>Abrir herramienta</span>
                        <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                      </div>
                    </button>
                  );
                })}
              </section>

              {/* Guardados recientes */}
              {recentCases.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Guardados recientes</h2>
                    <button
                      type="button"
                      onClick={() => navigate('/portafolio')}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-950 cursor-pointer"
                    >
                      Ver todos ({recentCases.length})
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {recentCases.slice(0, 4).map((savedCase) => (
                      <button
                        key={savedCase.id}
                        type="button"
                        onClick={() => void resumeCase(savedCase)}
                        className="group flex w-full items-center justify-between py-2.5 text-left hover:text-slate-950 transition cursor-pointer"
                      >
                        <div className="min-w-0 pr-3">
                          <span className="block truncate text-xs font-bold text-slate-900 group-hover:text-blue-900">
                            {savedCase.name}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            {formatCaseDate(savedCase.date)}
                          </span>
                        </div>
                        <ArrowRight size={14} className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </main>

            {/* Columna Lateral */}
            <aside className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Sistema local</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <FolderOpen size={14} /> Bóveda local
                    </span>
                    <span className={cn('font-bold', vaultReady ? 'text-emerald-700' : 'text-amber-700')}>
                      {vaultReady ? 'Lista' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <BookOpen size={14} /> Corpus de leyes
                    </span>
                    <span className={cn('font-bold', corpusReady ? 'text-emerald-700' : 'text-amber-700')}>
                      {corpusReady ? 'Listo' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </section>

              {/* Guía de la aplicación */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => setHelpOpen((o) => !o)}
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 transition cursor-pointer"
                >
                  <Bot size={17} className="text-slate-700" />
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-900">Guía de uso</span>
                    <span className="block text-[11px] text-slate-500">¿Cómo usar las herramientas?</span>
                  </div>
                  {helpOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>

                {helpOpen && (
                  <div className="border-t border-slate-100 p-4 space-y-3">
                    {!guideReady && (
                      <div className="flex gap-2 rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-900">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>Conecta una API en Configuración para usar la guía interactiva.</span>
                      </div>
                    )}
                    <div className="max-h-56 space-y-2 overflow-y-auto">
                      <AnimatePresence initial={false}>
                        {guideMessages.map((message, index) => (
                          <motion.div
                            key={`${message.role}-${index}`}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              'rounded-xl p-2.5 text-xs leading-relaxed',
                              message.role === 'user' ? 'ml-4 bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
                            )}
                          >
                            <span className="whitespace-pre-wrap">{message.text}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {isGuideGenerating && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Loader2 size={13} className="animate-spin" /> Respondiendo...
                        </div>
                      )}
                      <div ref={guideMessagesEndRef} />
                    </div>
                    <form
                      onSubmit={(e) => { e.preventDefault(); void handleSendGuide(guideInput); }}
                      className="flex items-center gap-2 pt-1"
                    >
                      <input
                        value={guideInput}
                        onChange={(e) => setGuideInput(e.target.value)}
                        disabled={isGuideGenerating}
                        placeholder={guideReady ? 'Pregunta sobre la app...' : 'Configura la IA para preguntar'}
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-slate-400"
                      />
                      <button
                        type="submit"
                        disabled={isGuideGenerating || !guideInput.trim()}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white disabled:opacity-30 shadow-xs cursor-pointer"
                        aria-label="Enviar"
                      >
                        <Send size={13} />
                      </button>
                    </form>
                  </div>
                )}
              </section>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-[11px] leading-relaxed text-slate-500 flex items-start gap-2.5 shadow-xs">
                <ShieldCheck size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                <p>Tus documentos y datos se almacenan exclusivamente en tu computadora con cifrado local.</p>
              </div>
            </aside>
          </div>
        )}

        {/* ========================================================================= */}
        {/* REMODELACIÓN 1 & 4: WORKBENCH UNIFICADO (SPLIT-PANE WORKSPACE)            */}
        {/* ========================================================================= */}
        {workspaceTab === 'drafting' && (
          <div className="space-y-4">
            
            {/* Barra Segmentada de Materias Jurídicas */}
            <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs" aria-label="Materia Jurídica">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Materia Jurídica del Documento</h2>
                <span className="text-xs text-slate-400 font-semibold">
                  Materia seleccionada: <strong className="text-slate-800">{areaContent.label}</strong>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {ENGINEERING_AREAS.map((item) => {
                  const content = AREA_CONTENT[item];
                  const active = area === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => changeArea(item)}
                      aria-pressed={active}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-bold transition shadow-2xs cursor-pointer',
                        active ? `${content.activeClass} shadow-xs` : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <span className="shrink-0">{content.icon}</span>
                      <span className="truncate">{content.shortLabel}</span>
                      {active && <Check size={14} className="ml-auto text-current shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Split-Pane: Columna Izquierda (Controles & Datos) + Columna Derecha (Canvas & Editor) */}
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(340px,430px)_minmax(0,1fr)]">
              
              {/* COLUMNA IZQUIERDA: CONTROLES, ORIGEN Y PARÁMETROS */}
              <section className="space-y-4">
                
                {/* Selector de Origen */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    1. Origen del Documento
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setSourceMode('template'); setReferenceFile(null); }}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer text-xs font-bold',
                        sourceMode === 'template'
                          ? `${areaTheme.border} ${areaTheme.button} text-white shadow-xs`
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <FileText size={16} className="mb-1" />
                      <span>Plantilla ({templates.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setSourceMode('reference'); setSelectedTemplate(null); }}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer text-xs font-bold',
                        sourceMode === 'reference'
                          ? `${areaTheme.border} ${areaTheme.button} text-white shadow-xs`
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <Upload size={16} className="mb-1" />
                      <span>Mi Archivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (analysisFile && !referenceFile) setReferenceFile(analysisFile);
                        setSourceMode('analysis');
                        setSelectedTemplate(null);
                      }}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer text-xs font-bold',
                        sourceMode === 'analysis'
                          ? 'border-emerald-600 bg-emerald-700 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <ShieldCheck size={16} className="mb-1" />
                      <span>Auditoría {analysisResult ? '✓' : ''}</span>
                    </button>
                  </div>

                  {/* Detalle del Origen */}
                  {sourceMode === 'template' ? (
                    <div className="pt-2 border-t border-slate-100">
                      <DraftingTemplatePicker
                        templates={templates}
                        selectedTemplate={selectedTemplate}
                        tone={areaContent.tone}
                        onSelect={selectTemplate}
                        onClear={() => { setSelectedTemplate(null); setPrompt(''); }}
                        onOpenDirectly={handleOpenTemplateDirectly}
                        onExportDirectly={handleExportTemplateDirectly}
                      />
                    </div>
                  ) : sourceMode === 'analysis' ? (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {(referenceFile || analysisFile) ? (
                        <UniversalDocumentBadge
                          file={(referenceFile || analysisFile)!}
                          area={area}
                          onRemove={() => { setReferenceFile(null); setSourceMode('template'); }}
                        />
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                          <ShieldCheck size={24} className="mx-auto mb-1 text-emerald-600" />
                          <p className="text-xs font-bold text-slate-900">Instrucciones desde Dictamen de Auditoría</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDraft(true); }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDraft(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDraft(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingDraft(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) applyReferenceFile(file);
                      }}
                      className={cn(
                        'rounded-xl border border-dashed transition-all p-5 text-center',
                        isDraggingDraft
                          ? 'border-blue-500 bg-blue-50/80 ring-4 ring-blue-500/20'
                          : 'border-slate-300 bg-slate-50/60'
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.xml,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/xml,text/xml,text/plain,text/markdown"
                        className="hidden"
                        onChange={(e) => { applyReferenceFile(e.target.files?.[0]); e.target.value = ''; }}
                      />
                      {referenceFile ? (
                        <UniversalDocumentBadge
                          file={referenceFile}
                          area={area}
                          onRemove={() => setReferenceFile(null)}
                        />
                      ) : (
                        <div>
                          <Upload size={22} className="mx-auto mb-1.5 text-slate-400" />
                          <p className="text-xs font-bold text-slate-900">Sube o arrastra el documento base</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">PDF, Word (.docx), CFDI/XML, TXT</p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={cn('mt-2.5 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white transition cursor-pointer', areaTheme.button)}
                          >
                            <Upload size={13} /> Examinar archivo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Formulario de Variables / Instrucciones */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      2. Datos e Instrucciones
                    </h3>
                    {selectedTemplate && (
                      <button
                        type="button"
                        onClick={() => handleOpenTemplateDirectly(selectedTemplate)}
                        className="text-[11px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        title="Cargar el machote sin procesar"
                      >
                        <Edit3 size={11} /> Cargar machote directo
                      </button>
                    )}
                  </div>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={8}
                    placeholder={
                      sourceMode === 'reference'
                        ? 'Indica las modificaciones o cláusulas a cambiar en el archivo...'
                        : selectedTemplate
                        ? `Ingresa los datos para ${selectedTemplate.title}:\n- ${selectedTemplate.requiredFields.join('\n- ')}`
                        : `${areaContent.focusPlaceholder}`
                    }
                    className={cn('w-full resize-y rounded-xl border border-slate-300 bg-slate-50/60 p-3 text-xs leading-relaxed text-slate-900 outline-hidden transition placeholder:text-slate-400 focus:bg-white focus:ring-2', areaTheme.ring)}
                  />

                  {/* Atajos Rápidos de Cláusulas Comunes */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agregar cláusula sugerida:</span>
                    <div className="flex flex-wrap gap-1">
                      {['+ Confidencialidad (NDA)', '+ Cláusula Penal', '+ Rescisión sin responsabilidad', '+ Jurisdicción y Ley Aplicable'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setPrompt((p) => p ? `${p}\n- Incluir ${chip.replace('+', '')}` : `Incluir ${chip.replace('+', '')}`)}
                          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* BOTONES BIMODALES DE ACCIÓN */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {selectedTemplate && (
                      <button
                        type="button"
                        onClick={() => handleOpenTemplateDirectly(selectedTemplate)}
                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 px-4 text-xs font-bold shadow-2xs hover:bg-emerald-100 transition cursor-pointer"
                      >
                        <FileText size={15} className="text-emerald-700" />
                        <span>📄 Usar Machote Directo (100% Offline / Gratis)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating || (sourceMode === 'analysis' && !analysisResult && !referenceFile && !analysisFile)}
                      className={cn(
                        'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 shadow-xs cursor-pointer',
                        areaTheme.button
                      )}
                    >
                      {isGenerating ? (
                        <><Loader2 size={16} className="animate-spin" /> Redactando con IA ({providerLabel})...</>
                      ) : sourceMode === 'analysis' ? (
                        <><FileSignature size={15} /> ✨ Redactar Adenda con IA</>
                      ) : (
                        <><Sparkles size={15} /> ✨ Redactar y Personalizar con IA</>
                      )}
                    </button>
                  </div>
                </div>

              </section>

              {/* COLUMNA DERECHA: CANVAS DEL DOCUMENTO & EDITOR EN VIVO */}
              <main className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 min-h-[640px] flex flex-col">
                
                {/* Barra de Herramientas del Canvas */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn('rounded-lg px-2.5 py-1 text-xs font-bold text-white shrink-0', areaTheme.button)}>
                      {areaContent.shortLabel}
                    </span>
                    <h2 className="text-sm font-bold text-slate-950 truncate max-w-sm">
                      {selectedTemplate?.title || referenceFile?.name || (generatedDoc ? 'Instrumento Jurídico' : 'Lienzo de Redacción')}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Switcher de Vista */}
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setDocumentViewMode('letterhead')}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer',
                          documentViewMode === 'letterhead'
                            ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                        title="Vista Formal Membretada"
                      >
                        <FileText size={12} />
                        <span>Membrete</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocumentViewMode('edit')}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer',
                          documentViewMode === 'edit'
                            ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                        title="Editor de Texto en Vivo"
                      >
                        <Edit3 size={12} />
                        <span>Editor</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!generatedDoc) return;
                        await navigator.clipboard.writeText(generatedDoc);
                        notify('Documento copiado al portapapeles.', 'success');
                      }}
                      disabled={!generatedDoc}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                      title="Copiar texto al portapapeles"
                    >
                      <Clipboard size={12} /> Copiar
                    </button>

                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={!generatedDoc || isExporting}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                    >
                      {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} PDF
                    </button>

                    <button
                      type="button"
                      onClick={handleExportDocx}
                      disabled={!generatedDoc || isExporting}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 px-2.5 text-xs font-bold hover:bg-blue-100 disabled:opacity-40 transition cursor-pointer"
                    >
                      {isExporting ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Word (.docx)
                    </button>

                    {generatedDoc && (
                      <button
                        type="button"
                        onClick={resetDocument}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="Limpiar documento"
                      >
                        <RefreshCw size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Canvas Render: Si hay documento o Estado Inicial Asistido */}
                {generatedDoc ? (
                  <div className="flex-1">
                    {documentViewMode === 'letterhead' ? (
                      <article className="legal-letterhead rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs space-y-6">
                        <header className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <img src={logoMarkUrl} alt="Lex Corporativo" className="h-8 w-8 object-contain" />
                            <div>
                              <span className="font-serif text-xs font-bold tracking-wider text-slate-900 uppercase">
                                LEX CORPORATIVO
                              </span>
                              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                INSTRUMENTO JURÍDICO FORMAL
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="rounded-md bg-slate-900 text-white px-2 py-0.5 text-[9px] font-extrabold uppercase">
                              {areaContent.label}
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                        </header>

                        <div className="prose-legal select-text">
                          <ReactMarkdown>{generatedDoc}</ReactMarkdown>
                        </div>

                        <footer className="pt-4 border-t border-slate-200 text-center flex items-center justify-between text-[9px] text-slate-400">
                          <span>Texto estructurado con técnica jurídica mexicana</span>
                          <span>FOLIO: {analysisId || 'DOC-LOCAL'} · LEX CORP</span>
                        </footer>
                      </article>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                          <span>Edita el texto directamente (reemplaza corchetes [ ]):</span>
                          <span>{generatedDoc.length} caracteres</span>
                        </div>
                        <textarea
                          value={generatedDoc}
                          onChange={(e) => setGeneratedDoc(e.target.value)}
                          rows={24}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-4 font-mono text-xs leading-relaxed text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                          placeholder="Escribe o personaliza el contenido del documento..."
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Estado Inicial del Canvas con Accesos Directos */
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40">
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                      <FileSignature size={24} />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h3 className="text-sm font-bold text-slate-900">Lienzo de Redacción Listo</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Selecciona una plantilla de la izquierda o haz clic en uno de los machotes más utilizados en materia <strong className="text-slate-800">{areaContent.label}</strong> para comenzar inmediatamente sin costo:
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3 w-full max-w-lg">
                      {popularTemplates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleOpenTemplateDirectly(t)}
                          className="flex flex-col items-start p-3 rounded-xl border border-slate-200 bg-white text-left hover:border-slate-300 hover:shadow-xs transition cursor-pointer"
                        >
                          <span className="text-xs font-bold text-slate-900 line-clamp-1">{t.title}</span>
                          <span className="text-[10px] text-emerald-700 font-semibold mt-1">⚡ Usar machote</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </main>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* REMODELACIÓN 2: AUDITORÍA CON AUTO-REMEDIACIÓN CLÁUSULA POR CLÁUSULA     */}
        {/* ========================================================================= */}
        {workspaceTab === 'analysis' && (
          <div className="space-y-5">
            {!analysisResult ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 max-w-3xl mx-auto">
                <div>
                  <h2 className="text-base font-bold text-slate-950">Auditoría Jurídica y Detección de Riesgos</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sube un contrato o instrumento legal para auditar riesgos críticos, cláusulas faltantes y cotejo normativo oficial.
                  </p>
                </div>

                {/* Selector de Materias para la Auditoría */}
                <div className="space-y-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Materias de Cotejo ({analysisAreas.length} seleccionada{analysisAreas.length > 1 ? 's' : ''})
                    </label>
                    <button
                      type="button"
                      onClick={selectAllAnalysisAreas}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 transition cursor-pointer"
                    >
                      <Sparkles size={13} className="text-amber-500" />
                      {analysisAreas.length === 5 ? 'Restablecer a materia activa' : '✨ Auditoría Integral 360°'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {(['mercantil', 'fiscal', 'laboral', 'comercio_exterior', 'aduanal'] as LegalEngineeringArea[]).map((a) => {
                      const selected = analysisAreas.includes(a);
                      const Icon = a === 'mercantil' ? Landmark : a === 'fiscal' ? ReceiptText : a === 'laboral' ? BriefcaseBusiness : a === 'comercio_exterior' ? Globe2 : ShipWheel;
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => toggleAnalysisArea(a)}
                          className={cn(
                            'flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-bold transition shadow-2xs cursor-pointer',
                            selected
                              ? `${AREA_THEMES[a].border} ${AREA_THEMES[a].button} text-white shadow-xs`
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          <Icon size={14} className={selected ? 'text-white' : 'text-slate-500'} />
                          <span className="truncate">{AREA_CONTENT[a].shortLabel}</span>
                          {selected && <Check size={13} className="ml-auto text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dropzone de Carga */}
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingAnalysis(true); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingAnalysis(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingAnalysis(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingAnalysis(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) applyAnalysisFile(file);
                  }}
                  className={cn(
                    'rounded-2xl border border-dashed transition-all p-6 text-center',
                    isDraggingAnalysis
                      ? 'border-blue-500 bg-blue-50/80 ring-4 ring-blue-500/20'
                      : 'border-slate-300 bg-slate-50/70'
                  )}
                >
                  <input
                    ref={analysisInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.xml,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/xml,text/xml,text/plain,text/markdown"
                    className="hidden"
                    onChange={(e) => { applyAnalysisFile(e.target.files?.[0]); e.target.value = ''; }}
                  />
                  {analysisFile ? (
                    <UniversalDocumentBadge
                      file={analysisFile}
                      area={area}
                      onRemove={() => setAnalysisFile(null)}
                    />
                  ) : (
                    <div>
                      <ShieldAlert size={32} className="mx-auto mb-2 text-slate-400" />
                      <p className="text-sm font-bold text-slate-900">
                        {isDraggingAnalysis ? '¡Suelta el documento legal aquí!' : 'Carga o arrastra el contrato, factura o instrumento a auditar'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">PDF, Word (.docx), CFDI/XML, TXT (hasta 20 MB)</p>
                      <button
                        type="button"
                        onClick={() => analysisInputRef.current?.click()}
                        className={cn('mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-5 text-xs font-bold text-white transition shadow-xs cursor-pointer', areaTheme.button)}
                      >
                        <Upload size={15} /> Seleccionar archivo
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Instrucciones o enfoque específico (opcional)</label>
                  <textarea
                    value={analysisPrompt}
                    onChange={(e) => setAnalysisPrompt(e.target.value)}
                    rows={2}
                    placeholder="Ej: auditar estipulaciones de rescisión, penas convencionales y validez de poderes..."
                    className={cn('w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-900 outline-hidden transition placeholder:text-slate-400 focus:ring-2', areaTheme.ring)}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAnalyzeDocument}
                  disabled={isAnalyzing || !analysisFile}
                  className={cn('inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-6 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 shadow-xs cursor-pointer', areaTheme.button)}
                >
                  {isAnalyzing ? <><Loader2 size={16} className="animate-spin" /> {analysisProgress || 'Procesando auditoría...'}</> : <><SearchCheck size={16} /> Iniciar Auditoría Jurídica</>}
                </button>
              </section>
            ) : (
              /* RESULTADO DE AUDITORÍA CON ACCIONES DIRECTAS POR CLÁUSULA */
              <div className="space-y-5">
                
                {/* Cabecera Principal */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                      <CheckCircle2 size={16} /> Auditoría completada con éxito
                    </div>
                    <h2 className="text-lg font-bold text-slate-950 mt-1">
                      {analysisResult.documentType ? `${analysisResult.documentType} · Diagnóstico Jurídico` : 'Diagnóstico de Contingencias y Faltantes Normativos'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-1.5 pt-2">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">Materias evaluadas:</span>
                      {analysisAreas.map((a) => (
                        <span key={a} className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase text-white', AREA_THEMES[a].button)}>
                          {AREA_CONTENT[a].shortLabel}
                        </span>
                      ))}
                      {analysisAreas.length > 1 && (
                        <span className="rounded-md bg-purple-700 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase">
                          ✨ 360° Integral
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={deriveDraftFromAnalysis}
                      className={cn(
                        'inline-flex min-h-10 items-center gap-2 rounded-xl px-5 text-xs font-bold text-white shadow-sm transition cursor-pointer',
                        areaTheme.button
                      )}
                    >
                      <FileSignature size={15} /> ✍️ Redactar Adenda Completa con Todos los Hallazgos
                    </button>
                    <button
                      type="button"
                      onClick={resetAnalysis}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                    >
                      <RotateCcw size={14} /> Nueva auditoría
                    </button>
                  </div>
                </div>

                {/* Scorecard y Métricas */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nivel de Riesgo Global</span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider',
                        analysisResult.riskScore > 65
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : analysisResult.riskScore > 35
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      )}>
                        {analysisResult.riskScore > 65 ? 'Crítico' : analysisResult.riskScore > 35 ? 'Moderado' : 'Bajo'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-serif text-3xl font-extrabold text-slate-950">
                        {analysisResult.riskScore}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">/ 100 pts</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          analysisResult.riskScore > 65 ? 'bg-rose-600' : analysisResult.riskScore > 35 ? 'bg-amber-500' : 'bg-emerald-600'
                        )}
                        style={{ width: `${Math.min(Math.max(analysisResult.riskScore, 5), 100)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAuditFilter(auditFilter === 'high' ? 'all' : 'high')}
                    className={cn(
                      'rounded-2xl border p-4 text-left shadow-xs transition cursor-pointer flex flex-col justify-between',
                      auditFilter === 'high'
                        ? 'border-rose-300 bg-rose-50/70 ring-2 ring-rose-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Riesgos Críticos</span>
                      <ShieldAlert size={16} className="text-rose-600" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-rose-950">
                      {highRisks.length}
                    </div>
                    <p className="text-[11px] text-rose-800 font-medium">Subsanación obligatoria</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditFilter(auditFilter === 'medium' ? 'all' : 'medium')}
                    className={cn(
                      'rounded-2xl border p-4 text-left shadow-xs transition cursor-pointer flex flex-col justify-between',
                      auditFilter === 'medium'
                        ? 'border-amber-300 bg-amber-50/70 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Ambigüedades</span>
                      <AlertTriangle size={16} className="text-amber-600" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-amber-950">
                      {mediumRisks.length}
                    </div>
                    <p className="text-[11px] text-amber-800 font-medium">Contingencia o duda legal</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditFilter(auditFilter === 'missing' ? 'all' : 'missing')}
                    className={cn(
                      'rounded-2xl border p-4 text-left shadow-xs transition cursor-pointer flex flex-col justify-between',
                      auditFilter === 'missing'
                        ? 'border-blue-300 bg-blue-50/70 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Cláusulas Faltantes</span>
                      <FileSignature size={16} className="text-blue-600" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-blue-950">
                      {(analysisResult.missingClauses?.length || 0) + (analysisResult.missingData?.length || 0)}
                    </div>
                    <p className="text-[11px] text-blue-800 font-medium">Cláusulas omitidas</p>
                  </button>
                </div>

                {/* Resumen Ejecutivo */}
                {analysisResult.summary && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <Scale size={15} className={areaTheme.text} />
                        Dictamen Jurídico Ejecutivo
                      </h3>
                      {analysisResult.detectedParties && analysisResult.detectedParties.length > 0 && (
                        <span className="text-[11px] text-slate-500">
                          Partes: {analysisResult.detectedParties.join(' · ')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">
                      {analysisResult.summary}
                    </p>
                  </section>
                )}

                {/* Filtros de Hallazgos */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setAuditFilter('all')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shadow-xs',
                      auditFilter === 'all' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <ListFilter size={13} />
                    <span>Todos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditFilter('high')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shadow-xs',
                      auditFilter === 'high' ? 'bg-rose-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span>🔴 Críticos ({highRisks.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditFilter('medium')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shadow-xs',
                      auditFilter === 'medium' ? 'bg-amber-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span>🟡 Medios ({mediumRisks.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditFilter('missing')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shadow-xs',
                      auditFilter === 'missing' ? 'bg-blue-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span>⚠️ Faltantes ({(analysisResult.missingClauses?.length || 0) + (analysisResult.missingData?.length || 0)})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditFilter('foundations')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer shadow-xs',
                      auditFilter === 'foundations' ? 'bg-emerald-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span>⚖️ Leyes ({analysisResult.legalFoundations?.length || 0})</span>
                  </button>
                </div>

                {/* TARJETAS DE HALLAZGOS CON BOTÓN DE AUTO-REMEDIACIÓN QUIRÚRGICO */}
                <div className="space-y-4">
                  {/* Riesgos Altos */}
                  {(auditFilter === 'all' || auditFilter === 'high') && highRisks.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                        <ShieldAlert size={14} /> Riesgos Críticos ({highRisks.length})
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {highRisks.map((risk, index) => (
                          <div key={`high-${index}`} className="flex flex-col justify-between rounded-2xl border border-rose-200 bg-white p-4.5 shadow-xs space-y-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="rounded-md bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                                  Severidad Alta
                                </span>
                              </div>
                              <h4 className="font-bold text-xs text-slate-900">{risk.title}</h4>
                              <p className="text-xs leading-relaxed text-slate-700">{risk.explanation}</p>
                            </div>

                            {/* Barra de Acción Directa por Cláusula */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleRemediateSingleFinding(risk.title, risk.explanation)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-800 transition cursor-pointer shadow-xs"
                              >
                                <FileSignature size={13} />
                                <span>⚡ Subsanar en Redactor</span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(`${risk.title}:\n${risk.explanation}`);
                                  notify('Riesgo copiado.', 'success');
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                              >
                                <Clipboard size={12} /> Copiar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Riesgos Medios */}
                  {(auditFilter === 'all' || auditFilter === 'medium') && mediumRisks.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                        <AlertTriangle size={14} /> Ambigüedades y Riesgos Medios ({mediumRisks.length})
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {mediumRisks.map((risk, index) => (
                          <div key={`med-${index}`} className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-white p-4.5 shadow-xs space-y-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                                  Severidad Media
                                </span>
                              </div>
                              <h4 className="font-bold text-xs text-slate-900">{risk.title}</h4>
                              <p className="text-xs leading-relaxed text-slate-700">{risk.explanation}</p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleRemediateSingleFinding(risk.title, risk.explanation)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition cursor-pointer shadow-xs"
                              >
                                <FileSignature size={13} />
                                <span>⚡ Subsanar en Redactor</span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(`${risk.title}:\n${risk.explanation}`);
                                  notify('Observación copiada.', 'success');
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                              >
                                <Clipboard size={12} /> Copiar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Cláusulas Faltantes */}
                  {(auditFilter === 'all' || auditFilter === 'missing') && (analysisResult.missingClauses?.length || 0) > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                        <FileSignature size={14} /> Cláusulas Indispensables Omitidas ({analysisResult.missingClauses?.length || 0})
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {analysisResult.missingClauses?.map((clause, index) => (
                          <div key={`missing-${index}`} className="flex flex-col justify-between rounded-2xl border border-blue-200 bg-white p-4.5 shadow-xs space-y-3">
                            <div className="space-y-1.5">
                              <span className="rounded-md bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                                Cláusula Omitida
                              </span>
                              <p className="text-xs font-bold text-slate-900 mt-1">{clause}</p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleRemediateSingleFinding(`Incorporación de cláusula omitida: ${clause}`, `Redactar e incorporar la cláusula de ${clause} con plena validez legal.`)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition cursor-pointer shadow-xs"
                              >
                                <Plus size={13} />
                                <span>Redactar e Insertar Cláusula</span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(clause);
                                  notify('Cláusula copiada.', 'success');
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                              >
                                <Clipboard size={12} /> Copiar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Fundamentos Jurídicos con Acceso al Lector */}
                  {(auditFilter === 'all' || auditFilter === 'foundations') && (analysisResult.legalFoundations?.length || 0) > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                        <Scale size={14} /> Fundamentos y Leyes Oficiales Aplicables ({analysisResult.legalFoundations?.length || 0})
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {analysisResult.legalFoundations?.map((found, index) => {
                          const codeCandidate = found.law || 'LFT';
                          return (
                            <div key={`found-${index}`} className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-white p-4.5 shadow-xs space-y-3">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                                    {found.law || 'Fundamento Oficial'}
                                  </span>
                                  {found.article && (
                                    <span className="text-xs font-bold text-slate-900">{found.article}</span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed">{found.excerpt || found.title || 'Disposición aplicable al caso.'}</p>
                              </div>

                              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setLectorState({ isOpen: true, lawCode: codeCandidate, articleNumber: found.article || null })}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition cursor-pointer shadow-xs"
                                >
                                  <BookOpen size={13} />
                                  <span>📖 Leer Ley en Lector</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

      </div>

      {/* Lector Normativo Modal Integrado */}
      <LectorNormativoModal
        isOpen={lectorState.isOpen}
        onClose={() => setLectorState({ isOpen: false, lawCode: null })}
        lawCode={lectorState.lawCode}
        initialArticleNumber={lectorState.articleNumber}
        onInsertGrounding={(groundingText) => {
          setPrompt((p) => p ? `${p}\n\n${groundingText}` : groundingText);
          switchWorkspaceTab('drafting');
        }}
      />
    </div>
  );
};

export default LegalEngineering;
