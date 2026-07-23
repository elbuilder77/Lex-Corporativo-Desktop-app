import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clipboard,
  Download,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Scale,
  Upload,
  X,
} from 'lucide-react';
import { draftLegalDocument, type LegalDraftingArea, type UserReferenceFile } from '../services/ai';
import {
  LEGAL_ENGINEERING_TEMPLATES,
  type DraftingTemplate,
  type LegalEngineeringArea,
} from '../lib/constants';
import { DraftingTemplatePicker } from './DraftingTemplatePicker';
import { ensureModuleActivity } from '../lib/case-access';
import { generateDocumentPDF } from '../lib/pdf-generator';
import { BRAND_CONTENT } from '../lib/product-content';
import { useCaseStore } from '../store/useCaseStore';
import { useUiStore } from '../store/useUiStore';
import { cn } from '../lib/utils';

type SourceMode = 'template' | 'reference';

const ENGINEERING_AREAS: LegalEngineeringArea[] = ['mercantil'];

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
    description: 'Contratos, actas, poderes, pagarés y convenios comerciales.',
    icon: <Scale size={19} />,
    tone: 'blue',
    activeClass: 'border-blue-300 bg-blue-50 text-blue-950 ring-blue-500/20',
    focusPlaceholder: 'Indica las partes, objeto, montos, vigencia, obligaciones y condiciones que debe contener el documento.',
  },
};

function normalizeEngineeringArea(_area?: LegalDraftingArea): LegalEngineeringArea {
  return 'mercantil';
}

const ACCEPTED_REFERENCE_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];
const MAX_REFERENCE_BYTES = 15 * 1024 * 1024;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve(value.includes(',') ? value.split(',')[1] : value);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });
}

export const LegalEngineering: React.FC = () => {
  const { notify } = useUiStore();
  const {
    currentCaseId,
    setCurrentCaseId,
    engineeringDraftState,
    setEngineeringDraftState,
    engineeringDraftingHistory,
    addEngineeringDrafting,
  } = useCaseStore();

  const canRestoreEngineeringDraft = engineeringDraftState.area !== 'fiscal';
  const initialArea = normalizeEngineeringArea(engineeringDraftState.area);
  const initialTemplate = canRestoreEngineeringDraft && LEGAL_ENGINEERING_TEMPLATES[initialArea].some((template) => template.id === engineeringDraftState.template?.id)
    ? engineeringDraftState.template
    : null;
  const [sourceMode, setSourceMode] = useState<SourceMode>(canRestoreEngineeringDraft ? engineeringDraftState.mode : 'template');
  const [area, setArea] = useState<LegalEngineeringArea>(initialArea);
  const [prompt, setPrompt] = useState(canRestoreEngineeringDraft ? engineeringDraftState.prompt : '');
  const [selectedTemplate, setSelectedTemplate] = useState<DraftingTemplate | null>(initialTemplate);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState(canRestoreEngineeringDraft ? engineeringDraftState.generatedDoc : '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templates = useMemo(() => LEGAL_ENGINEERING_TEMPLATES[area], [area]);
  const visibleHistory = useMemo(
    () => engineeringDraftingHistory.filter((item) => (!item.area || item.area === 'mercantil') && item.ecosystem !== 'fiscal' && item.promptProfile !== 'fiscal_drafting'),
    [engineeringDraftingHistory],
  );
  const areaContent = AREA_CONTENT[area];
  const areaTheme = {
    text: 'text-mercantil',
    border: 'border-mercantil',
    rail: 'bg-mercantil',
    ring: 'focus:border-mercantil focus:ring-mercantil/15',
    button: 'bg-mercantil hover:bg-mercantil-dark',
  };

  useEffect(() => {
    setEngineeringDraftState({
      prompt,
      mode: sourceMode,
      generatedDoc,
      template: selectedTemplate,
      area,
      referenceFileName: referenceFile?.name,
    });
  }, [area, generatedDoc, prompt, referenceFile?.name, selectedTemplate, setEngineeringDraftState, sourceMode]);

  const changeArea = (nextArea: LegalEngineeringArea) => {
    setArea(nextArea);
    setSelectedTemplate(null);
    setReferenceFile(null);
    setPrompt('');
    setGeneratedDoc('');
  };

  const selectTemplate = (template: DraftingTemplate) => {
    setSelectedTemplate(template);
    if (selectedTemplate?.id !== template.id) setPrompt('');
  };

  const applyReferenceFile = (file?: File) => {
    if (!file) return;
    const normalizedMime = file.name.toLowerCase().endsWith('.md') ? 'text/markdown' : file.type;
    if (!ACCEPTED_REFERENCE_TYPES.includes(normalizedMime)) {
      notify('El archivo debe ser PDF, TXT o Markdown.', 'warning', 'Formato no compatible');
      return;
    }
    if (file.size > MAX_REFERENCE_BYTES) {
      notify('El archivo debe pesar 15 MB o menos.', 'warning', 'Archivo demasiado grande');
      return;
    }
    setReferenceFile(file);
    setSelectedTemplate(null);
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
    if (!prompt.trim()) {
      notify(sourceMode === 'reference' ? 'Describe las correcciones o cambios que necesitas.' : 'Completa los datos e instrucciones del documento.', 'warning', 'Faltan instrucciones');
      return;
    }
    setIsGenerating(true);
    try {
      const targetCaseId = await ensureModuleActivity('engineering', currentCaseId);
      setCurrentCaseId(targetCaseId);

      let userReference: UserReferenceFile | undefined;
      if (referenceFile) {
        const mimeType = referenceFile.name.toLowerCase().endsWith('.md')
          ? 'text/markdown'
          : referenceFile.type as UserReferenceFile['mimeType'];
        userReference = {
          name: referenceFile.name,
          mimeType,
          base64: await readFileAsBase64(referenceFile),
        };
      }

      const templatePayload = selectedTemplate ? {
        id: selectedTemplate.id,
        title: selectedTemplate.title,
        prompt: selectedTemplate.prompt,
        requiredFields: selectedTemplate.requiredFields,
        output: selectedTemplate.output,
      } : undefined;

      const response = await draftLegalDocument(prompt, area, templatePayload, undefined, userReference);
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
        templateTitle: selectedTemplate?.title,
        referenceFileName: referenceFile?.name,
        generatedDoc: response.result,
        executionMode: response.requestedExecutionMode,
        engine: response.engine,
      });
      const providerLabel = response.provider === 'openai' ? 'OpenAI' : response.provider === 'anthropic' ? 'Claude' : 'Gemini';
      notify(`Documento preparado con ${response.engine === 'byok' ? `${providerLabel} BYOK` : 'el motor local'}.`, 'success', 'Ingeniería Jurídica');
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
      const result = await generateDocumentPDF(
        generatedDoc,
        BRAND_CONTENT.name,
        `Ingeniería Jurídica · ${areaContent.shortLabel}`,
        `Documento_${areaContent.shortLabel}`,
      );
      if (result.success) notify('Documento exportado en PDF.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo exportar el documento.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const resetDocument = () => {
    setGeneratedDoc('');
    setPrompt('');
    setSelectedTemplate(null);
    setReferenceFile(null);
  };

  return (
    <div className="relative h-full overflow-y-auto bg-white text-slate-800">
      <div className={cn('pointer-events-none sticky left-0 top-0 z-20 h-1 w-full', areaTheme.rail)} />
      <div className="mx-auto w-full max-w-7xl px-5 pb-10 pt-6 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="max-w-2xl">
            <div className={cn('mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]', areaTheme.text)}>
              <FileText size={15} />
              Ingeniería Jurídica
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-slate-950">Documentos y contratos</h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Redacta contratos e instrumentos mercantiles desde una plantilla o un archivo existente, con fundamento local verificable.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory((value) => !value)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <History size={16} /> Historial ({visibleHistory.length})
          </button>
        </header>

        {showHistory && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5" aria-label="Historial de documentos">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-950">Documentos recientes</h2>
              <button type="button" onClick={() => setShowHistory(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar historial"><X size={17} /></button>
            </div>
            {visibleHistory.length === 0 ? (
              <p className="text-sm text-slate-500">Todavía no has generado documentos.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setGeneratedDoc(item.generatedDoc || ''); setPrompt(item.prompt); setArea(normalizeEngineeringArea(item.area)); setShowHistory(false); }}
                    className="flex w-full items-center justify-between gap-4 py-3 text-left hover:text-slate-950"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.templateTitle || item.referenceFileName || 'Documento personalizado'}</span>
                      <span className="mt-1 block text-xs text-slate-500">{AREA_CONTENT[normalizeEngineeringArea(item.area)].shortLabel} · {new Date(item.timestamp).toLocaleDateString()}</span>
                    </span>
                    <FileText size={16} className="shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {!generatedDoc ? (
          <main className="mt-5 space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-950">Área del documento</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Elige el contexto jurídico del documento.</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
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
                        'rounded-lg border bg-white px-4 py-3 text-left transition focus:outline-none focus:ring-2',
                        active ? `${content.activeClass} ring-2` : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-bold">{content.icon}{content.label}{active && <Check size={15} className="ml-auto" />}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-600">{content.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-slate-950">Punto de partida</h2>
                <p className="mt-0.5 text-xs text-slate-500">Selecciona una estructura o carga un documento para editarlo.</p>
              </div>
              <div className="mb-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => { setSourceMode('template'); setReferenceFile(null); }} className={cn('flex min-h-11 items-center gap-2 rounded-lg border px-3 text-left text-sm font-bold transition', sourceMode === 'template' ? `${areaTheme.border} ${areaTheme.button} text-white` : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}>
                  <FileText size={17} />
                  Plantilla
                </button>
                <button type="button" onClick={() => { setSourceMode('reference'); setSelectedTemplate(null); setPrompt(''); }} className={cn('flex min-h-11 items-center gap-2 rounded-lg border px-3 text-left text-sm font-bold transition', sourceMode === 'reference' ? `${areaTheme.border} ${areaTheme.button} text-white` : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}>
                  <Upload size={17} />
                  Documento propio
                </button>
              </div>

              {sourceMode === 'template' ? (
                <DraftingTemplatePicker templates={templates} selectedTemplate={selectedTemplate} tone={areaContent.tone} onSelect={selectTemplate} onClear={() => { setSelectedTemplate(null); setPrompt(''); }} />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
                  <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" className="hidden" onChange={(event) => { applyReferenceFile(event.target.files?.[0]); event.target.value = ''; }} />
                  {referenceFile ? (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="rounded-lg bg-slate-100 p-2 text-slate-600"><FileText size={20} /></span>
                        <span className="min-w-0"><span className="block truncate text-sm font-semibold">{referenceFile.name}</span><span className="text-xs text-slate-500">{(referenceFile.size / 1024 / 1024).toFixed(1)} MB · listo para corrección</span></span>
                      </div>
                      <button type="button" onClick={() => setReferenceFile(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Quitar archivo"><X size={18} /></button>
                    </div>
                  ) : (
                    <div className="flex min-h-52 w-full flex-col items-center justify-center rounded-lg px-4 text-center text-slate-600">
                      <Upload size={28} className="mb-3 text-slate-400" />
                      <span className="text-sm font-bold text-slate-900">Sube el documento que quieres corregir o editar</span>
                      <span className="mt-1 text-sm text-slate-500">PDF, TXT o Markdown · máximo 15 MB</span>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className={cn('mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-5 text-sm font-bold text-white transition', areaTheme.button)}>
                        <Upload size={16} /> Subir archivo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-5">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-slate-950">{sourceMode === 'reference' ? 'Cambios solicitados' : 'Datos e instrucciones'}</h2>
                <p className="mt-0.5 text-xs text-slate-500">Incluye la información necesaria para producir un documento revisable.</p>
              </div>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={13}
                placeholder={sourceMode === 'reference'
                  ? 'Indica las correcciones de redacción, ortografía, estructura, cláusulas o formato que necesitas. Señala también qué contenido debe conservarse sin cambios.'
                  : selectedTemplate
                  ? `Completa los datos para ${selectedTemplate.title}: ${selectedTemplate.requiredFields.join(', ')}.`
                  : areaContent.focusPlaceholder}
                className={cn('w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2', areaTheme.ring)}
              />
              <div className="mt-3">
                <button type="button" onClick={handleGenerate} disabled={isGenerating} className={cn('inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50', areaTheme.button)}>
                  {isGenerating ? <><Loader2 size={17} className="animate-spin" /> {sourceMode === 'reference' ? 'Corrigiendo documento' : 'Preparando documento'}</> : <><FileText size={17} /> {sourceMode === 'reference' ? 'Corregir documento' : 'Generar documento'}</>}
                </button>
              </div>
            </section>
            </div>
          </main>
        ) : (
          <main className="mt-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className={cn('text-sm font-semibold', areaTheme.text)}>Documento preparado</p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-slate-950">{selectedTemplate?.title || referenceFile?.name || 'Documento jurídico'}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(generatedDoc); notify('Documento copiado.', 'success'); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-100"><Clipboard size={16} /> Copiar</button>
                <button type="button" onClick={handleExport} disabled={isExporting} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50">{isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Exportar PDF</button>
                <button type="button" onClick={resetDocument} className={cn('inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white', areaTheme.button)}><RefreshCw size={16} /> Nuevo documento</button>
              </div>
            </div>
            <article className="rounded-xl border border-slate-200 bg-white px-7 py-8 shadow-sm">
              <pre className="whitespace-pre-wrap font-sans text-[15px] leading-7 text-slate-800">{generatedDoc}</pre>
            </article>
          </main>
        )}
      </div>
    </div>
  );
};

export default LegalEngineering;
