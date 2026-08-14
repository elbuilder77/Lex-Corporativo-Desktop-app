import React, { useState } from 'react';
import {
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Database,
  FileSearch,
  Loader2,
  Scale,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useUiStore } from '../store/useUiStore';

type LegalSearchArea = 'fiscal' | 'mercantil' | 'laboral' | 'comercio_exterior' | 'aduanal';

interface LegalSearchResult {
  id: string | number;
  title?: string;
  subtitle?: string;
  content?: string;
  similarity?: number;
  law_code?: string;
  article_number?: string;
  citation_label?: string;
  source_url?: string;
  verification_status?: 'verified_against_official_source';
}

const SEARCH_AREAS: Array<{ id: LegalSearchArea; label: string; description: string; examples: string[] }> = [
  {
    id: 'fiscal',
    label: 'Fiscal y SAT',
    description: 'CFF, LISR, LIVA, Reglamentos y Miscelánea Fiscal (RMF).',
    examples: ['Materialidad de operaciones artículo 69-B CFF', 'Requisitos de las deducciones artículo 27 LISR', 'Acreditamiento del impuesto artículo 5 LIVA', 'CFDI y complementos de pago'],
  },
  {
    id: 'mercantil',
    label: 'Mercantil y Corporativo',
    description: 'Sociedades, contratos mercantiles y títulos de crédito.',
    examples: ['Actos de comercio artículo 75 CCOM', 'Requisitos del pagaré en la LGTOC', 'Asamblea de accionistas en la LGSM'],
  },
  {
    id: 'laboral',
    label: 'Laboral',
    description: 'Contratos individuales, jornadas, salarios y prestaciones.',
    examples: ['Contrato individual artículo 20 LFT', 'Condiciones de trabajo artículo 25 LFT', 'Obligaciones de teletrabajo en la LFT'],
  },
  {
    id: 'comercio_exterior',
    label: 'Comercio exterior',
    description: 'Importación, exportación, permisos y cuotas compensatorias.',
    examples: ['Objeto de la Ley de Comercio Exterior', 'Regulación no arancelaria artículo 15 LCE', 'Permisos previos y certificados de origen'],
  },
  {
    id: 'aduanal',
    label: 'Aduanal',
    description: 'Pedimentos, despacho, valor en aduana, RGCE y LIGIE.',
    examples: ['Pedimento artículo 36 Ley Aduanera', 'Valor en aduana regla 1.5.1 RGCE', 'Tarifa arancelaria capítulo 87 LIGIE'],
  },
];

const retrievalLabel = (result: LegalSearchResult) => {
  const score = Number(result.similarity) || 0;
  if (score >= 0.999) return 'Coincidencia exacta';
  if (score >= 0.78) return 'Coincidencia alta';
  return 'Coincidencia contextual';
};

export const BuscadorLegal: React.FC = () => {
  const { notify } = useUiStore();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<LegalSearchResult[] | null>(null);
  const [summary, setSummary] = useState('');
  const [expandedArticles, setExpandedArticles] = useState<Set<number>>(new Set());
  const [selectedArea, setSelectedArea] = useState<LegalSearchArea>('mercantil');
  const selectedAreaConfig = SEARCH_AREAS.find(area => area.id === selectedArea) || SEARCH_AREAS[0];

  const runSearch = async (searchValue = query) => {
    const normalizedQuery = searchValue.trim();
    if (!normalizedQuery) return;

    setQuery(normalizedQuery);
    setIsSearching(true);
    setResults(null);
    setSummary('');
    setExpandedArticles(new Set());

    try {
      if (!window.lexDesktop?.legalKnowledge) {
        throw new Error('La base jurídica local no está conectada.');
      }
      const ragResponse = await window.lexDesktop.legalKnowledge.searchRAG({
        query: normalizedQuery,
        module: selectedArea,
        limit: 6,
      });
      const citations = (ragResponse.citations || []) as LegalSearchResult[];
      setResults(citations);
      if (citations.length > 0) {
        setSummary(`Se recuperaron ${citations.length} fundamentos del corpus ${selectedAreaConfig.label.toLowerCase()} instalado. Revisa el texto y la procedencia antes de usarlo.`);
      } else {
        setSummary(`No se recuperó fundamento suficiente dentro del corpus ${selectedAreaConfig.label.toLowerCase()} seleccionado.`);
      }
    } catch (error: any) {
      notify(error?.message || 'Falló la búsqueda en el corpus local.', 'error');
      setResults([]);
      setSummary('La búsqueda no pudo completarse con los recursos locales disponibles.');
    } finally {
      setIsSearching(false);
    }
  };

  const theme = {
    rail: 'bg-mercantil',
    icon: 'border-blue-200 bg-blue-50 text-mercantil',
    searchIcon: isSearching ? 'text-mercantil' : 'text-slate-500 group-focus-within:text-mercantil',
    input: 'focus:border-mercantil focus:ring-mercantil/15',
    button: 'bg-mercantil hover:bg-mercantil-dark',
    emptyIcon: 'bg-blue-50 text-mercantil',
    example: 'hover:border-blue-200 hover:bg-blue-50 hover:text-mercantil-dark',
    loading: 'text-mercantil/80',
    resultBorder: 'border-blue-200 bg-blue-50',
    resultRail: 'bg-mercantil',
    resultIcon: 'bg-blue-100 text-mercantil',
    resultTitle: 'text-mercantil-dark',
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-white text-slate-700">
      <div className={cn('pointer-events-none absolute left-0 top-0 h-1 w-full', theme.rail)} />

      <header className="relative z-10 flex flex-col gap-4 px-5 pb-4 pt-6 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-xl border p-2.5', theme.icon)}><BrainCircuit size={22} /></div>
          <div><h1 className="font-serif text-2xl font-bold tracking-tight text-slate-950">Buscador normativo</h1><p className="mt-1 text-xs text-slate-500">Consulta semántica y directa sobre el corpus legal oficial instalado.</p></div>
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-300 bg-slate-200/50 p-1" aria-label="Corpus legal">
          {SEARCH_AREAS.map(area => {
            const active = area.id === selectedArea;
            return (
              <button
                key={area.id}
                type="button"
                aria-pressed={active}
                title={area.description}
                onClick={() => {
                  setSelectedArea(area.id);
                  setResults(null);
                  setSummary('');
                  setExpandedArticles(new Set());
                }}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition',
                  active ? 'border-slate-200 bg-white text-blue-700 shadow-sm' : 'border-transparent text-slate-600 hover:bg-white/70',
                )}
              >
                <Scale size={16} /> {area.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="relative z-10 shrink-0 px-5 pb-5 md:px-8">
        <form onSubmit={(event) => { event.preventDefault(); void runSearch(); }} className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center"><Search className={cn('transition-colors', theme.searchIcon)} size={19} /></div>
          <input type="text" value={query} onChange={(event) => { setQuery(event.target.value); }} placeholder={`Busca una ley, artículo o concepto en ${selectedAreaConfig.label}...`} aria-label={`Consulta en corpus ${selectedAreaConfig.label}`} className={cn('w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-12 pr-32 text-base font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2', theme.input)} />
          <div className="absolute inset-y-2 right-2 flex items-center"><button type="submit" disabled={isSearching || !query.trim()} className={cn('flex h-full items-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50', theme.button)}>{isSearching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />} Buscar</button></div>
        </form>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-10 md:px-8">
        <AnimatePresence mode="wait">
          {!isSearching && results === null && (
            <motion.section key={`empty-${selectedArea}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
              <span className={cn('mx-auto flex h-12 w-12 items-center justify-center rounded-2xl', theme.emptyIcon)}><FileSearch size={22} /></span>
              <h2 className="mt-4 text-base font-bold text-slate-900">Busca por ley, artículo o problema jurídico</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">La búsqueda se limita al corpus {selectedAreaConfig.label.toLowerCase()} seleccionado y muestra texto recuperado con su procedencia.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {selectedAreaConfig.examples.map((example) => <button key={example} type="button" onClick={() => void runSearch(example)} className={cn('rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600', theme.example)}>{example}</button>)}
              </div>
            </motion.section>
          )}
          {isSearching && (
            <motion.div key="searching" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={cn('flex flex-col items-center justify-center py-20', theme.loading)}>
              <Database className="mb-4 animate-pulse" size={36} /><p className="text-sm font-semibold">Recuperando fundamentos del corpus local…</p>
            </motion.div>
          )}

          {!isSearching && results && (
            <motion.div key={`results-${selectedArea}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-6xl space-y-5">
              <section className={cn('relative overflow-hidden rounded-2xl border p-5', results.length ? theme.resultBorder : 'border-amber-200 bg-amber-50')} aria-live="polite">
                <div className={cn('absolute left-0 top-0 h-full w-1', results.length ? theme.resultRail : 'bg-amber-500')} />
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', results.length ? theme.resultIcon : 'bg-amber-100 text-amber-800')}>{results.length ? <ShieldCheck size={18} /> : <FileSearch size={18} />}</div>
                  <div className="min-w-0 flex-1"><h2 className={cn('text-xs font-bold uppercase tracking-wider', results.length ? theme.resultTitle : 'text-amber-900')}>{results.length ? 'Recuperación local verificable' : 'Sin fundamento en el corpus seleccionado'}</h2><p className="mt-1 text-sm leading-6 text-slate-700">{summary}</p></div>
                </div>
              </section>

              {results.length > 0 && (
                <section aria-labelledby="legal-results-title">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div><h2 id="legal-results-title" className="flex items-center gap-2 text-sm font-bold text-slate-700"><Database size={16} /> Fundamentos recuperados</h2><p className="mt-1 text-xs text-slate-500">El nivel de coincidencia describe la recuperación; no equivale a certeza ni conclusión jurídica.</p></div>
                    <span className="text-xs font-semibold text-slate-500">Corpus: {selectedAreaConfig.label}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {results.map((result, index) => {
                      const expanded = expandedArticles.has(index);
                      const verified = result.verification_status === 'verified_against_official_source';
                      return (
                        <motion.article key={result.id || index} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0"><span className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{result.article_number || result.subtitle || 'Disposición'}</span><h3 className="mt-2 truncate text-sm font-bold text-slate-950">{result.law_code || result.title || 'Fuente normativa'}</h3></div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{retrievalLabel(result)}</span>
                          </div>
                          <p className={cn('mt-4 text-sm leading-6 text-slate-600', !expanded && 'line-clamp-4')}>{result.content || 'El registro recuperado no contiene texto visible.'}</p>
                          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">{verified ? <ShieldCheck size={14} className="text-emerald-600" /> : <Database size={14} className="text-slate-400" />} {verified ? 'Contrastada con fuente oficial' : 'Fuente del corpus local'}</div>
                            <p className="truncate text-xs text-slate-500" title={result.citation_label || undefined}>{result.citation_label || `${result.law_code || result.title || 'Normativa'} ${result.article_number || result.subtitle || ''}`}</p>
                            {result.source_url && <p className="truncate text-xs text-slate-400" title={result.source_url}>{result.source_url}</p>}
                          </div>
                          <button type="button" onClick={() => setExpandedArticles((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })} aria-expanded={expanded} className="mt-4 inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{expanded ? 'Ver menos' : 'Ver texto completo'}</button>
                        </motion.article>
                      );
                    })}
                  </div>
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BuscadorLegal;
