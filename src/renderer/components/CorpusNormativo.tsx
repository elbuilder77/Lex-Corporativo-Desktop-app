import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  BookOpenCheck,
  Database,
  Download,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useUiStore } from '../store/useUiStore';
import { LectorNormativoModal } from './LectorNormativoModal';

type CorpusOverview = Awaited<ReturnType<typeof window.lexDesktop.legalCorpus.list>>;
type CorpusLaw = CorpusOverview['laws'][number];
type CorpusArea = CorpusLaw['module'] | 'todos';

const AREA_OPTIONS: Array<{ id: CorpusArea; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'mercantil', label: 'Mercantil' },
  { id: 'laboral', label: 'Laboral' },
  { id: 'fiscal', label: 'Fiscal' },
  { id: 'comercio_exterior', label: 'Comercio exterior' },
  { id: 'aduanal', label: 'Aduanal' },
];

const AREA_LABELS: Record<CorpusLaw['module'], string> = {
  mercantil: 'Mercantil',
  laboral: 'Laboral',
  fiscal: 'Fiscal',
  comercio_exterior: 'Comercio exterior',
  aduanal: 'Aduanal',
};

const AREA_STYLES: Record<CorpusLaw['module'], string> = {
  mercantil: 'border-blue-200 bg-blue-50 text-blue-800',
  laboral: 'border-amber-200 bg-amber-50 text-amber-800',
  fiscal: 'border-teal-200 bg-teal-50 text-teal-800',
  comercio_exterior: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  aduanal: 'border-purple-200 bg-purple-50 text-purple-800',
};

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
    .trim();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const CorpusNormativo: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { notify } = useUiStore();
  const [overview, setOverview] = useState<CorpusOverview | null>(null);
  const [query, setQuery] = useState(() => searchParams.get('ley') || '');
  const [selectedArea, setSelectedArea] = useState<CorpusArea>('todos');
  const [loading, setLoading] = useState(true);
  const [downloadingCode, setDownloadingCode] = useState<string | null>(null);
  const [selectedLawForReader, setSelectedLawForReader] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    window.lexDesktop.legalCorpus.list()
      .then((result) => {
        if (active) setOverview(result);
      })
      .catch((error: any) => {
        if (active) notify(error?.message || 'No se pudo abrir el corpus normativo instalado.', 'error', 'Corpus normativo');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [notify]);

  const filteredLaws = useMemo(() => {
    const term = normalizeSearch(query);
    return (overview?.laws || []).filter((law) => {
      if (selectedArea !== 'todos' && law.module !== selectedArea) return false;
      if (!term) return true;
      return normalizeSearch(`${law.code} ${law.name} ${AREA_LABELS[law.module]}`).includes(term);
    });
  }, [overview, query, selectedArea]);

  const handleDownload = async (law: CorpusLaw) => {
    setDownloadingCode(law.code);
    try {
      const result = await window.lexDesktop.legalCorpus.download({ code: law.code });
      if (result.success) {
        notify(`${law.name} se descargó desde el corpus instalado.`, 'success', 'Descarga completa');
      }
    } catch (error: any) {
      notify(error?.message || `No se pudo descargar ${law.name}.`, 'error', 'Corpus normativo');
    } finally {
      setDownloadingCode(null);
    }
  };

  return (
    <div className="relative h-full overflow-y-auto bg-slate-50 text-slate-800">
      <div className="sticky left-0 top-0 z-20 h-1 w-full bg-slate-900" />
      <div className="mx-auto w-full max-w-7xl space-y-6 px-5 pb-12 pt-6 md:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-slate-900">
                <BookOpenCheck size={22} />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-950">Corpus Normativo Oficial</h1>
                <p className="text-xs text-slate-500">Consulta en pantalla y descarga los textos legales íntegros instalados.</p>
              </div>
            </div>
            {overview && (
              <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-700">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                  <Database size={13} /> {overview.lawsCount} ordenamientos
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                  <FileText size={13} /> {overview.provisionsCount.toLocaleString('es-MX')} disposiciones
                </span>
              </div>
            )}
          </div>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" aria-label="Buscar ordenamiento">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busca por nombre o siglas, por ejemplo: Ley Federal del Trabajo o LFT"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-600 focus:ring-4 focus:ring-slate-500/10"
              aria-label="Buscar ley en el corpus"
            />
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filtrar por materia">
            {AREA_OPTIONS.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => setSelectedArea(area.id)}
                className={cn(
                  'min-h-8 rounded-lg border px-3 text-xs font-bold transition cursor-pointer',
                  selectedArea === area.id
                    ? 'border-slate-800 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900',
                )}
              >
                {area.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <Loader2 size={30} className="mx-auto animate-spin text-slate-700" />
            <p className="mt-3 text-sm font-bold text-slate-900">Abriendo el corpus instalado...</p>
          </div>
        ) : filteredLaws.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Ordenamientos instalados">
            {filteredLaws.map((law) => (
              <article key={law.code} className="flex min-h-56 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn('rounded-lg border px-2.5 py-1 text-[11px] font-bold', AREA_STYLES[law.module])}>
                      {AREA_LABELS[law.module]}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">{law.code}</span>
                  </div>
                  <h2 className="mt-4 text-sm font-bold leading-5 text-slate-950">{law.name}</h2>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
                    <span>{law.provisions.toLocaleString('es-MX')} disposiciones</span>
                    <span>{formatBytes(law.bytes)}</span>
                  </div>
                </div>
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLawForReader(law.code)}
                      className="flex-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition hover:bg-slate-800 cursor-pointer shadow-xs"
                    >
                      <BookOpen size={14} />
                      Leer en Pantalla
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownload(law)}
                      disabled={downloadingCode !== null}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                      title="Descargar archivo en Markdown"
                    >
                      {downloadingCode === law.code ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      <span className="hidden sm:inline">Descargar .md</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Search size={28} className="mx-auto text-slate-400" />
            <p className="mt-3 text-sm font-bold text-slate-900">No encontramos ese ordenamiento.</p>
            <p className="mt-1 text-xs text-slate-500">Prueba con sus siglas, parte del nombre o cambia la materia.</p>
          </div>
        )}
      </div>

      <LectorNormativoModal
        isOpen={Boolean(selectedLawForReader)}
        onClose={() => setSelectedLawForReader(null)}
        lawCode={selectedLawForReader}
      />
    </div>
  );
};

export default CorpusNormativo;

