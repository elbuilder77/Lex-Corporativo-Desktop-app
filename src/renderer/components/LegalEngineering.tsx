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
  MessageSquareQuote,
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

type WorkspaceTab = 'estacion' | 'drafting' | 'analysis' | 'consultation';
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
  consultationTopicSuggestions: string[];
}> = {
  mercantil: {
    label: 'Mercantil y corporativo',
    shortLabel: 'Mercantil',
    description: 'Contratos, actas, poderes, pagarés, gobierno societario y convenios comerciales.',
    icon: <Scale size={18} />,
    tone: 'blue',
    activeClass: 'border-blue-300 bg-blue-50 text-blue-950 ring-blue-500/20',
    focusPlaceholder: 'Indica partes, objeto, montos, vigencia, obligaciones y condiciones que debe contener el documento.',
    consultationTopicSuggestions: [
      '¿Qué requisitos exige la LGSM para convocar a asamblea extraordinaria de accionistas?',
      '¿Cuáles son los límites legales para pactar penas convencionales según el Código de Comercio?',
      '¿Qué formalidades requiere el endoso en procuración de un pagaré conforme a la LGTOC?',
      '¿Cómo regular el derecho de preferencia y drag-along en estatutos de una SAPI?',
    ],
  },
  laboral: {
    label: 'Laboral y relaciones de trabajo',
    shortLabel: 'Laboral',
    description: 'Contratos individuales, teletrabajo, confidencialidad, actas y terminación.',
    icon: <BriefcaseBusiness size={18} />,
    tone: 'amber',
    activeClass: 'border-amber-300 bg-amber-50 text-amber-950 ring-amber-500/20',
    focusPlaceholder: 'Indica patrón, persona trabajadora, puesto, salario, jornada, prestaciones, centro de trabajo y modalidad.',
    consultationTopicSuggestions: [
      '¿Cuáles son los requisitos de validez del aviso de rescisión laboral según el Art. 47 LFT?',
      '¿Qué obligaciones patronales aplican para el teletrabajo (home office) en la NOM-037?',
      '¿Cómo estructurar un convenio de terminación voluntaria para evitar nulidad ante el Centro de Conciliación?',
      '¿Cuáles son los límites de la jornada extraordinaria y su remuneración en México?',
    ],
  },
  comercio_exterior: {
    label: 'Comercio exterior y contratos globales',
    shortLabel: 'Comercio exterior',
    description: 'Compraventa internacional, distribución, Incoterms 2020 y coordinación logística.',
    icon: <Globe2 size={18} />,
    tone: 'emerald',
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-950 ring-emerald-500/20',
    focusPlaceholder: 'Indica partes, mercancías, Incoterm, país de origen, entrega, pago, documentos y permisos aplicables.',
    consultationTopicSuggestions: [
      '¿Qué diferencias legales existen entre los Incoterms FOB, CIF y DDP en transmisión de riesgos?',
      '¿Qué cláusulas de resolución de controversias y ley aplicable convienen en contratos transfronterizos?',
      '¿Cuáles son los requisitos de certificación de origen bajo el T-MEC?',
      '¿Cómo mitigar riesgos en contratos de distribución internacional exclusiva?',
    ],
  },
  aduanal: {
    label: 'Aduanal y despacho',
    shortLabel: 'Aduanal',
    description: 'Expedientes de pedimento, valor en aduana, rectificaciones y requerimientos.',
    icon: <ShipWheel size={18} />,
    tone: 'blue',
    activeClass: 'border-slate-300 bg-slate-50 text-slate-950 ring-slate-500/20',
    focusPlaceholder: 'Indica pedimento, régimen, aduana, importador/exportador, mercancía, valor y documentos soporte.',
    consultationTopicSuggestions: [
      '¿Qué supuestos permiten la rectificación de pedimento conforme al Art. 89 de la Ley Aduanera?',
      '¿Cuáles son los elementos que integran los incrementables en la manifestación de valor?',
      '¿Qué causales detonan el embargo precautorio en un PAMA (Art. 150 Ley Aduanera)?',
      '¿Qué documentos integran el expediente electrónico aduanal obligatorio?',
    ],
  },
  fiscal: {
    label: 'Fiscal y patrimonial',
    shortLabel: 'Fiscal',
    description: 'Contratos con estipulaciones fiscales, mutuo, reconocimientos de adeudo y escritos de defensa.',
    icon: <ReceiptText size={18} />,
    tone: 'emerald',
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-950 ring-emerald-500/20',
    focusPlaceholder: 'Indica partes, objeto de la operación, contraprestación, comprobantes (CFDI), retenciones, pagos y obligaciones de cumplimiento.',
    consultationTopicSuggestions: [
      '¿Qué requisitos debe reunir un contrato de mutuo para acreditar fecha cierta y origen de fondos?',
      '¿Cuáles son los elementos de estricta indispensabilidad del gasto conforme al Art. 27 LISR?',
      '¿Qué formalidades requiere un escrito de aclaración ante requerimiento de autoridad en términos del CFF?',
      '¿Cómo pactar adecuadamente las obligaciones de retención de IVA e ISR en servicios profesionales?',
    ],
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
    text: 'text-mercantil',
    border: 'border-mercantil',
    rail: 'bg-mercantil',
    ring: 'focus:border-mercantil focus:ring-mercantil/15',
    button: 'bg-mercantil hover:bg-mercantil-dark',
  },
  laboral: {
    text: 'text-amber-700',
    border: 'border-amber-500',
    rail: 'bg-amber-500',
    ring: 'focus:border-amber-500 focus:ring-amber-500/20',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
  comercio_exterior: {
    text: 'text-emerald-700',
    border: 'border-emerald-500',
    rail: 'bg-emerald-600',
    ring: 'focus:border-emerald-500 focus:ring-emerald-500/20',
    button: 'bg-emerald-700 hover:bg-emerald-800',
  },
  aduanal: {
    text: 'text-slate-700',
    border: 'border-slate-700',
    rail: 'bg-slate-700',
    ring: 'focus:border-slate-500 focus:ring-slate-500/20',
    button: 'bg-slate-800 hover:bg-slate-950',
  },
  fiscal: {
    text: 'text-emerald-800',
    border: 'border-emerald-600',
    rail: 'bg-emerald-600',
    ring: 'focus:border-emerald-600 focus:ring-emerald-600/20',
    button: 'bg-emerald-700 hover:bg-emerald-800',
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
    rawTab === 'drafting' || rawTab === 'analysis' || rawTab === 'consultation'
      ? rawTab
      : 'estacion';

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(initialWorkspaceTab);

  const { notify, runtimeHealth, refreshRuntimeHealth, requestProcessingSetup } = useUiStore();
  const canGenerate = useProcessingGuard('legalGeneration', 'generar este documento o consulta');
  const {
    currentCaseId,
    setCurrentCaseId,
    recentCases,
    fetchRecentCases,
    loadCase,
    engineeringDraftState,
    setEngineeringDraftState,
    engineeringDraftingHistory,
    engineeringAnalysisHistory,
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

  // Consultation Tab State
  const [consultationQuery, setConsultationQuery] = useState('');
  const [consultationHistory, setConsultationHistory] = useState<Array<{ role: 'user' | 'model'; text: string; citationsAvailable?: boolean }>>([]);
  const [isConsulting, setIsConsulting] = useState(false);

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
  const consultationEndRef = useRef<HTMLDivElement>(null);
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
    if (rawTab && (rawTab === 'estacion' || rawTab === 'analysis' || rawTab === 'consultation' || rawTab === 'drafting') && rawTab !== workspaceTab) {
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

  // Puente Directo: Análisis ➔ Redactor Contractual
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

  const handleOpenTemplateDirectly = (template: DraftingTemplate) => {
    setSelectedTemplate(template);
    const fullBody = getFullTemplateBody(template);
    setGeneratedDoc(fullBody);
    setDocumentViewMode('letterhead');
    notify(`Machote "${template.title}" cargado en el editor. Puedes modificarlo o exportarlo directamente sin IA.`, 'success', 'Plantilla Lista');
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

  // Consultation Handler
  const handleSendConsultation = async (queryText: string) => {
    const textToSend = queryText.trim();
    if (!textToSend || isConsulting) return;
    if (!canGenerate()) return;

    const newHistory = [...consultationHistory, { role: 'user' as const, text: textToSend }];
    setConsultationHistory(newHistory);
    setConsultationQuery('');
    setIsConsulting(true);

    try {
      const response = await window.lexDesktop.assistant.askFiscal({
        query: textToSend,
        module: area,
        history: consultationHistory.slice(-8).map((m) => ({ role: m.role, text: m.text })),
      });
      setConsultationHistory((prev) => [
        ...prev,
        { role: 'model', text: response.result, citationsAvailable: response.citationsAvailable },
      ]);
      if (!response.citationsAvailable) {
        notify('Respuesta emitida con abstención debido a falta de fundamento oficial recuperado.', 'warning', 'Dictamen RAG');
      }
    } catch (error: any) {
      setConsultationHistory((prev) => [
        ...prev,
        { role: 'model', text: 'No se pudo procesar la consulta jurídica. Verifica que BYOK esté habilitado y que el corpus local esté disponible.' },
      ]);
      notify(error?.message || 'Error en consulta jurídica', 'error');
    } finally {
      setIsConsulting(false);
      setTimeout(() => consultationEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // Guide Assistant Handler (for Estación Hub)
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

  // Split risks by severity for Semáforo
  const highRisks = useMemo(() => analysisResult?.risks?.filter((r) => r.severity === 'high') || [], [analysisResult]);
  const mediumRisks = useMemo(() => analysisResult?.risks?.filter((r) => r.severity === 'medium') || [], [analysisResult]);
  const lowRisks = useMemo(() => analysisResult?.risks?.filter((r) => r.severity === 'low') || [], [analysisResult]);

  const hubActions = [
    {
      title: 'Redactar documento',
      description: 'Contratos de servicios, trabajo, pagarés, compraventa, arrendamiento y acuerdos.',
      icon: FileSignature,
      iconBg: 'bg-blue-50 text-blue-700',
      action: () => switchWorkspaceTab('drafting'),
    },
    {
      title: 'Revisar documento',
      description: 'Sube un contrato o archivo para detectar riesgos, omisiones y cláusulas faltantes.',
      icon: ShieldAlert,
      iconBg: 'bg-rose-50 text-rose-700',
      action: () => switchWorkspaceTab('analysis'),
    },
    {
      title: 'Consultas con leyes',
      description: 'Preguntas y respuestas fundamentadas con artículos de leyes mexicanas oficiales.',
      icon: BookOpen,
      iconBg: 'bg-amber-50 text-amber-700',
      action: () => switchWorkspaceTab('consultation'),
    },
    {
      title: 'Buscador normativo',
      description: 'Búsqueda directa de artículos en el Código de Comercio, LFT, Ley Aduanera y CFF.',
      icon: Search,
      iconBg: 'bg-emerald-50 text-emerald-700',
      action: () => navigate('/buscador'),
    },
    {
      title: 'Documentos guardados',
      description: 'Tus contratos, borradores y revisiones almacenados de forma local y privada.',
      icon: FolderOpen,
      iconBg: 'bg-slate-100 text-slate-700',
      action: () => navigate('/portafolio'),
    },
  ];

  return (
    <div className="relative h-full overflow-y-auto bg-slate-50 text-slate-800">
      <div className={cn('pointer-events-none sticky left-0 top-0 z-20 h-1 w-full', areaTheme.rail)} />
      <div className="mx-auto w-full max-w-7xl px-5 pb-12 pt-6 md:px-8">
        
        {/* Header Principal de la Suite */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white p-5 rounded-2xl shadow-xs window-drag-region">
          <div className="flex items-center gap-3">
            <img src={logoMarkUrl} alt="Lex Corporativo" className="h-9 w-9 rounded-lg object-contain window-no-drag" />
            <div>
              <h1 className="text-base font-bold text-slate-950">Ingeniería Jurídica</h1>
              <p className="text-xs text-slate-500">Lex Corporativo</p>
            </div>
          </div>
          <div className="flex items-center gap-2 window-no-drag">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <History size={14} /> Guardados ({visibleHistory.length})
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings?tab=ia')}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <CircleDot size={13} className={byokActive ? 'text-emerald-600' : 'text-amber-600'} />
              {processingLabel}
              <Settings2 size={13} className="text-slate-400" />
            </button>
          </div>
        </header>

        {/* Pestañas Principales: Estación (Carátula) + 3 Modos de Trabajo */}
        <nav className="mt-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3" aria-label="Navegación de Ingeniería Jurídica">
          <button
            type="button"
            onClick={() => switchWorkspaceTab('estacion')}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold transition shadow-xs',
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
              'inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold transition shadow-xs',
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
              'inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold transition shadow-xs',
              workspaceTab === 'analysis'
                ? 'bg-slate-950 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            <ShieldAlert size={15} />
            Auditoría de Riesgos
          </button>
          <button
            type="button"
            onClick={() => switchWorkspaceTab('consultation')}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold transition shadow-xs',
              workspaceTab === 'consultation'
                ? 'bg-slate-950 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            <BookOpen size={15} />
            Dictamen & Consultas RAG
          </button>
        </nav>

        {/* Historial Flotante */}
        {showHistory && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" aria-label="Historial de documentos">
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
                    className="flex w-full items-center justify-between gap-4 py-2 text-left hover:text-slate-950 transition"
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
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <main className="space-y-6">
              {/* Opciones directas */}
              <section className="grid gap-3 sm:grid-cols-2">
                {hubActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={item.action}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-slate-300 hover:shadow-sm"
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
                        <span>Abrir</span>
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
                      className="text-xs font-semibold text-slate-600 hover:text-slate-950"
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
                        className="group flex w-full items-center justify-between py-2.5 text-left hover:text-slate-950 transition"
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
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 transition"
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
                        <span>Conecta una API en Configuración para usar la guía.</span>
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
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white disabled:opacity-30 shadow-xs"
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
        {/* MODOS DE TRABAJO (DRAFTING, ANALYSIS, CONSULTATION)                       */}
        {/* ========================================================================= */}
        {workspaceTab !== 'estacion' && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Materia jurídica</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
                      'rounded-xl border p-3 text-left transition focus:outline-hidden',
                      active ? `${content.activeClass} ring-2 shadow-xs` : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70',
                    )}
                  >
                    <span className="flex items-center gap-2 text-xs font-bold">
                      {content.icon}
                      {content.shortLabel}
                      {active && <Check size={14} className="ml-auto text-current" />}
                    </span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-600 line-clamp-2">{content.description}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* PESTAÑA: REDACTOR CONTRACTUAL & PLANTILLAS */}
        {workspaceTab === 'drafting' && (
          <div className="mt-5">
            {!generatedDoc ? (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-950">Modalidad de origen</h2>
                    <p className="text-xs text-slate-500">Selecciona si partirás de una plantilla predefinida, un machote propio o un documento previamente auditado.</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => { setSourceMode('template'); setReferenceFile(null); }}
                      className={cn(
                        'flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition shadow-xs',
                        sourceMode === 'template' ? `${areaTheme.border} ${areaTheme.button} text-white` : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <FileText size={16} /> Plantilla jurídica ({templates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSourceMode('reference'); setSelectedTemplate(null); }}
                      className={cn(
                        'flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition shadow-xs',
                        sourceMode === 'reference' ? `${areaTheme.border} ${areaTheme.button} text-white` : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <Upload size={16} /> Documento propio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (analysisFile && !referenceFile) setReferenceFile(analysisFile);
                        setSourceMode('analysis');
                        setSelectedTemplate(null);
                      }}
                      className={cn(
                        'flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition shadow-xs',
                        sourceMode === 'analysis' ? 'border-emerald-600 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <ShieldCheck size={16} className={sourceMode === 'analysis' ? 'text-white' : 'text-emerald-600'} />
                      Documento Auditado {analysisResult ? '✓' : ''}
                    </button>
                  </div>

                  {sourceMode === 'template' ? (
                    <div className="space-y-3">
                      <DraftingTemplatePicker
                        templates={templates}
                        selectedTemplate={selectedTemplate}
                        tone={areaContent.tone}
                        onSelect={selectTemplate}
                        onClear={() => { setSelectedTemplate(null); setPrompt(''); }}
                        onOpenDirectly={handleOpenTemplateDirectly}
                        onExportDirectly={handleExportTemplateDirectly}
                      />
                      {selectedTemplate && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
                          <div className="flex items-center gap-2 text-emerald-950 font-semibold">
                            <Sparkles size={14} className="text-emerald-700" />
                            <span>¿Deseas editar el machote base directamente sin procesar con IA?</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenTemplateDirectly(selectedTemplate)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition cursor-pointer"
                          >
                            <Edit3 size={13} />
                            Abrir y Editar en Documento
                          </button>
                        </div>
                      )}
                    </div>
                  ) : sourceMode === 'analysis' ? (
                    <div className="space-y-3">
                      {(referenceFile || analysisFile) ? (
                        <UniversalDocumentBadge
                          file={(referenceFile || analysisFile)!}
                          area={area}
                          onRemove={() => {
                            setReferenceFile(null);
                            setSourceMode('template');
                          }}
                        />
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center">
                          <ShieldCheck size={28} className="mx-auto mb-2 text-emerald-600" />
                          <p className="text-xs font-bold text-slate-900">Sin archivo físico vinculado a la auditoría</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Las instrucciones correctivas se basarán en el dictamen legal registrado.
                          </p>
                        </div>
                      )}

                      {analysisResult && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                              <ShieldCheck size={16} className="text-emerald-700" />
                              Base fijada desde auditoría previa
                            </span>
                            <span className="rounded-md bg-white border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                              Riesgo inicial: {analysisResult.riskScore}/100
                            </span>
                          </div>
                          <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                            El redactor utilizará las cláusulas del documento original como base y subsanará automáticamente las siguientes contingencias:
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-950">
                              ⚠️ {(analysisResult.missingClauses?.length || 0)} cláusulas omitidas
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-950">
                              🛡️ {(analysisResult.risks?.length || 0)} riesgos a mitigar
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-950">
                              ⚖️ {(analysisResult.legalFoundations?.length || 0)} fundamentos normativos
                            </span>
                          </div>
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
                        'rounded-xl border border-dashed transition-all p-6 text-center',
                        isDraggingDraft
                          ? 'border-blue-500 bg-blue-50/80 ring-4 ring-blue-500/20 scale-[1.01]'
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
                          <Upload size={24} className={cn('mx-auto mb-2 transition-transform', isDraggingDraft ? 'scale-125 text-blue-600 animate-bounce' : 'text-slate-400')} />
                          <p className="text-xs font-bold text-slate-900">
                            {isDraggingDraft ? '¡Suelta el documento aquí!' : 'Sube o arrastra el documento base, machote o factura'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">PDF, Word (.docx), CFDI/XML, TXT o MD · hasta 20 MB</p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={cn('mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-bold text-white transition shadow-xs cursor-pointer', areaTheme.button)}
                          >
                            <Upload size={14} /> Seleccionar archivo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Formulario de Instrucciones / Variables */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 lg:sticky lg:top-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-950">
                        {sourceMode === 'reference' ? 'Instrucciones de corrección' : sourceMode === 'analysis' ? 'Instrucciones derivadas de auditoría' : 'Variables y cláusulas específicas'}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {sourceMode === 'analysis'
                          ? 'Ajusta los puntos correctivos antes de ensamblar el instrumento formal.'
                          : 'Ingresa las partes, montos, plazos y condiciones a incorporar en el documento.'}
                      </p>
                    </div>
                    <span className="hidden sm:inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-500">
                      Ctrl + Enter para generar
                    </span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        void handleGenerate();
                      }
                    }}
                    rows={13}
                    placeholder={
                      sourceMode === 'reference'
                        ? 'Indica las correcciones de fondo, cláusulas a modificar o adiciones que necesitas (Ctrl + Enter para generar).'
                        : selectedTemplate
                        ? `Completa los datos requeridos para ${selectedTemplate.title}:\n${selectedTemplate.requiredFields.join('\n- ')}`
                        : `${areaContent.focusPlaceholder} (Ctrl + Enter para generar)`
                    }
                    className={cn('w-full resize-y rounded-xl border border-slate-300 bg-slate-50/60 p-3.5 text-xs leading-relaxed text-slate-900 outline-hidden transition placeholder:text-slate-400 focus:bg-white focus:ring-2', areaTheme.ring)}
                  />
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || (sourceMode === 'analysis' && !analysisResult && !referenceFile && !analysisFile)}
                    className={cn('inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-6 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 shadow-xs cursor-pointer', areaTheme.button)}
                  >
                    {isGenerating ? (
                      <><Loader2 size={16} className="animate-spin" /> Redactando documento con IA...</>
                    ) : sourceMode === 'analysis' ? (
                      <><FileSignature size={16} /> Generar Adenda / Documento Corregido</>
                    ) : (
                      <><FileSignature size={16} /> Generar documento legal</>
                    )}
                  </button>
                </section>
              </div>
            ) : (
              <main className="mt-2 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-bold uppercase tracking-wider', areaTheme.text)}>
                        Documento legal generado
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {areaContent.shortLabel}
                      </span>
                    </div>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-950 mt-1">
                      {sourceMode === 'analysis'
                        ? `Adenda / Documento Corregido (${(referenceFile || analysisFile)?.name || 'Instrumento'})`
                        : selectedTemplate?.title || referenceFile?.name || 'Instrumento jurídico'}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Switcher Button */}
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setDocumentViewMode('letterhead')}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                          documentViewMode === 'letterhead'
                            ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                        title="Vista Documento Formal (Hoja Membretada)"
                      >
                        <FileText size={13} />
                        <span>Formal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocumentViewMode('edit')}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                          documentViewMode === 'edit'
                            ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                        title="Editar texto y cláusulas del documento en vivo"
                      >
                        <Edit3 size={13} />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocumentViewMode('raw')}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                          documentViewMode === 'raw'
                            ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                        title="Vista Código / Markdown Plano"
                      >
                        <Code2 size={13} />
                        <span>Texto</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={async () => { await navigator.clipboard.writeText(generatedDoc); notify('Documento copiado al portapapeles.', 'success'); }}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold hover:bg-slate-50 transition text-slate-700 shadow-xs cursor-pointer"
                    >
                      <Clipboard size={14} /> Copiar texto
                    </button>
                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={isExporting}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold hover:bg-slate-50 transition text-slate-700 shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleExportDocx}
                      disabled={isExporting}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-900 px-3.5 text-xs font-bold hover:bg-blue-100 transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Word (.docx)
                    </button>
                    <button
                      type="button"
                      onClick={resetDocument}
                      className={cn('inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-bold text-white transition shadow-xs cursor-pointer', areaTheme.button)}
                    >
                      <RefreshCw size={14} /> Nuevo
                    </button>
                  </div>
                </div>

                {/* Hoja Membretada vs Editor Directo vs Texto Plano */}
                {documentViewMode === 'letterhead' ? (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-100/70 p-4 sm:p-8">
                    <article className="legal-letterhead mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 sm:p-14 shadow-lg">
                      {/* Cabecera institucional de la hoja membretada */}
                      <header className="border-b-2 border-slate-900 pb-6 mb-8 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img src={logoMarkUrl} alt="Lex Corporativo" className="h-10 w-10 object-contain" />
                          <div>
                            <span className="font-serif text-sm font-bold tracking-wider text-slate-900 uppercase">
                              LEX CORPORATIVO
                            </span>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                              ESTACIÓN DE INTELIGENCIA JURÍDICA
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block rounded-md bg-slate-900 text-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">
                            {areaContent.label}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">
                            {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      </header>

                      {/* Cuerpo del documento con ReactMarkdown enriquecido */}
                      <div className="prose-legal">
                        <ReactMarkdown>{generatedDoc}</ReactMarkdown>
                      </div>

                      {/* Pie de página institucional */}
                      <footer className="mt-14 pt-6 border-t border-slate-200 text-center flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 font-medium">
                        <span>Documento generado con Inteligencia Jurídica y anclaje normativo local</span>
                        <span className="font-mono">FOLIO: {analysisId || 'DOC-LOCAL'} · LEX CORP</span>
                      </footer>
                    </article>
                  </div>
                ) : documentViewMode === 'edit' ? (
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span className="font-bold text-slate-800">
                        Editor de Instrumento Jurídico (edita el texto y reemplaza los corchetes [ ]):
                      </span>
                      <span>{generatedDoc.length} caracteres</span>
                    </div>
                    <textarea
                      value={generatedDoc}
                      onChange={(e) => setGeneratedDoc(e.target.value)}
                      rows={26}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-4 font-mono text-xs leading-relaxed text-slate-900 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Escribe o personaliza el contenido del documento..."
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      * Todos los cambios que realices se actualizan en tiempo real para la vista formal membretada y las descargas en PDF y Word (.docx).
                    </p>
                  </article>
                ) : (
                  <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto">
                      {generatedDoc}
                    </pre>
                  </article>
                )}
              </main>
            )}
          </div>
        )}

        {/* PESTAÑA: AUDITORÍA DOCUMENTAL & RIESGOS */}
        {workspaceTab === 'analysis' && (
          <div className="mt-5 space-y-6">
            {!analysisResult ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 max-w-3xl mx-auto">
                <div>
                  <h2 className="text-base font-bold text-slate-950">Auditoría y Detección de Riesgos Contractuales</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sube un contrato o instrumento legal para auditar riesgos críticos, cláusulas faltantes y cotejo normativo oficial.
                  </p>
                </div>

                {/* Selector Multidisciplinario de Materias para la Auditoría */}
                <div className="space-y-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Materias de Enfoque Normativo ({analysisAreas.length} seleccionada{analysisAreas.length > 1 ? 's' : ''})
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
                      ? 'border-blue-500 bg-blue-50/80 ring-4 ring-blue-500/20 scale-[1.01]'
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
                      <ShieldAlert size={32} className={cn('mx-auto mb-2 transition-transform', isDraggingAnalysis ? 'scale-125 text-blue-600 animate-bounce' : 'text-slate-400')} />
                      <p className="text-sm font-bold text-slate-900">
                        {isDraggingAnalysis ? '¡Suelta el documento legal aquí!' : 'Carga o arrastra el contrato, factura o instrumento a auditar'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Formatos compatibles: PDF, Word (.docx), CFDI/XML, TXT o MD (hasta 20 MB)</p>
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
                  <label className="mb-1 block text-xs font-bold text-slate-700">Enfoque específico de auditoría (opcional)</label>
                  <textarea
                    value={analysisPrompt}
                    onChange={(e) => setAnalysisPrompt(e.target.value)}
                    rows={3}
                    placeholder="Ej: auditar estipulaciones de rescisión, validez de penas convencionales, facultades del apoderado y omisión de cláusulas de jurisdicción."
                    className={cn('w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-900 outline-hidden transition placeholder:text-slate-400 focus:ring-2', areaTheme.ring)}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAnalyzeDocument}
                  disabled={isAnalyzing || !analysisFile}
                  className={cn('inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-6 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 shadow-xs cursor-pointer', areaTheme.button)}
                >
                  {isAnalyzing ? <><Loader2 size={16} className="animate-spin" /> {analysisProgress || 'Procesando auditoría...'}</> : <><SearchCheck size={16} /> Iniciar auditoría de riesgos</>}
                </button>

                {isAnalyzing && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs space-y-1 text-slate-700">
                    <div className="flex items-center gap-2 font-bold text-blue-950">
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                      <span>{analysisProgress || 'Analizando documento y cotejando corpus legal local...'}</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Extrayendo cláusulas, consultando índices normativos en LanceDB y clasificando riesgos con IA BYOK.
                    </p>
                  </div>
                )}
              </section>
            ) : (
              /* RESULTADO DE LA AUDITORÍA DE RIESGOS - REDISEÑADO */
              <div className="space-y-6">
                {/* Cabecera Principal de Auditoría */}
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
                        <span className="rounded-md bg-purple-700 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
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
                      <FileSignature size={15} /> Generar Adenda / Cláusula Correctiva
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

                {/* Scorecard y Métricas Clave de la Auditoría */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Score de Riesgo */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nivel de Riesgo</span>
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

                  {/* Riesgos Críticos / Altos */}
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
                    <p className="text-[11px] text-rose-800 font-medium">Requieren subsanación obligatoria</p>
                  </button>

                  {/* Riesgos Medios */}
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
                    <p className="text-[11px] text-amber-800 font-medium">Generan contingencia o duda legal</p>
                  </button>

                  {/* Cláusulas Faltantes */}
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
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Omisiones y Faltantes</span>
                      <FileSignature size={16} className="text-blue-600" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-blue-950">
                      {(analysisResult.missingClauses?.length || 0) + (analysisResult.missingData?.length || 0)}
                    </div>
                    <p className="text-[11px] text-blue-800 font-medium">Cláusulas o datos indispensables</p>
                  </button>
                </div>

                {/* Resumen Ejecutivo del Dictamen */}
                {analysisResult.summary && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Scale size={16} className={areaTheme.text} />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Dictamen Jurídico Ejecutivo
                        </h3>
                      </div>
                      {analysisResult.detectedParties && analysisResult.detectedParties.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <User size={13} className="text-slate-400" />
                          <span>Partes: {analysisResult.detectedParties.join(' · ')}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">
                      {analysisResult.summary}
                    </p>
                  </section>
                )}

                {/* Filtros Segmentados de Hallazgos */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setAuditFilter('all')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-xs',
                      auditFilter === 'all'
                        ? 'bg-slate-950 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <ListFilter size={13} />
                    <span>Todos los hallazgos ({(analysisResult.risks?.length || 0) + (analysisResult.missingClauses?.length || 0) + (analysisResult.missingData?.length || 0) + (analysisResult.legalFoundations?.length || 0)})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditFilter('high')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-xs',
                      auditFilter === 'high'
                        ? 'bg-rose-700 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span>🔴 Críticos ({highRisks.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditFilter('medium')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-xs',
                      auditFilter === 'medium'
                        ? 'bg-amber-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span>🟡 Medios ({mediumRisks.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditFilter('missing')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-xs',
                      auditFilter === 'missing'
                        ? 'bg-blue-700 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span>⚠️ Cláusulas Faltantes ({(analysisResult.missingClauses?.length || 0) + (analysisResult.missingData?.length || 0)})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditFilter('foundations')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-xs',
                      auditFilter === 'foundations'
                        ? 'bg-emerald-700 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span>⚖️ Leyes & Fundamentos ({analysisResult.legalFoundations?.length || 0})</span>
                  </button>
                  {analysisResult.recommendedActions && analysisResult.recommendedActions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAuditFilter('actions')}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-xs',
                        auditFilter === 'actions'
                          ? 'bg-purple-700 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <span>🎯 Plan de Acción ({analysisResult.recommendedActions.length})</span>
                    </button>
                  )}
                </div>

                {/* Listado Armónico de Hallazgos */}
                <div className="space-y-4">
                  {/* Riesgos Altos */}
                  {(auditFilter === 'all' || auditFilter === 'high') && highRisks.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                        <ShieldAlert size={14} /> Riesgos Altos y Contingencias Críticas ({highRisks.length})
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {highRisks.map((risk, index) => (
                          <div key={`high-${index}`} className="rounded-2xl border border-rose-200 bg-white p-4.5 shadow-xs space-y-2.5 hover:shadow-sm transition">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 mt-0.5">
                                  <ShieldAlert size={15} />
                                </span>
                                <div>
                                  <h4 className="font-bold text-xs text-slate-900">{risk.title}</h4>
                                  <span className="mt-0.5 inline-block rounded-md bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                                    Severidad Alta
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs leading-relaxed text-slate-700 pl-9.5">{risk.explanation}</p>
                            {risk.relatedClauses && risk.relatedClauses.length > 0 && (
                              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-600">Cláusulas vinculadas:</span>
                                {risk.relatedClauses.map((cl, i) => (
                                  <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                    {cl}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Riesgos Medios */}
                  {(auditFilter === 'all' || auditFilter === 'medium') && mediumRisks.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                        <AlertTriangle size={14} /> Riesgos Medios y Ambigüedades ({mediumRisks.length})
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {mediumRisks.map((risk, index) => (
                          <div key={`med-${index}`} className="rounded-2xl border border-amber-200 bg-white p-4.5 shadow-xs space-y-2.5 hover:shadow-sm transition">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 mt-0.5">
                                  <AlertTriangle size={15} />
                                </span>
                                <div>
                                  <h4 className="font-bold text-xs text-slate-900">{risk.title}</h4>
                                  <span className="mt-0.5 inline-block rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                                    Severidad Media
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs leading-relaxed text-slate-700 pl-9.5">{risk.explanation}</p>
                            {risk.relatedClauses && risk.relatedClauses.length > 0 && (
                              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-600">Cláusulas vinculadas:</span>
                                {risk.relatedClauses.map((cl, i) => (
                                  <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                    {cl}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Riesgos Bajos */}
                  {(auditFilter === 'all' || auditFilter === 'low') && lowRisks.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <CheckSquare size={14} /> Observaciones de Mejora ({lowRisks.length})
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {lowRisks.map((risk, index) => (
                          <div key={`low-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs space-y-2 hover:shadow-sm transition">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase">
                                Mejora
                              </span>
                              <h4 className="font-bold text-xs text-slate-900">{risk.title}</h4>
                            </div>
                            <p className="text-xs leading-relaxed text-slate-600">{risk.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Cláusulas y Requisitos Faltantes */}
                  {(auditFilter === 'all' || auditFilter === 'missing') && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                        <FileSignature size={14} /> Cláusulas y Requisitos Faltantes Obligatorios ({(analysisResult.missingClauses?.length || 0) + (analysisResult.missingData?.length || 0)})
                      </h3>
                      {(analysisResult.missingClauses?.length || 0) + (analysisResult.missingData?.length || 0) === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
                          El instrumento cuenta con el clausulado estructural mínimo.
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {analysisResult.missingClauses?.map((clause, index) => (
                            <div key={`mc-${index}`} className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 shadow-xs flex items-start gap-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold mt-0.5">
                                •
                              </span>
                              <div>
                                <h4 className="font-bold text-xs text-blue-950">Cláusula Omitida</h4>
                                <p className="text-xs text-blue-900 mt-0.5 leading-relaxed font-medium">{clause}</p>
                              </div>
                            </div>
                          ))}
                          {analysisResult.missingData?.map((data, index) => (
                            <div key={`md-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-xs flex items-start gap-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-xs font-bold mt-0.5">
                                i
                              </span>
                              <div>
                                <h4 className="font-bold text-xs text-slate-900">Requisito de dato omitido</h4>
                                <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{data}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {/* Fundamentos Normativos */}
                  {(auditFilter === 'all' || auditFilter === 'foundations') && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                        <Scale size={14} /> Referencias Normativas Aplicables ({analysisResult.legalFoundations?.length || 0})
                      </h3>
                      {(!analysisResult.legalFoundations || analysisResult.legalFoundations.length === 0) ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
                          Correlaciones normativas generales aplicadas en el dictamen.
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {analysisResult.legalFoundations.map((found, idx) => (
                            <div key={`found-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-1.5 hover:border-slate-300 transition">
                              <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                                <span className="flex items-center gap-1.5">
                                  <Scale size={14} className="text-emerald-600" />
                                  {found.law} {found.article ? `· ${found.article}` : ''}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                                  DOF OFICIAL
                                </span>
                              </div>
                              {found.excerpt && (
                                <p className="text-xs text-slate-600 italic leading-relaxed pl-5 border-l-2 border-slate-200">
                                  "{found.excerpt}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {/* Plan de Acción */}
                  {(auditFilter === 'all' || auditFilter === 'actions') && analysisResult.recommendedActions && analysisResult.recommendedActions.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                        <Sparkles size={14} /> Acciones y Pasos Correctivos Recomendados ({analysisResult.recommendedActions.length})
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {analysisResult.recommendedActions.map((action, i) => (
                          <div key={`act-${i}`} className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-4 shadow-xs flex items-start gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-200 text-purple-800 text-xs font-bold mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-xs text-purple-950 font-medium leading-relaxed">{action}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: DICTAMEN & CONSULTAS JURÍDICAS RAG */}
        {workspaceTab === 'consultation' && (
          <div className="mt-5 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">Dictamen & Consultas Normativas con RAG Local</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formula consultas técnicas en materia <strong>{areaContent.label}</strong>. Las respuestas se anclan estrictamente en el corpus legal oficial instalado (LanceDB).
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Consultas frecuentes sugeridas</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {areaContent.consultationTopicSuggestions.map((topic, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendConsultation(topic)}
                      disabled={isConsulting}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-left text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-100 transition focus:outline-hidden disabled:opacity-50"
                    >
                      <Sparkles size={13} className="inline mr-1.5 text-legal-gold" />
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 min-h-64 max-h-[480px] overflow-y-auto space-y-4">
                {consultationHistory.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <MessageSquareQuote size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold text-slate-600">No hay consultas activas en esta sesión.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Escribe una duda jurídica o selecciona una de las sugerencias para iniciar el dictamen.</p>
                  </div>
                ) : (
                  consultationHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={cn(
                        'rounded-2xl p-4 text-xs leading-relaxed max-w-4xl',
                        msg.role === 'user'
                          ? 'ml-auto bg-slate-900 text-white'
                          : 'mr-auto bg-white border border-slate-200 text-slate-800 shadow-xs space-y-2'
                      )}
                    >
                      {msg.role === 'model' && (
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                          <BookOpen size={14} className={areaTheme.text} />
                          Dictamen Jurídico Fundamentado
                        </div>
                      )}
                      <div className="prose prose-xs max-w-none">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                  ))
                )}
                {isConsulting && (
                  <div className="mr-auto rounded-2xl bg-white border border-slate-200 p-4 text-xs text-slate-600 shadow-xs flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                    <span>Recuperando fundamentos del corpus oficial y redactando dictamen...</span>
                  </div>
                )}
                <div ref={consultationEndRef} />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={consultationQuery}
                  onChange={(e) => setConsultationQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendConsultation(consultationQuery); }}
                  placeholder={`Formula tu consulta jurídica en materia ${areaContent.shortLabel}...`}
                  className={cn('flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs text-slate-900 outline-hidden focus:ring-2', areaTheme.ring)}
                />
                <button
                  type="button"
                  onClick={() => handleSendConsultation(consultationQuery)}
                  disabled={isConsulting || !consultationQuery.trim()}
                  className={cn('inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 shadow-xs', areaTheme.button)}
                >
                  <Send size={15} /> Consultar
                </button>
              </div>
            </section>
          </div>
        )}

      </div>
    </div>
  );
};

export default LegalEngineering;
