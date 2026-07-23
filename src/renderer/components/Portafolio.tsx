import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Clock, Download, FileSearch, FileSignature, FolderOpen, Layers3, Loader2, Plus, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useCaseStore } from '../store/useCaseStore';
import { useUiStore } from '../store/useUiStore';
import { generateDocumentPDF } from '../lib/pdf-generator';
import { BRAND_CONTENT } from '../lib/product-content';
import { cn } from '../lib/utils';

type ActivityFilter = 'all' | 'drafting' | 'analysis';

function normalizeModule(module?: string): 'engineering' | 'fiscal' {
  return module === 'fiscal' ? 'fiscal' : 'engineering';
}

export const Portafolio: React.FC = () => {
  const navigate = useNavigate();
  const { notify, setActiveTab } = useUiStore();
  const {
    engineeringDraftingHistory,
    fiscalAnalysisHistory,
    fiscalDraftingHistory,
    currentCaseId,
    removeGeneratedArtifact,
    recentCases,
    fetchRecentCases,
    isLoadingCases,
    loadCase,
  } = useCaseStore();
  const [persistedActivity, setPersistedActivity] = useState<any[]>([]);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  useEffect(() => { fetchRecentCases(); }, [fetchRecentCases]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!window.lexDesktop?.cases || recentCases.length === 0) {
        setPersistedActivity([]);
        return;
      }
      setIsLoadingActivity(true);
      const groups = await Promise.all(recentCases.map(async (item) => {
        try {
          const fullData = await window.lexDesktop.cases.getCase(item.id);
          const module = normalizeModule(fullData.metadata?.module || item.module);
          const drafts = (fullData.drafts || []).map((draft: any) => ({
            ...draft,
            caseId: item.id,
            module,
            activityType: 'drafting',
          }));
          const analyses = module === 'fiscal'
            ? (fullData.analyses || []).map((analysis: any) => ({ ...analysis, caseId: item.id, module, activityType: 'analysis' }))
            : [];
          return [...drafts, ...analyses];
        } catch {
          return [];
        }
      }));
      if (!cancelled) {
        setPersistedActivity(groups.flat());
        setIsLoadingActivity(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [recentCases]);

  useEffect(() => {
    if (!selectedActivity) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedActivity(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [selectedActivity]);

  const allActivity = useMemo(() => {
    const live = [
      ...engineeringDraftingHistory.map((item) => ({ ...item, caseId: currentCaseId, module: 'engineering', activityType: 'drafting' })),
      ...fiscalDraftingHistory.map((item) => ({ ...item, caseId: currentCaseId, module: 'fiscal', activityType: 'drafting' })),
      ...fiscalAnalysisHistory.map((item) => ({ ...item, caseId: currentCaseId, module: 'fiscal', activityType: 'analysis' })),
    ];
    const seen = new Set<string>();
    return [...live, ...persistedActivity]
      .filter((item) => {
        const key = `${item.caseId || 'memory'}:${item.activityType}:${item.id || item.requestId || item.timestamp}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [currentCaseId, engineeringDraftingHistory, fiscalAnalysisHistory, fiscalDraftingHistory, persistedActivity]);

  const filtered = allActivity.filter((item) => filter === 'all' || item.activityType === filter);
  const documentCount = allActivity.filter((item) => item.activityType === 'drafting').length;
  const reviewCount = allActivity.filter((item) => item.activityType === 'analysis').length;

  const resumeCase = async (savedCase: typeof recentCases[number]) => {
    await loadCase(savedCase);
    if (savedCase.module === 'fiscal') {
      setActiveTab('fiscal-consultation');
      navigate('/fiscal');
    } else {
      setActiveTab('drafting');
      navigate('/ingenieria-juridica');
    }
  };

  const titleFor = (item: any) => item.activityType === 'drafting'
    ? item.templateTitle || item.referenceFileName || 'Documento jurídico'
    : item.files?.[0]?.name ? `Revisión fiscal · ${item.files[0].name}` : 'Revisión fiscal';

  const bodyFor = (item: any) => {
    if (item.activityType === 'drafting') return item.generatedDoc || 'Sin contenido disponible.';
    const result = item.result;
    if (!result) return 'Sin resultados disponibles.';
    return [
      `## Resumen\n${result.summary || 'Sin resumen.'}`,
      result.missingData?.length ? `## Evidencia pendiente\n${result.missingData.map((entry: string) => `- ${entry}`).join('\n')}` : '',
      result.recommendedActions?.length ? `## Siguientes acciones\n${result.recommendedActions.map((entry: string) => `- ${entry}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');
  };

  const exportSelected = async () => {
    if (!selectedActivity || selectedActivity.activityType !== 'drafting') return;
    setIsExportingPdf(true);
    try {
      const area = selectedActivity.area || 'mercantil';
      const result = await generateDocumentPDF(bodyFor(selectedActivity), BRAND_CONTENT.name, `Ingeniería Jurídica · ${area}`, `Documento_${area}`);
      if (result.success) notify('Documento exportado en PDF.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo exportar el documento.', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const activityKey = (item: any) => `${item.caseId || 'memory'}:${item.activityType}:${item.id || item.requestId || item.timestamp}`;

  const deleteActivity = async (item: any) => {
    const artifactId = String(item.id || item.requestId || '');
    if (!artifactId) {
      notify('No se pudo identificar el archivo generado.', 'error');
      return;
    }
    const label = item.activityType === 'analysis' ? 'esta revisión fiscal' : 'este documento generado';
    if (!window.confirm(`¿Eliminar ${label}? Se quitará permanentemente del Portafolio local.`)) return;

    const key = activityKey(item);
    setDeletingKey(key);
    try {
      if (item.caseId) {
        if (item.activityType === 'analysis') {
          await window.lexDesktop.cases.deleteAnalysis({
            caseId: item.caseId,
            analysisId: artifactId,
            expectedModule: 'fiscal',
          });
        } else {
          await window.lexDesktop.cases.deleteDraft({
            caseId: item.caseId,
            draftId: artifactId,
            expectedModule: item.module === 'fiscal' ? 'fiscal' : 'engineering',
          });
        }
      }
      removeGeneratedArtifact(artifactId, item.activityType, item.module === 'fiscal' ? 'fiscal' : 'engineering', item.generatedDoc);
      setPersistedActivity((current) => current.filter((entry) => activityKey(entry) !== key));
      if (selectedActivity && activityKey(selectedActivity) === key) setSelectedActivity(null);
      notify(item.activityType === 'analysis' ? 'Revisión eliminada del Portafolio.' : 'Documento eliminado del Portafolio.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo eliminar el archivo generado.', 'error');
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-amber-700"><FolderOpen size={22} /></span>
            <div><h1 className="font-serif text-2xl font-bold text-slate-950">Portafolio local</h1><p className="mt-0.5 text-sm text-slate-500">Asuntos, documentos y revisiones guardados en este equipo.</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setActiveTab('drafting'); navigate('/ingenieria-juridica'); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100"><FileSignature size={16} /> Nuevo documento</button>
            <button type="button" onClick={() => { setActiveTab('fiscal-preparation'); navigate('/fiscal'); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800"><Plus size={16} /> Nueva operación fiscal</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 md:px-8">
        <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumen del portafolio">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Layers3 size={17} /></span><strong className="mt-3 block text-2xl font-black text-slate-950">{recentCases.length}</strong><span className="text-xs font-semibold text-slate-500">Asuntos locales</span></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><FileSignature size={17} /></span><strong className="mt-3 block text-2xl font-black text-slate-950">{documentCount}</strong><span className="text-xs font-semibold text-slate-500">Documentos generados</span></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><FileSearch size={17} /></span><strong className="mt-3 block text-2xl font-black text-slate-950">{reviewCount}</strong><span className="text-xs font-semibold text-slate-500">Revisiones fiscales</span></div>
        </section>

        {recentCases.length > 0 && (
          <section className="mt-8" aria-labelledby="portfolio-cases-title">
            <div className="flex items-end justify-between gap-4"><div><h2 id="portfolio-cases-title" className="text-sm font-bold text-slate-900">Asuntos recientes</h2><p className="mt-1 text-xs text-slate-500">Abre el asunto para recuperar su contexto y continuar el flujo.</p></div></div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recentCases.slice(0, 6).map((savedCase) => {
                const itemCount = allActivity.filter((item) => item.caseId === savedCase.id).length;
                const fiscal = savedCase.module === 'fiscal';
                return (
                  <button key={savedCase.id} type="button" onClick={() => void resumeCase(savedCase)} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md">
                    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', fiscal ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{fiscal ? <BriefcaseBusiness size={19} /> : <FileSignature size={19} />}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{savedCase.name}</span><span className="mt-1 block text-[11px] text-slate-500">{fiscal ? 'Fiscal' : 'Ingeniería Jurídica'} · {itemCount} {itemCount === 1 ? 'entregable' : 'entregables'}</span></span>
                    <ArrowRight size={16} className="text-slate-400 transition group-hover:translate-x-1" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-8" aria-labelledby="portfolio-activity-title">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div><h2 id="portfolio-activity-title" className="text-sm font-bold text-slate-900">Entregables y revisiones</h2><div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {([['all', 'Todo'], ['drafting', 'Documentos'], ['analysis', 'Revisiones fiscales']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={cn('rounded-md px-3 py-2 text-sm font-semibold transition', filter === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>{label}</button>
            ))}
          </div></div>
          <p className="text-sm text-slate-500">{filtered.length} {filtered.length === 1 ? 'actividad' : 'actividades'}</p>
        </div>

        {(isLoadingCases || isLoadingActivity) && allActivity.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500" role="status"><Loader2 size={24} className="animate-spin" /><p className="text-sm font-semibold">Cargando portafolio...</p></div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
            <FolderOpen size={32} className="text-slate-300" />
            <h2 className="mt-4 text-lg font-bold text-slate-950">{allActivity.length ? 'No hay resultados en este filtro' : 'Tu portafolio está vacío'}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{allActivity.length ? 'Selecciona otro tipo de actividad.' : 'Inicia una operación fiscal o un documento desde las acciones superiores; el asunto aparecerá aquí al guardarse.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {filtered.map((item, index) => (
              <motion.div key={`${item.caseId || 'memory'}:${item.activityType}:${item.id || index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center transition hover:bg-slate-50">
                <button type="button" onClick={() => setSelectedActivity(item)} className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4 text-left">
                  <span className={cn('rounded-lg p-2.5', item.activityType === 'drafting' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{item.activityType === 'drafting' ? <FileSignature size={20} /> : <FileSearch size={20} />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{titleFor(item)}</span><span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Clock size={12} />{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Sin fecha'}</span></span>
                  <span className="text-xs font-semibold text-slate-500">{item.activityType === 'drafting' ? (item.area || 'Documento') : 'Fiscal'}</span>
                </button>
                <button type="button" onClick={() => void deleteActivity(item)} disabled={deletingKey === activityKey(item)} className="mr-4 rounded-lg p-2.5 text-slate-400 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-40" aria-label={`Eliminar ${titleFor(item)}`} title="Eliminar del Portafolio">
                  {deletingKey === activityKey(item) ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
                </button>
              </motion.div>
            ))}
          </div>
        )}
        </section>
      </main>

      <AnimatePresence>
        {selectedActivity && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setSelectedActivity(null)}>
            <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 15, opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="portfolio-detail-title" onClick={(event) => event.stopPropagation()} className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><div><h2 id="portfolio-detail-title" className="text-lg font-bold text-slate-950">{titleFor(selectedActivity)}</h2><p className="mt-1 text-xs text-slate-500">Guardado localmente</p></div><button type="button" onClick={() => setSelectedActivity(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button></header>
              <div className="flex-1 overflow-y-auto px-7 py-6"><div className="prose prose-slate max-w-none prose-sm"><ReactMarkdown>{bodyFor(selectedActivity)}</ReactMarkdown></div></div>
              <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4"><button type="button" onClick={() => void deleteActivity(selectedActivity)} disabled={deletingKey === activityKey(selectedActivity)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">{deletingKey === activityKey(selectedActivity) ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Eliminar</button>{selectedActivity.activityType === 'drafting' && <button type="button" onClick={exportSelected} disabled={isExportingPdf} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold hover:bg-slate-100 disabled:opacity-50">{isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Exportar PDF</button>}<button type="button" onClick={() => setSelectedActivity(null)} className="min-h-10 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white">Cerrar</button></footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Portafolio;
