import React, { useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  Calculator,
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
import { useSearchParams } from 'react-router-dom';
import { suggestAlternativeLegalModule, type SearchableLegalModule } from '../lib/legal-search-routing';
import { cn } from '../lib/utils';
import { useUiStore } from '../store/useUiStore';

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

const MODULE_LABELS: Record<SearchableLegalModule, string> = {
  mercantil: 'Mercantil',
  fiscal: 'Fiscal',
};

const SEARCH_EXAMPLES: Record<SearchableLegalModule, string[]> = {
  mercantil: ['Actos de comercio, artículo 75', 'Requisitos del pagaré en la LGTOC', 'Asamblea de accionistas en la LGSM'],
  fiscal: ['Artículo 69-B del CFF', 'Requisitos de deducciones, LISR 27', 'IVA acreditable, LIVA 5'],
};

const retrievalLabel = (result: LegalSearchResult) => {
  const score = Number(result.similarity) || 0;
  if (score >= 0.999) return 'Coincidencia exacta';
  if (score >= 0.78) return 'Coincidencia alta';
  return 'Coincidencia contextual';
};

export const BuscadorLegal: React.FC = () => {
  const { notify } = useUiStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedModule = searchParams.get('materia');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<LegalSearchResult[] | null>(null);
  const [summary, setSummary] = useState('');
  const [module, setModule] = useState<SearchableLegalModule>(requestedModule === 'fiscal' ? 'fiscal' : 'mercantil');
  const [suggestedModule, setSuggestedModule] = useState<SearchableLegalModule | null>(null);
  const [expandedArticles, setExpandedArticles] = useState<Set<number>>(new Set());

  const selectModule = (nextModule: SearchableLegalModule) => {
    setModule(nextModule);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('materia', nextModule);
    setSearchParams(nextParams, { replace: true });
    setResults(null);
    setSummary('');
    setSuggestedModule(null);
    setExpandedArticles(new Set());
  };

  const runSearch = async (targetModule: SearchableLegalModule) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    setModule(targetModule);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('materia', targetModule);
    setSearchParams(nextParams, { replace: true });
    setIsSearching(true);
    setResults(null);
    setSummary('');
    setSuggestedModule(null);
    setExpandedArticles(new Set());

    try {
      if (!window.lexDesktop?.legalKnowledge) {
        throw new Error('La base jurídica local no está conectada.');
      }
      const ragResponse = await window.lexDesktop.legalKnowledge.searchRAG({
        query: normalizedQuery,
        module: targetModule,
        limit: 6,
      });
      const citations = (ragResponse.citations || []) as LegalSearchResult[];
      setResults(citations);
      if (citations.length > 0) {
        setSummary(`Se recuperaron ${citations.length} fundamentos del corpus ${MODULE_LABELS[targetModule].toLowerCase()} instalado. Revisa el texto y la procedencia antes de usarlo.`);
      } else {
        setSummary(`No se recuperó fundamento suficiente dentro del corpus ${MODULE_LABELS[targetModule].toLowerCase()} seleccionado.`);
        setSuggestedModule(suggestAlternativeLegalModule(normalizedQuery, targetModule));
      }
    } catch (error: any) {
      notify(error?.message || 'Falló la búsqueda en el corpus local.', 'error');
      setResults([]);
      setSummary('La búsqueda no pudo completarse con los recursos locales disponibles.');
    } finally {
      setIsSearching(false);
    }
  };

  const theme = module === 'fiscal'
    ? {
        rail: 'bg-fiscal',
        icon: 'border-emerald-200 bg-emerald-50 text-fiscal',
        searchIcon: isSearching ? 'text-fiscal' : 'text-slate-500 group-focus-within:text-fiscal',
        input: 'focus:border-fiscal focus:ring-fiscal/15',
        button: 'bg-fiscal hover:bg-fiscal-dark',
        emptyIcon: 'bg-emerald-50 text-fiscal',
        example: 'hover:border-emerald-200 hover:bg-emerald-50 hover:text-fiscal-dark',
        loading: 'text-fiscal/80',
        resultBorder: 'border-emerald-200 bg-emerald-50',
        resultRail: 'bg-fiscal',
        resultIcon: 'bg-emerald-100 text-fiscal',
        resultTitle: 'text-fiscal-dark',
      }
    : {
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
          <div><h1 className="font-serif text-2xl font-bold tracking-tight text-slate-950">Consultas</h1><p className="mt-1 text-xs text-slate-500">Consulta directa sobre los corpus oficiales mercantil y fiscal.</p></div>
        </div>
        <div className="flex rounded-xl border border-slate-300 bg-slate-200/50 p-1" aria-label="Corpus legal">
          <button type="button" onClick={() => selectModule('mercantil')} aria-pressed={module === 'mercantil'} className={cn('flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all', module === 'mercantil' ? 'border border-slate-200 bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}><Scale size={16} /> Mercantil</button>
          <button type="button" onClick={() => selectModule('fiscal')} aria-pressed={module === 'fiscal'} className={cn('flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all', module === 'fiscal' ? 'border border-slate-200 bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}><Calculator size={16} /> Fiscal</button>
        </div>
      </header>

      <div className="relative z-10 shrink-0 px-5 pb-5 md:px-8">
        <form onSubmit={(event) => { event.preventDefault(); void runSearch(module); }} className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center"><Search className={cn('transition-colors', theme.searchIcon)} size={19} /></div>
          <input type="text" value={query} onChange={(event) => { setQuery(event.target.value); setSuggestedModule(null); }} placeholder={`Busca una ley, artículo o concepto en ${MODULE_LABELS[module]}…`} className={cn('w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-12 pr-32 text-base font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2', theme.input)} />
          <div className="absolute inset-y-2 right-2 flex items-center"><button type="submit" disabled={isSearching || !query.trim()} className={cn('flex h-full items-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50', theme.button)}>{isSearching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />} Buscar</button></div>
        </form>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-10 md:px-8">
        <AnimatePresence mode="wait">
          {!isSearching && results === null && (
            <motion.section key={`empty-${module}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
              <span className={cn('mx-auto flex h-12 w-12 items-center justify-center rounded-2xl', theme.emptyIcon)}><FileSearch size={22} /></span>
              <h2 className="mt-4 text-base font-bold text-slate-900">Busca por ley, artículo o problema jurídico</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">La búsqueda se limita al corpus {MODULE_LABELS[module].toLowerCase()} seleccionado y muestra texto recuperado con su procedencia.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SEARCH_EXAMPLES[module].map((example) => <button key={example} type="button" onClick={() => setQuery(example)} className={cn('rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600', theme.example)}>{example}</button>)}
              </div>
            </motion.section>
          )}
          {isSearching && (
            <motion.div key="searching" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={cn('flex flex-col items-center justify-center py-20', theme.loading)}>
              <Database className="mb-4 animate-pulse" size={36} /><p className="text-sm font-semibold">Recuperando fundamentos del corpus local…</p>
            </motion.div>
          )}

          {!isSearching && results && (
            <motion.div key={`results-${module}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-6xl space-y-5">
              <section className={cn('relative overflow-hidden rounded-2xl border p-5', results.length ? theme.resultBorder : 'border-amber-200 bg-amber-50')} aria-live="polite">
                <div className={cn('absolute left-0 top-0 h-full w-1', results.length ? theme.resultRail : 'bg-amber-500')} />
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', results.length ? theme.resultIcon : 'bg-amber-100 text-amber-800')}>{results.length ? <ShieldCheck size={18} /> : <FileSearch size={18} />}</div>
                  <div className="min-w-0 flex-1"><h2 className={cn('text-xs font-bold uppercase tracking-wider', results.length ? theme.resultTitle : 'text-amber-900')}>{results.length ? 'Recuperación local verificable' : 'Sin fundamento en el corpus seleccionado'}</h2><p className="mt-1 text-sm leading-6 text-slate-700">{summary}</p></div>
                  {suggestedModule && (
                    <button type="button" onClick={() => void runSearch(suggestedModule)} className="inline-flex min-w-max items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800">Buscar en {MODULE_LABELS[suggestedModule]} <ArrowRight size={14} /></button>
                  )}
                </div>
              </section>

              {results.length > 0 && (
                <section aria-labelledby="legal-results-title">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div><h2 id="legal-results-title" className="flex items-center gap-2 text-sm font-bold text-slate-700"><Database size={16} /> Fundamentos recuperados</h2><p className="mt-1 text-xs text-slate-500">El nivel de coincidencia describe la recuperación; no equivale a certeza ni conclusión jurídica.</p></div>
                    <span className="text-xs font-semibold text-slate-500">Corpus: {MODULE_LABELS[module]}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {results.map((result, index) => {
                      const expanded = expandedArticles.has(index);
                      const verified = result.verification_status === 'verified_against_official_source';
                      return (
                        <motion.article key={result.id || index} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0"><span className={cn('inline-flex rounded-lg border px-2 py-1 text-[10px] font-bold', module === 'mercantil' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{result.article_number || result.subtitle || 'Disposición'}</span><h3 className="mt-2 truncate text-sm font-bold text-slate-950">{result.law_code || result.title || 'Fuente normativa'}</h3></div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{retrievalLabel(result)}</span>
                          </div>
                          <p className={cn('mt-4 text-sm leading-6 text-slate-600', !expanded && 'line-clamp-4')}>{result.content || 'El registro recuperado no contiene texto visible.'}</p>
                          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">{verified ? <ShieldCheck size={14} className="text-emerald-600" /> : <Database size={14} className="text-slate-400" />} {verified ? 'Contrastada con fuente oficial' : 'Fuente del corpus local'}</div>
                            <p className="truncate text-[11px] text-slate-500" title={result.citation_label || undefined}>{result.citation_label || `${result.law_code || result.title || 'Normativa'} ${result.article_number || result.subtitle || ''}`}</p>
                            {result.source_url && <p className="truncate text-[10px] text-slate-400" title={result.source_url}>{result.source_url}</p>}
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
