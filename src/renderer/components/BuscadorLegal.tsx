import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Database,
  FileSearch,
  FileSignature,
  Globe2,
  Loader2,
  ReceiptText,
  Scale,
  Search,
  ShipWheel,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useUiStore } from '../store/useUiStore';
import { useCaseStore } from '../store/useCaseStore';
import { suggestAlternativeLegalModule } from '../lib/legal-search-routing';

type LegalSubjectArea = 'mercantil' | 'laboral' | 'comercio_exterior' | 'aduanal' | 'fiscal';
type LegalSearchArea = 'todos' | LegalSubjectArea;

interface LegalSearchResult {
  id: string | number;
  title?: string;
  subtitle?: string;
  content?: string;
  similarity?: number;
  law_code?: string;
  article_number?: string;
  module?: LegalSubjectArea;
}

interface SearchAreaConfig {
  id: LegalSearchArea;
  label: string;
  shortLabel: string;
  lawsIncluded: string;
  description: string;
  icon: React.ReactNode;
  activeClass: string;
  badgeClass: string;
  railClass: string;
  buttonClass: string;
  ringClass: string;
  examples: Array<{ label: string; query: string }>;
}

const SEARCH_AREAS: SearchAreaConfig[] = [
  {
    id: 'todos',
    label: 'Todos los artículos',
    shortLabel: 'Todos',
    lawsIncluded: '16 ordenamientos · 7,348 disposiciones',
    description: 'Búsqueda transversal en todo el corpus oficial instalado.',
    icon: <Database size={16} />,
    activeClass: 'border-slate-700 bg-slate-100 text-slate-950 ring-2 ring-slate-700/20',
    badgeClass: 'border-slate-300 bg-slate-100 text-slate-800',
    railClass: 'bg-slate-800',
    buttonClass: 'bg-slate-900 hover:bg-slate-950 text-white',
    ringClass: 'focus:border-slate-700 focus:ring-slate-700/15',
    examples: [
      { label: 'Trabajo del hogar', query: 'prestaciones trabajadores hogar' },
      { label: 'Requisitos del pagaré', query: 'requisitos pagaré LGTOC' },
      { label: 'Acreditamiento del IVA', query: 'acreditamiento IVA' },
      { label: 'Rectificación de pedimento', query: 'rectificación datos pedimento' },
    ],
  },
  {
    id: 'mercantil',
    label: 'Mercantil y Corporativo',
    shortLabel: 'Mercantil',
    lawsIncluded: 'Código de Comercio, LGSM, LGTOC',
    description: 'Actos de comercio, sociedades mercantiles, títulos de crédito y asambleas.',
    icon: <Scale size={16} />,
    activeClass: 'border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-600/20',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-800',
    railClass: 'bg-blue-600',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    ringClass: 'focus:border-blue-600 focus:ring-blue-600/15',
    examples: [
      { label: 'Art. 75 CCOM (Actos de comercio)', query: 'actos comercio artículo 75' },
      { label: 'Art. 6 LGSM (Estatutos sociales)', query: 'escritura constitutiva LGSM' },
      { label: 'Art. 170 LGTOC (Requisitos pagaré)', query: 'requisitos pagaré LGTOC' },
      { label: 'Art. 78 CCOM (Libertad contractual)', query: 'libertad contractual mercantil' },
    ],
  },
  {
    id: 'laboral',
    label: 'Laboral y Empleo',
    shortLabel: 'Laboral',
    lawsIncluded: 'Ley Federal del Trabajo (LFT)',
    description: 'Relaciones de trabajo, contratos individuales, jornadas, salarios y rescisión.',
    icon: <BriefcaseBusiness size={16} />,
    activeClass: 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
    railClass: 'bg-amber-500',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    ringClass: 'focus:border-amber-500 focus:ring-amber-500/15',
    examples: [
      { label: 'Art. 20 LFT (Relación de trabajo)', query: 'relación individual trabajo' },
      { label: 'Art. 25 LFT (Contenido del contrato)', query: 'contenido contrato laboral' },
      { label: 'Art. 47 LFT (Causas de rescisión)', query: 'rescisión sin responsabilidad patronal' },
      { label: 'Art. 334 Bis LFT (Trabajo del hogar)', query: 'prestaciones trabajadores hogar' },
    ],
  },
  {
    id: 'comercio_exterior',
    label: 'Comercio Exterior',
    shortLabel: 'Comercio Exterior',
    lawsIncluded: 'Ley de Comercio Exterior, RLCE',
    description: 'Regulaciones no arancelarias, cuotas compensatorias, permisos y prácticas desleales.',
    icon: <Globe2 size={16} />,
    activeClass: 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    railClass: 'bg-emerald-600',
    buttonClass: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    ringClass: 'focus:border-emerald-600 focus:ring-emerald-600/15',
    examples: [
      { label: 'Art. 4 LCE (Facultades del Ejecutivo)', query: 'facultades comercio exterior' },
      { label: 'Art. 15 LCE (Medidas no arancelarias)', query: 'restricciones no arancelarias' },
      { label: 'Art. 28 LCE (Prácticas desleales)', query: 'prácticas desleales comercio' },
      { label: 'Certificados de origen', query: 'certificados origen comercio exterior' },
    ],
  },
  {
    id: 'aduanal',
    label: 'Aduanal y Despacho',
    shortLabel: 'Aduanal',
    lawsIncluded: 'Ley Aduanera, RLA, LIGIE, RGCE 2026',
    description: 'Pedimentos, despacho, régimen aduanero, valor en aduana, PAMA y aranceles.',
    icon: <ShipWheel size={16} />,
    activeClass: 'border-purple-600 bg-purple-50 text-purple-950 ring-2 ring-purple-600/20',
    badgeClass: 'border-purple-200 bg-purple-50 text-purple-800',
    railClass: 'bg-purple-600',
    buttonClass: 'bg-purple-700 hover:bg-purple-800 text-white',
    ringClass: 'focus:border-purple-600 focus:ring-purple-600/15',
    examples: [
      { label: 'Art. 36 Ley Aduanera (Pedimento)', query: 'documentos pedimento aduanal' },
      { label: 'Art. 59 Ley Aduanera (Control inventarios)', query: 'control inventarios importadores' },
      { label: 'Art. 89 Ley Aduanera (Rectificación)', query: 'rectificación datos pedimento' },
      { label: 'Art. 150 Ley Aduanera (PAMA)', query: 'embargo precautorio PAMA' },
    ],
  },
  {
    id: 'fiscal',
    label: 'Fiscal y SAT',
    shortLabel: 'Fiscal',
    lawsIncluded: 'Código Fiscal de la Federación (CFF), LISR, LIVA',
    description: 'Comprobantes fiscales (CFDI), deducciones, retenciones, visitas y aclaraciones.',
    icon: <ReceiptText size={16} />,
    activeClass: 'border-teal-600 bg-teal-50 text-teal-950 ring-2 ring-teal-600/20',
    badgeClass: 'border-teal-200 bg-teal-50 text-teal-800',
    railClass: 'bg-teal-600',
    buttonClass: 'bg-teal-700 hover:bg-teal-800 text-white',
    ringClass: 'focus:border-teal-600 focus:ring-teal-600/15',
    examples: [
      { label: 'Art. 27 LISR (Requisitos deducciones)', query: 'deducciones autorizadas LISR' },
      { label: 'Art. 29-A CFF (Requisitos CFDI)', query: 'requisitos CFDI CFF' },
      { label: 'Art. 69-B CFF (Operaciones inexistentes)', query: 'operaciones inexistentes 69-B' },
      { label: 'Art. 5 LIVA (Acreditamiento del IVA)', query: 'acreditamiento IVA LIVA' },
    ],
  },
];

export const BuscadorLegal: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useUiStore();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<LegalSearchResult[] | null>(null);
  const [summary, setSummary] = useState('');
  const [expandedArticles, setExpandedArticles] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedArea, setSelectedArea] = useState<LegalSearchArea>('todos');
  const [pendingRouting, setPendingRouting] = useState<{ query: string; suggestedArea: LegalSearchArea } | null>(null);

  const currentArea = SEARCH_AREAS.find((a) => a.id === selectedArea) || SEARCH_AREAS[0];

  const runSearch = async (
    searchValue = query,
    options: { skipRouting?: boolean; area?: LegalSearchArea } = {},
  ) => {
    const normalizedQuery = searchValue.trim();
    if (!normalizedQuery) return;
    const searchArea = options.area || selectedArea;
    const suggestedArea = searchArea === 'todos'
      ? null
      : suggestAlternativeLegalModule(normalizedQuery, searchArea);
    if (!options.skipRouting && suggestedArea) {
      setQuery(normalizedQuery);
      setPendingRouting({ query: normalizedQuery, suggestedArea });
      return;
    }

    const areaConfig = SEARCH_AREAS.find((item) => item.id === searchArea) || SEARCH_AREAS[0];

    setQuery(normalizedQuery);
    setSelectedArea(searchArea);
    setPendingRouting(null);
    setIsSearching(true);
    setResults(null);
    setSummary('');
    setExpandedArticles(new Set());

    try {
      if (!window.lexDesktop?.legalKnowledge) {
        throw new Error('El motor de búsqueda jurídica local no está disponible.');
      }
      const ragResponse = await window.lexDesktop.legalKnowledge.searchRAG({
        query: normalizedQuery,
        module: searchArea,
        limit: 8,
        useReranker: true,
      });
      const citations = (ragResponse.citations || []) as LegalSearchResult[];
      setResults(citations);
      if (citations.length > 0) {
        setSummary(`Se recuperaron ${citations.length} artículos del corpus oficial de ${areaConfig.label}.`);
      } else {
        setSummary(`No se encontraron disposiciones suficientemente relacionadas en ${areaConfig.label}. Prueba con sujeto + tema o cambia de materia.`);
      }
    } catch (error: any) {
      notify(error?.message || 'Error al buscar en el corpus legal local.', 'error');
      setResults([]);
      setSummary('No se pudo completar la búsqueda en los textos normativos.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyCitation = async (result: LegalSearchResult, index: number) => {
    const citation = `${result.law_code || result.title || 'Normativa'} · ${result.article_number || result.subtitle || 'Disposición'}\n\n"${result.content || ''}"`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopiedIndex(index);
      notify('Artículo y cita copiados al portapapeles.', 'success');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      notify('No se pudo copiar el texto.', 'error');
    }
  };

  const handleCarryToDrafting = (result: LegalSearchResult) => {
    const heading = `${result.law_code || result.title || 'Disposición legal'} ${result.article_number ? `(${result.article_number})` : ''}`;
    const textToCarry = `FUNDAMENTO LEGAL A CONSIDERAR EN EL CLAUSULADO:\n${heading}\n"${result.content || ''}"`;

    const currentPrompt = useCaseStore.getState().engineeringDraftState.prompt || '';
    const newPrompt = currentPrompt ? `${currentPrompt}\n\n${textToCarry}` : textToCarry;

    const draftingArea: LegalSubjectArea = result.module
      || (selectedArea === 'todos' ? 'mercantil' : selectedArea);
    const draftingAreaConfig = SEARCH_AREAS.find(item => item.id === draftingArea) || SEARCH_AREAS[1];

    useCaseStore.getState().setEngineeringDraftState({
      prompt: newPrompt,
      area: draftingArea,
    });

    notify(`Artículo transferido al Redactor Contractual en materia ${draftingAreaConfig.shortLabel}.`, 'info');
    navigate('/ingenieria-juridica?tab=drafting');
  };

  return (
    <div className="relative h-full overflow-y-auto bg-slate-50 text-slate-800">
      <div className={cn('pointer-events-none sticky left-0 top-0 z-20 h-1 w-full', currentArea.railClass)} />
      
      <div className="mx-auto w-full max-w-7xl px-5 pb-12 pt-6 md:px-8 space-y-6">
        
        {/* Header del Buscador */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white p-5 rounded-2xl shadow-xs window-drag-region">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-xl border p-2.5 window-no-drag', currentArea.badgeClass)}>
              <FileSearch size={22} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-950">Buscador Normativo Oficial</h1>
              <p className="text-xs text-slate-500">
                Consulta artículos oficiales de leyes federales mexicanas indexadas en tu computadora
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 window-no-drag">
            <Database size={13} /> Corpus normativo instalado
          </span>
        </header>

        {/* Selector de Materias con Colores Diferenciados */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2" aria-label="Selector de materia">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Selecciona la materia y leyes a consultar
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              Leyes incluidas en esta materia: <strong className="text-slate-700">{currentArea.lawsIncluded}</strong>
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            {SEARCH_AREAS.map((area) => {
              const active = area.id === selectedArea;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => {
                    setSelectedArea(area.id);
                    setResults(null);
                    setSummary('');
                    setPendingRouting(null);
                    setExpandedArticles(new Set());
                  }}
                  className={cn(
                    'rounded-xl border p-3 text-left transition focus:outline-hidden',
                    active
                      ? `${area.activeClass} shadow-xs`
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="shrink-0">{area.icon}</span>
                    <span className="truncate">{area.label}</span>
                    {active && <Check size={14} className="ml-auto text-current" />}
                  </div>
                  <span className="mt-1 block text-[11px] leading-tight text-slate-500 truncate">
                    {area.lawsIncluded}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Barra de Búsqueda */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Busca un artículo o concepto en ${currentArea.label} (ej: ${currentArea.examples[0].query})...`}
                className={cn(
                  'w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-xs text-slate-900 outline-hidden transition placeholder:text-slate-400 focus:ring-2',
                  currentArea.ringClass
                )}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-xl px-6 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 shadow-xs',
                currentArea.buttonClass
              )}
            >
              {isSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              <span>Buscar</span>
            </button>
          </form>

          <p className="text-[11px] leading-relaxed text-slate-500">
            <strong className="text-slate-700">Formato recomendado:</strong> sujeto + tema en 2–4 palabras, por ejemplo
            {' '}<span className="font-semibold text-slate-800">prestaciones trabajadores hogar</span>. No necesitas escribir la ley ni el artículo.
          </p>
          <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-400">
            <Bot size={12} className="mt-0.5 shrink-0" />
            Con BYOK activo, el proveedor configurado puede ayudar a ordenar resultados. El texto mostrado siempre proviene del corpus instalado.
          </p>

          <AnimatePresence initial={false}>
            {pendingRouting && (() => {
              const suggested = SEARCH_AREAS.find(area => area.id === pendingRouting.suggestedArea) || SEARCH_AREAS[0];
              return (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-700" />
                      <div className="flex-1">
                        <p className="text-xs font-bold">La consulta parece corresponder a {suggested.label}.</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
                          Elegiste {currentArea.label}. Buscar en esa materia puede omitir el artículo aplicable.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void runSearch(pendingRouting.query, { skipRouting: true, area: pendingRouting.suggestedArea })}
                            className="rounded-lg bg-amber-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-950"
                          >
                            Cambiar a {suggested.shortLabel} y buscar
                          </button>
                          <button
                            type="button"
                            onClick={() => void runSearch(pendingRouting.query, { skipRouting: true, area: selectedArea })}
                            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                          >
                            Continuar en {currentArea.shortLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingRouting(null)}
                            className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* Sugerencias Rápidas */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Artículos clave:</span>
            {currentArea.examples.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => void runSearch(ex.query)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-100 transition"
              >
                <Sparkles size={11} className="inline mr-1 text-legal-gold" />
                {ex.label}
              </button>
            ))}
          </div>
        </section>

        {/* Estado de Carga / Búsqueda */}
        {isSearching && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs space-y-3">
            <Loader2 size={32} className="animate-spin mx-auto text-slate-700" />
            <p className="text-sm font-bold text-slate-900">Consultando leyes oficiales en {currentArea.label}...</p>
            <p className="text-xs text-slate-500">Localizando las disposiciones más relacionadas.</p>
          </div>
        )}

        {/* Resultados de la Búsqueda */}
        {!isSearching && results !== null && (
          <div className="space-y-4">
            
            {/* Banner Informativo de Resultados */}
            <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-xs', results.length > 0 ? currentArea.badgeClass : 'bg-amber-50 border-amber-200 text-amber-950')}>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={17} className="shrink-0" />
                <span className="text-xs font-bold">{summary}</span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5 text-[10px] font-bold">
                <span className="rounded-full bg-white/70 px-2.5 py-1">Materia: {currentArea.shortLabel}</span>
              </div>
            </div>

            {/* Grid de Artículos */}
            {results.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {results.map((item, index) => {
                  const isExpanded = expandedArticles.has(index);
                  const isCopied = copiedIndex === index;
                  return (
                    <motion.article
                      key={item.id || index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition"
                    >
                      <div className="space-y-3">
                        {/* Cabecera del Artículo */}
                        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                          <div className="flex items-start gap-2.5">
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-950 px-1.5 text-[10px] font-bold text-white">
                              {index + 1}
                            </span>
                            <div>
                              <span className={cn('inline-block rounded-lg px-2 py-0.5 text-[11px] font-bold', currentArea.badgeClass)}>
                                {item.article_number || item.subtitle || 'Artículo'}
                              </span>
                            <h3 className="mt-1 text-xs font-bold text-slate-950">
                              {item.law_code || item.title || 'Normativa'}
                            </h3>
                            </div>
                          </div>
                        </div>

                        {/* Contenido del Artículo */}
                        <div className="text-xs leading-relaxed text-slate-700">
                          <p className={cn(!isExpanded && 'line-clamp-4')}>
                            {item.content || 'Sin texto registrado para esta disposición.'}
                          </p>
                        </div>
                      </div>

                      {/* Footer de Acciones */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedArticles((prev) => {
                                const next = new Set(prev);
                                if (next.has(index)) next.delete(index);
                                else next.add(index);
                                return next;
                              });
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? 'Ver menos' : 'Leer artículo completo'}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyCitation(item, index)}
                            className="flex-1 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                          >
                            {isCopied ? <Check size={14} className="text-emerald-600" /> : <Clipboard size={14} />}
                            <span>{isCopied ? 'Copiado' : 'Copiar cita'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCarryToDrafting(item)}
                            className={cn(
                              'flex-1 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-white transition shadow-xs',
                              currentArea.buttonClass
                            )}
                          >
                            <FileSignature size={14} />
                            <span>Llevar a Redactor</span>
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default BuscadorLegal;
