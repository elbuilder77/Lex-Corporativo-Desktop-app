import React, { useState } from 'react';
import { CheckCircle2, Clipboard, Download, FileSignature, FileText, FolderOpen, Link2, Loader2, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  buildDraftingPromptFromTemplate,
  FISCAL_DRAFTING_TEMPLATES,
  type DraftingTemplate,
} from '../lib/constants';
import { ensureModuleActivity } from '../lib/case-access';
import { generateDocumentPDF } from '../lib/pdf-generator';
import { draftLegalDocument } from '../services/ai';
import { useCaseStore } from '../store/useCaseStore';
import { useUiStore } from '../store/useUiStore';
import { DraftingTemplatePicker } from './DraftingTemplatePicker';
import { useNavigate } from 'react-router-dom';

export const FiscalDocumentation: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useUiStore();
  const {
    currentCaseId,
    setCurrentCaseId,
    addFiscalDrafting,
    fiscalDraftState,
    setFiscalDraftState,
    fiscalOperationState,
    completeFiscalOperationStep,
  } = useCaseStore();
  const [selectedTemplate, setSelectedTemplate] = useState<DraftingTemplate | null>(fiscalDraftState.template || null);
  const [prompt, setPrompt] = useState(fiscalDraftState.prompt || '');
  const [generatedDoc, setGeneratedDoc] = useState(fiscalDraftState.generatedDoc || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const selectTemplate = (template: DraftingTemplate) => {
    const nextPrompt = buildDraftingPromptFromTemplate(template);
    setSelectedTemplate(template);
    setPrompt(nextPrompt);
    setFiscalDraftState({ template, prompt: nextPrompt, mode: 'template', generatedDoc: '' });
    setGeneratedDoc('');
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    setPrompt('');
    setGeneratedDoc('');
    setFiscalDraftState({ template: null, prompt: '', generatedDoc: '' });
  };

  const incorporateOperationContext = () => {
    if (!fiscalOperationState.description.trim()) {
      notify('Primero describe la operación en Preparación.', 'warning', 'Sin contexto de operación');
      return;
    }
    if (prompt.includes('CONTEXTO DEL EXPEDIENTE FISCAL')) {
      notify('El contexto del expediente ya está incorporado.', 'info');
      return;
    }
    const context = [
      'CONTEXTO DEL EXPEDIENTE FISCAL',
      fiscalOperationState.description,
      fiscalOperationState.evidenceFiles.length
        ? `Evidencia registrada: ${fiscalOperationState.evidenceFiles.map((file) => file.name).join(', ')}`
        : 'Evidencia registrada: sin archivos asociados.',
      Object.keys(fiscalOperationState.materialityAnswers).length
        ? `Materialidad: ${Object.entries(fiscalOperationState.materialityAnswers).map(([key, value]) => `${key}: ${value}`).join('; ')}`
        : '',
      Object.keys(fiscalOperationState.deductibilityAnswers).length
        ? `Deducibilidad e IVA: ${Object.entries(fiscalOperationState.deductibilityAnswers).map(([key, value]) => `${key}: ${value}`).join('; ')}`
        : '',
    ].filter(Boolean).join('\n');
    const nextPrompt = `${prompt.trim()}\n\n${context}`.trim();
    setPrompt(nextPrompt);
    setFiscalDraftState({ prompt: nextPrompt });
    notify('Contexto del expediente incorporado a las instrucciones.', 'success');
  };

  const generate = async () => {
    if (!selectedTemplate) {
      notify('Selecciona una plantilla fiscal.', 'warning', 'Documentación fiscal');
      return;
    }
    if (!prompt.trim()) {
      notify('Completa los datos e instrucciones del documento.', 'warning', 'Documentación fiscal');
      return;
    }
    setIsGenerating(true);
    try {
      const caseId = await ensureModuleActivity('fiscal', currentCaseId);
      setCurrentCaseId(caseId);
      const response = await draftLegalDocument(
        prompt,
        'fiscal',
        {
          id: selectedTemplate.id,
          title: selectedTemplate.title,
          prompt: selectedTemplate.prompt,
          requiredFields: selectedTemplate.requiredFields,
          output: selectedTemplate.output,
        },
        undefined,
        undefined,
      );
      setGeneratedDoc(response.result);
      setFiscalDraftState({ generatedDoc: response.result, prompt, template: selectedTemplate, mode: 'template' });
      addFiscalDrafting({
        id: response.requestId,
        requestId: response.requestId,
        timestamp: new Date().toISOString(),
        prompt,
        area: 'fiscal',
        ecosystem: 'fiscal',
        promptProfile: response.promptProfile,
        templateId: selectedTemplate.id,
        templateTitle: selectedTemplate.title,
        generatedDoc: response.result,
        executionMode: response.requestedExecutionMode,
        engine: response.engine,
      });
      completeFiscalOperationStep('documentation');
      notify('Documento fiscal preparado y guardado localmente.', 'success', 'Documentación fiscal');
    } catch (error: any) {
      notify(error?.message || 'No se pudo generar el documento fiscal.', 'error', 'Documentación fiscal');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportPdf = async () => {
    if (!generatedDoc) return;
    setIsExporting(true);
    try {
      await generateDocumentPDF(generatedDoc, 'Lex Corporativo · Fiscal', selectedTemplate?.title || 'Documento fiscal', 'Documento_Fiscal');
      notify('Documento fiscal exportado en PDF.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo exportar el documento.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50/60 px-5 py-7 md:px-8">
      <div className="mx-auto max-w-6xl">
        {!generatedDoc ? (
          <>
            <header className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-fiscal/10 text-fiscal"><FileSignature size={24} strokeWidth={1.8} /></div>
              <div><h2 className="text-2xl font-bold text-slate-950">Documentación Fiscal</h2><p className="mt-1 max-w-3xl text-sm text-slate-600">Genera el soporte de la operación y conserva el resultado dentro del mismo expediente.</p></div>
            </header>

            <main className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <DraftingTemplatePicker templates={FISCAL_DRAFTING_TEMPLATES} selectedTemplate={selectedTemplate} tone="emerald" onSelect={selectTemplate} onClear={clearTemplate} />
              </section>
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fiscal/10 text-fiscal"><FileText size={19} /></span>
                  <div><h3 className="font-bold text-slate-900">Datos e instrucciones</h3><p className="text-xs text-slate-500">Completa los campos sin borrar la estructura base.</p></div>
                </div>
                {fiscalOperationState.description && (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0"><p className="text-xs font-bold text-emerald-900">Contexto disponible del expediente</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-emerald-800">{fiscalOperationState.description}</p></div>
                      <button type="button" onClick={incorporateOperationContext} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100"><Link2 size={14} /> Incorporar</button>
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-emerald-700">El contexto se añadirá a la solicitud y seguirá el modo de procesamiento configurado.</p>
                  </div>
                )}
                <textarea
                  value={prompt}
                  onChange={(event) => { setPrompt(event.target.value); setFiscalDraftState({ prompt: event.target.value }); }}
                  rows={18}
                  placeholder="Selecciona una plantilla para comenzar…"
                  className="mt-5 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800 outline-none focus:border-fiscal focus:ring-4 focus:ring-fiscal/10"
                />
                <button type="button" onClick={() => void generate()} disabled={isGenerating || !selectedTemplate || !prompt.trim()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-fiscal px-6 text-sm font-bold text-white hover:bg-fiscal-light disabled:cursor-not-allowed disabled:opacity-40">
                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <FileSignature size={18} />}
                  {isGenerating ? 'Preparando documento' : 'Generar documento fiscal'}
                </button>
              </section>
            </main>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={17} /> Documento preparado</p><h2 className="mt-1 font-serif text-2xl font-bold text-slate-950">{selectedTemplate?.title || 'Documento fiscal'}</h2></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(generatedDoc); notify('Documento copiado.', 'success'); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"><Clipboard size={16} /> Copiar</button>
                <button type="button" onClick={() => void exportPdf()} disabled={isExporting} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">{isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Exportar PDF</button>
                <button type="button" onClick={() => { setGeneratedDoc(''); setFiscalDraftState({ generatedDoc: '' }); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-fiscal px-4 text-sm font-semibold text-white hover:bg-fiscal-light"><RotateCcw size={16} /> Editar datos</button>
                <button type="button" onClick={() => navigate('/portafolio')} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"><FolderOpen size={16} /> Ver expediente</button>
              </div>
            </div>
            <article className="prose prose-slate mt-6 max-w-none rounded-3xl border border-slate-200 bg-white px-8 py-9 shadow-sm"><ReactMarkdown>{generatedDoc}</ReactMarkdown></article>
          </>
        )}
      </div>
    </div>
  );
};

export default FiscalDocumentation;
