import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Database, Loader2, Search, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface FiscalCitation {
  id: string | number;
  title?: string;
  subtitle?: string;
  content: string;
  similarity?: number;
  law_code?: string;
  article_number?: string;
  citation_label?: string;
}

const FISCAL_LIBRARY = [
  { code: 'CFF', title: 'Código Fiscal de la Federación', description: 'Obligaciones fiscales, comprobantes, razón de negocios, facultades de comprobación y artículo 69-B.' },
  { code: 'LISR', title: 'Ley del Impuesto sobre la Renta', description: 'Ingresos, deducciones autorizadas, estricta indispensabilidad, retenciones y obligaciones de ISR.' },
  { code: 'LIVA', title: 'Ley del Impuesto al Valor Agregado', description: 'Actos gravados, traslado, pago efectivo y requisitos para el acreditamiento del IVA.' },
  { code: 'RMF', title: 'Resolución Miscelánea Fiscal', description: 'Reglas administrativas federales aplicables a comprobantes, trámites y cumplimiento tributario.' },
  { code: 'RLISR', title: 'Reglamento de la LISR', description: 'Desarrollo reglamentario de ingresos, deducciones, retenciones y obligaciones en materia de renta.' },
  { code: 'RLIVA', title: 'Reglamento de la LIVA', description: 'Reglas reglamentarias para traslado, acreditamiento, retenciones y actos sujetos al impuesto.' },
];

export const FiscalNormativeLibrary: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FiscalCitation[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [ragReady, setRagReady] = useState<boolean | null>(null);

  useEffect(() => {
    window.lexDesktop.runtime.getHealth()
      .then((health) => setRagReady(Boolean(health.checks.find((check) => check.id === 'rag')?.ok)))
      .catch(() => setRagReady(false));
  }, []);

  const searchCorpus = async (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    setQuery(normalized);
    setIsSearching(true);
    setResults(null);
    try {
      const response = await window.lexDesktop.legalKnowledge.searchRAG({ query: normalized, module: 'fiscal', limit: 10 });
      setResults(Array.isArray(response?.citations) ? response.citations : []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50/60 px-5 py-7 md:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-fiscal/10 text-fiscal"><BookOpen size={27} /></span>
            <div>
              <h2 className="font-serif text-3xl font-bold text-slate-950">Biblioteca Normativa Fiscal</h2>
              <p className="mt-2 text-base text-slate-600">Leyes, códigos y reglamentos instalados para la práctica y prevención fiscal.</p>
            </div>
          </div>
          <span className={cn(
            'inline-flex items-center gap-2 self-start rounded-full border px-3 py-2 text-xs font-bold',
            ragReady === true ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : ragReady === false ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-500',
          )}>
            {ragReady === true ? <ShieldCheck size={14} /> : ragReady === false ? <AlertTriangle size={14} /> : <Loader2 size={14} className="animate-spin" />}
            {ragReady === true ? 'Base local disponible' : ragReady === false ? 'Base local no instalada' : 'Verificando base local'}
          </span>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {FISCAL_LIBRARY.map((regulation, index) => (
            <motion.button
              key={regulation.code}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => void searchCorpus(`${regulation.code} ${regulation.title}`)}
              className="group min-h-52 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-fiscal/40 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition group-hover:bg-fiscal/10 group-hover:text-fiscal"><BookOpen size={22} /></span>
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black tracking-wider text-slate-500 group-hover:border-fiscal/20 group-hover:text-fiscal">{regulation.code}</span>
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-950 transition group-hover:text-fiscal">{regulation.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{regulation.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-fiscal"><Database size={13} /> Consultar en base local</span>
            </motion.button>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <form onSubmit={(event) => { event.preventDefault(); void searchCorpus(query); }} className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar artículo, concepto o requisito en el corpus fiscal…" aria-label="Buscar normativa fiscal" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-28 text-sm text-slate-900 outline-none focus:border-fiscal focus:ring-4 focus:ring-fiscal/10" />
            <button type="submit" disabled={isSearching || !query.trim()} className="absolute bottom-2 right-2 top-2 inline-flex items-center gap-2 rounded-xl bg-fiscal px-4 text-xs font-bold text-white hover:bg-fiscal-light disabled:opacity-40">{isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Buscar</button>
          </form>
        </section>

        {isSearching && <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-500"><Database size={32} className="animate-pulse text-fiscal" /><p className="mt-3 text-sm font-semibold">Recuperando fundamentos locales…</p></div>}

        {!isSearching && results?.length === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900"><strong className="flex items-center gap-2"><AlertTriangle size={16} /> Sin coincidencias</strong><p className="mt-2">{ragReady === false ? 'La base normativa local no está instalada en este checkout.' : 'Prueba con una ley, artículo o concepto más específico.'}</p></div>
        )}

        {!isSearching && results && results.length > 0 && (
          <section className="space-y-4" aria-live="polite">
            <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500"><Database size={15} /> Fundamentos recuperados</h3><span className="text-xs font-semibold text-slate-500">{results.length} coincidencias</span></div>
            <div className="grid gap-4 lg:grid-cols-2">
              {results.map((result, index) => (
                <article key={`${result.id}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div><span className="inline-flex rounded-lg border border-fiscal/15 bg-fiscal/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-fiscal">{result.law_code || result.title || 'Norma fiscal'}</span><h4 className="mt-3 font-serif text-lg font-bold text-slate-950">{result.article_number || result.subtitle || result.citation_label || 'Fundamento recuperado'}</h4></div>{typeof result.similarity === 'number' && <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">{Math.round(result.similarity * 100)}% afinidad</span>}</div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{result.content}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default FiscalNormativeLibrary;
