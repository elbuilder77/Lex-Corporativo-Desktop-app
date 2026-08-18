import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Clock,
  Download,
  Eye,
  FileSearch,
  FileSignature,
  FileText,
  FolderOpen,
  Layers3,
  Loader2,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useCaseStore } from '../store/useCaseStore';
import { useUiStore } from '../store/useUiStore';
import { generateAnalysisPDF, generateDocumentPDF } from '../lib/pdf-export';
import { generateDocumentDocx } from '../lib/docx-export';
import { BRAND_CONTENT } from '../lib/product-content';

import { cn } from '../lib/utils';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { ConfirmDialog } from './ui/ConfirmDialog';

type ActivityTypeFilter = 'all' | 'drafting' | 'analysis';
type LegalAreaFilter = 'all' | 'mercantil' | 'laboral' | 'comercio_exterior' | 'aduanal' | 'fiscal';

const AREA_BADGES: Record<string, { label: string; class: string }> = {
  mercantil: { label: 'Mercantil', class: 'border-blue-200 bg-blue-50 text-blue-800' },
  laboral: { label: 'Laboral', class: 'border-amber-200 bg-amber-50 text-amber-800' },
  comercio_exterior: { label: 'Comercio Ext.', class: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  aduanal: { label: 'Aduanal', class: 'border-purple-200 bg-purple-50 text-purple-800' },
  fiscal: { label: 'Fiscal', class: 'border-teal-200 bg-teal-50 text-teal-800' },
};

export const Portafolio: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useUiStore();
  const {
    engineeringDraftingHistory,
    engineeringAnalysisHistory,
    currentCaseId,
    removeGeneratedArtifact,
    recentCases,
    fetchRecentCases,
    loadCase,
    setEngineeringDraftState,
  } = useCaseStore();

  const [persistedActivity, setPersistedActivity] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>('all');
  const [areaFilter, setAreaFilter] = useState<LegalAreaFilter>('all');
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [dialogState, confirm] = useConfirmDialog();

  useEffect(() => {
    void fetchRecentCases();
  }, [fetchRecentCases]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!window.lexDesktop?.cases || recentCases.length === 0) {
        setPersistedActivity([]);
        return;
      }
      const groups = await Promise.all(
        recentCases.map(async (item) => {
          try {
            const fullData = await window.lexDesktop.cases.getCase(item.id);
            const drafts = (fullData.drafts || []).map((draft: any) => ({
              ...draft,
              caseId: item.id,
              activityType: 'drafting',
            }));
            const analyses = (fullData.analyses || []).map((analysis: any) => ({
              ...analysis,
              caseId: item.id,
              activityType: 'analysis',
            }));
            return [...drafts, ...analyses];
          } catch {
            return [];
          }
        }),
      );
      if (!cancelled) {
        setPersistedActivity(groups.flat());
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [recentCases]);

  useEffect(() => {
    if (!selectedActivity) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedActivity(null);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [selectedActivity]);

  const allActivity = useMemo(() => {
    const live = [
      ...engineeringDraftingHistory.map((item) => ({ ...item, caseId: currentCaseId, activityType: 'drafting' })),
      ...engineeringAnalysisHistory.map((item) => ({ ...item, caseId: currentCaseId, activityType: 'analysis' })),
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
  }, [currentCaseId, engineeringDraftingHistory, engineeringAnalysisHistory, persistedActivity]);

  const filtered = useMemo(() => {
    return allActivity.filter((item) => {
      const matchType = typeFilter === 'all' || item.activityType === typeFilter;
      const itemArea = item.area || item.ecosystem || 'mercantil';
      const matchArea = areaFilter === 'all' || itemArea === areaFilter;
      return matchType && matchArea;
    });
  }, [allActivity, typeFilter, areaFilter]);

  const documentCount = allActivity.filter((item) => item.activityType === 'drafting').length;
  const analysisCount = allActivity.filter((item) => item.activityType === 'analysis').length;

  const activityKey = (item: any) => `${item.caseId || 'memory'}:${item.activityType}:${item.id || item.requestId || item.timestamp}`;

  const titleFor = (item: any) => {
    if (item.activityType === 'drafting') {
      return item.templateTitle || item.referenceFileName || 'Documento redactado';
    }
    return item.files?.[0]?.name ? `Auditoría · ${item.files[0].name}` : item.result?.documentType || 'Auditoría de riesgos';
  };

  const areaFor = (item: any): string => {
    return item.area || item.ecosystem || 'mercantil';
  };

  const bodyFor = (item: any): string => {
    if (item.activityType === 'drafting') {
      return item.generatedDoc || 'Sin contenido registrado.';
    }
    const result = item.result;
    if (!result) return 'Sin resultados disponibles.';

    const highRisks = result.risks?.filter((r: any) => r.severity === 'high') || [];
    const medRisks = result.risks?.filter((r: any) => r.severity === 'medium') || [];
    const lowRisks = result.risks?.filter((r: any) => r.severity === 'low') || [];

    const lines = [
      `# Informe de Auditoría Jurídica`,
      `**Tipo de documento:** ${result.documentType || 'Contrato'}`,
      `**Evaluación:** ${result.risks?.length || 0} observaciones detectadas`,
      '',
      '## Semáforo de Riesgos',
      highRisks.length ? `### Riesgos Altos / Críticos\n${highRisks.map((r: any) => `- **${r.title}:** ${r.explanation}`).join('\n')}` : '',
      medRisks.length ? `### Riesgos Medios\n${medRisks.map((r: any) => `- **${r.title}:** ${r.explanation}`).join('\n')}` : '',
      lowRisks.length ? `### Mejoras y Recomendaciones\n${lowRisks.map((r: any) => `- **${r.title}:** ${r.explanation}`).join('\n')}` : '',
      '',
      (result.missingClauses?.length || result.missingData?.length)
        ? `## Cláusulas y Requisitos Faltantes\n${[...(result.missingClauses || []), ...(result.missingData || [])].map((m: any) => `- ${m}`).join('\n')}`
        : '',
      '',
      result.legalFoundations?.length
        ? `## Referencias Normativas\n${result.legalFoundations.map((f: any) => `- **${f.law}** ${f.article ? `· ${f.article}` : ''}: ${f.excerpt || ''}`).join('\n')}`
        : '',
    ];
    return lines.filter(Boolean).join('\n');
  };

  const copyItemText = async (item: any) => {
    const text = bodyFor(item);
    try {
      await navigator.clipboard.writeText(text);
      const key = activityKey(item);
      setCopiedKey(key);
      notify('Texto copiado al portapapeles.', 'success');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      notify('No se pudo copiar el texto.', 'error');
    }
  };

  const exportItemPdf = async (item: any) => {
    setIsExportingPdf(true);
    try {
      const area = areaFor(item);
      if (item.activityType === 'drafting') {
        const result = await generateDocumentPDF(
          item.generatedDoc || '',
          BRAND_CONTENT.name,
          `Ingeniería Jurídica · ${AREA_BADGES[area]?.label || area}`,
          `Documento_${area}`,
        );
        if (result.success) notify('Documento exportado en PDF.', 'success');
      } else {
        const result = item.result || {};
        await generateAnalysisPDF({
          title: titleFor(item),
          subtitle: `Auditoría Jurídica · ${AREA_BADGES[area]?.label || area}`,
          riskScore: Number(result.riskScore) || 0,
          summary: result.summary || 'Auditoría documental.',
          pillars: [
            { title: 'FALTANTES', content: (result.missingClauses || []).join('\n') || 'Sin omisiones registradas.' },
            { title: 'REFERENCIAS', content: result.legalFoundations?.map((f: any) => `${f.law} ${f.article || ''}`).join('\n') || 'Sin referencias.' },
          ],
          risks: result.risks?.map((r: any) => `${r.title}: ${r.explanation}`) || [],
          recommendation: result.recommendedActions?.join('\n') || 'Revisar observaciones.',
          moduleName: 'Lex Corporativo · Ingeniería Jurídica',
          filenamePrefix: 'Auditoria_Juridica',
        });
        notify('Informe de auditoría exportado en PDF.', 'success');
      }
    } catch (error: any) {
      notify(error?.message || 'Error al exportar en PDF.', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const exportItemDocx = async (item: any) => {
    setIsExportingPdf(true);
    try {
      const area = areaFor(item);
      const text = item.activityType === 'drafting' ? item.generatedDoc || '' : bodyFor(item);
      const result = await generateDocumentDocx(text, {
        title: titleFor(item),
        subtitle: `Lex Corporativo · ${AREA_BADGES[area]?.label || area}`,
        filenamePrefix: `${item.activityType === 'drafting' ? 'Documento' : 'Auditoria'}_${area}`,
        ecosystem: AREA_BADGES[area]?.label || area,
      });
      if (result.success) notify('Documento exportado en Word (.docx).', 'success');
    } catch (error: any) {
      notify(error?.message || 'Error al exportar a Word.', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };


  const openInDrafting = (item: any) => {
    const area = areaFor(item);
    if (item.activityType === 'drafting') {
      setEngineeringDraftState({
        prompt: item.prompt || '',
        generatedDoc: item.generatedDoc || '',
        area: area as any,
      });
    } else {
      const textToCarry = bodyFor(item);
      setEngineeringDraftState({
        prompt: `Instrucciones derivadas del informe de auditoría:\n\n${textToCarry}`,
        area: area as any,
      });
    }
    navigate('/ingenieria-juridica?tab=drafting');
    notify('Documento abierto en el Redactor Contractual.', 'info');
  };

  const deleteItem = async (item: any) => {
    const artifactId = String(item.id || item.requestId || '');
    const label = item.activityType === 'analysis' ? 'esta auditoría' : 'este documento';
    const accepted = await confirm({
      title: `Eliminar ${item.activityType === 'analysis' ? 'auditoría' : 'documento'}`,
      message: `¿Eliminar ${label}? Se quitará permanentemente del Portafolio local.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!accepted) return;

    const key = activityKey(item);
    setDeletingKey(key);
    try {
      if (item.caseId) {
        if (item.activityType === 'analysis') {
          await window.lexDesktop.cases.deleteAnalysis({
            caseId: item.caseId,
            analysisId: artifactId,
            expectedModule: 'engineering',
          });
        } else {
          await window.lexDesktop.cases.deleteDraft({
            caseId: item.caseId,
            draftId: artifactId,
            expectedModule: 'engineering',
          });
        }
      }
      removeGeneratedArtifact(artifactId, item.activityType, 'engineering', item.generatedDoc);
      setPersistedActivity((current) => current.filter((entry) => activityKey(entry) !== key));
      if (selectedActivity && activityKey(selectedActivity) === key) setSelectedActivity(null);
      notify('Elemento eliminado del Portafolio local.', 'success');
    } catch (error: any) {
      notify(error?.message || 'No se pudo eliminar el elemento.', 'error');
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 text-slate-800">
      <div className="mx-auto w-full max-w-7xl px-5 pb-12 pt-6 md:px-8 space-y-6">
        
        {/* Header con Contadores */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white p-5 rounded-2xl shadow-xs window-drag-region">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 window-no-drag">
              <FolderOpen size={22} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-950">Portafolio de Entregables</h1>
              <p className="text-xs text-slate-500">
                Contratos, borradores e informes de auditoría guardados localmente en tu equipo
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold window-no-drag">
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">
              <strong className="text-slate-950">{allActivity.length}</strong> entregables
            </span>
            <span className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-800">
              <strong className="text-blue-950">{documentCount}</strong> contratos
            </span>
            <span className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-800">
              <strong className="text-rose-950">{analysisCount}</strong> auditorías
            </span>
          </div>
        </header>

        {/* Barra de Filtros Segmentados */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Filtro por Tipo */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-1">Tipo:</span>
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition',
                  typeFilter === 'all'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                Todos ({allActivity.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('drafting')}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition',
                  typeFilter === 'drafting'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                Contratos ({documentCount})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('analysis')}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition',
                  typeFilter === 'analysis'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                Auditorías ({analysisCount})
              </button>
            </div>

            {/* Filtro por Materia */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-1">Materia:</span>
              {(['all', 'mercantil', 'laboral', 'comercio_exterior', 'aduanal', 'fiscal'] as const).map((area) => {
                const active = areaFilter === area;
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setAreaFilter(area)}
                    className={cn(
                      'rounded-xl px-2.5 py-1 text-xs font-bold transition',
                      active
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {area === 'all' ? 'Todas' : AREA_BADGES[area]?.label || area}
                  </button>
                );
              })}
            </div>

          </div>
        </section>

        {/* Grid de Entregables */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs space-y-2">
            <FolderOpen size={32} className="mx-auto text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">No hay entregables que coincidan con los filtros</h2>
            <p className="text-xs text-slate-500">
              Prueba cambiando los filtros o genera un nuevo contrato desde Ingeniería Jurídica.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const key = activityKey(item);
              const isDraft = item.activityType === 'drafting';
              const area = areaFor(item);
              const badge = AREA_BADGES[area] || AREA_BADGES.mercantil;
              const isCopied = copiedKey === key;
              const isDeleting = deletingKey === key;

              return (
                <motion.article
                  key={key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="space-y-3">
                    {/* Header de Tarjeta */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', isDraft ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700')}>
                          {isDraft ? <FileSignature size={16} /> : <ShieldAlert size={16} />}
                        </span>
                        <span className={cn('rounded-lg border px-2 py-0.5 text-[10px] font-bold', badge.class)}>
                          {badge.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Guardado'}
                      </span>
                    </div>

                    {/* Título y Snippet */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-950 line-clamp-1">
                        {titleFor(item)}
                      </h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500 line-clamp-3">
                        {isDraft
                          ? (item.generatedDoc || 'Documento formal redactado.')
                          : (item.result?.summary || 'Auditoría de riesgos y cotejo normativo.')}
                      </p>
                    </div>
                  </div>

                  {/* Acciones de Tarjeta */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedActivity(item)}
                        title="Ver documento completo"
                        className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Eye size={13} />
                        <span>Ver</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyItemText(item)}
                        title="Copiar texto"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                        aria-label="Copiar texto"
                      >
                        {isCopied ? <Check size={13} className="text-emerald-600" /> : <Clipboard size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => exportItemPdf(item)}
                        disabled={isExportingPdf}
                        title="Exportar a PDF"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                        aria-label="Exportar a PDF"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => exportItemDocx(item)}
                        disabled={isExportingPdf}
                        title="Exportar a Word (.docx)"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-200 bg-blue-50/50 text-blue-800 hover:bg-blue-100 transition disabled:opacity-50"
                        aria-label="Exportar a Word (.docx)"
                      >
                        <FileText size={13} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteItem(item)}
                      disabled={isDeleting}
                      title="Eliminar del portafolio"
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-50"
                      aria-label="Eliminar elemento"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

      </div>

      {/* Modal Lector de Detalle Completo */}
      <AnimatePresence>
        {selectedActivity && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="flex h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className={cn('rounded-lg border px-2 py-0.5 text-[10px] font-bold', AREA_BADGES[areaFor(selectedActivity)]?.class || 'bg-slate-100')}>
                    {AREA_BADGES[areaFor(selectedActivity)]?.label || 'General'}
                  </span>
                  <h2 className="text-sm font-bold text-slate-950 truncate max-w-md">
                    {titleFor(selectedActivity)}
                  </h2>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyItemText(selectedActivity)}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Clipboard size={13} /> Copiar
                  </button>
                  <button
                    type="button"
                    onClick={() => exportItemPdf(selectedActivity)}
                    disabled={isExportingPdf}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    <Download size={13} /> PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => exportItemDocx(selectedActivity)}
                    disabled={isExportingPdf}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 px-3 text-xs font-bold hover:bg-blue-100 transition disabled:opacity-50"
                  >
                    <FileText size={13} /> Word (.docx)
                  </button>
                  <button
                    type="button"
                    onClick={() => openInDrafting(selectedActivity)}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs"
                  >
                    <FileSignature size={13} /> Abrir en Redactor
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedActivity(null)}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
                    aria-label="Cerrar vista previa"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Contenido del Documento */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
                <article className="prose prose-xs max-w-none text-slate-800">
                  <ReactMarkdown>{bodyFor(selectedActivity)}</ReactMarkdown>
                </article>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog {...dialogState} />
    </div>
  );
};

export default Portafolio;
