import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenCheck,
  Check,
  Clipboard,
  Download,
  FileSignature,
  Layers,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { useUiStore } from '../store/useUiStore';

interface LectorNormativoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lawCode: string | null;
  initialArticleNumber?: string | null;
  onInsertGrounding?: (text: string) => void;
}

export const LectorNormativoModal: React.FC<LectorNormativoModalProps> = ({
  isOpen,
  onClose,
  lawCode,
  initialArticleNumber,
  onInsertGrounding,
}) => {
  const { notify } = useUiStore();
  const [loading, setLoading] = useState(false);
  const [lawData, setLawData] = useState<{
    code: string;
    name: string;
    module: string;
    content: string;
    provisions: number;
  } | null>(null);
  const [filterTerm, setFilterTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !lawCode) {
      setLawData(null);
      setFilterTerm('');
      return;
    }

    let active = true;
    setLoading(true);

    window.lexDesktop.legalCorpus
      .read({ code: lawCode })
      .then((res) => {
        if (active && res.success) {
          setLawData({
            code: res.code,
            name: res.name,
            module: res.module,
            content: res.content,
            provisions: res.provisions,
          });
        }
      })
      .catch((err: any) => {
        if (active) {
          notify(err?.message || `No se pudo cargar el texto de ${lawCode}.`, 'error', 'Lector Normativo');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, lawCode, notify]);

  // Split law content into identifiable sections/articles for quick jumping and filtering
  const articleSections = useMemo(() => {
    if (!lawData?.content) return [];
    const lines = lawData.content.split('\n');
    const sections: Array<{ id: string; title: string; content: string; lineIndex: number }> = [];
    let currentTitle = 'Encabezado y Disposiciones Preliminares';
    let currentContent: string[] = [];
    let sectionId = 'sec-0';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const articleMatch = line.match(/^#{1,4}\s*(Artículo\s+\d+[\w\s.-]*|TITULO\s+[\w\s.-]+|CAPITULO\s+[\w\s.-]+)/i);
      if (articleMatch) {
        if (currentContent.length > 0) {
          sections.push({
            id: sectionId,
            title: currentTitle,
            content: currentContent.join('\n'),
            lineIndex: i - currentContent.length,
          });
        }
        currentTitle = articleMatch[1].trim();
        sectionId = `sec-${sections.length + 1}`;
        currentContent = [line];
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      sections.push({
        id: sectionId,
        title: currentTitle,
        content: currentContent.join('\n'),
        lineIndex: lines.length - currentContent.length,
      });
    }

    return sections;
  }, [lawData?.content]);

  // Filter sections by search term
  const filteredSections = useMemo(() => {
    if (!filterTerm.trim()) return articleSections;
    const term = filterTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return articleSections.filter((s) => {
      const normalizedTitle = s.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normalizedContent = s.content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalizedTitle.includes(term) || normalizedContent.includes(term);
    });
  }, [articleSections, filterTerm]);

  // Scroll to targeted article on load if available
  useEffect(() => {
    if (!loading && initialArticleNumber && articleSections.length > 0) {
      const targetNum = initialArticleNumber.trim().toLowerCase();
      const matched = articleSections.find((s) => s.title.toLowerCase().includes(`artículo ${targetNum}`) || s.title.toLowerCase().includes(`articulo ${targetNum}`));
      if (matched) {
        setTimeout(() => {
          const el = document.getElementById(matched.id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50/50');
            setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/50'), 4000);
          }
        }, 250);
      }
    }
  }, [loading, initialArticleNumber, articleSections]);

  const handleCopyAll = async () => {
    if (!lawData?.content) return;
    try {
      await navigator.clipboard.writeText(lawData.content);
      setCopied(true);
      notify('Texto completo copiado al portapapeles.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('No se pudo copiar el texto.', 'error');
    }
  };

  const handleDownload = async () => {
    if (!lawData?.code) return;
    setDownloading(true);
    try {
      const res = await window.lexDesktop.legalCorpus.download({ code: lawData.code });
      if (res.success) notify(`Archivo de ${lawData.name} descargado.`, 'success');
    } catch {
      notify('No se pudo descargar la ley.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl z-10">
        
        {/* Header con jerarquía clara */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
              <BookOpenCheck size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-500/20 border border-blue-400/40 px-2 py-0.5 text-xs font-bold text-blue-300">
                  {lawData?.code || lawCode}
                </span>
                <span className="text-xs text-slate-400">Texto Oficial Íntegro</span>
              </div>
              <h2 className="text-base font-bold text-white truncate max-w-xl">
                {lawData?.name || 'Cargando ordenamiento normativo...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              disabled={!lawData}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              title="Copiar ley completa"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Clipboard size={14} />}
              <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar todo'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!lawData || downloading}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              title="Descargar archivo en Markdown"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span className="hidden sm:inline">Descargar .md</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition"
              aria-label="Cerrar lector"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Barra de Filtro / Búsqueda Interna */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-2.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              placeholder="Buscar artículo específico o palabra clave dentro de esta ley (ej. 47, rescisión, jornada)..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-8 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
            />
            {filterTerm && (
              <button
                type="button"
                onClick={() => setFilterTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="text-xs font-semibold text-slate-500 shrink-0">
            {filteredSections.length} secciones / {lawData?.provisions || 0} disposiciones
          </div>
        </div>

        {/* Cuerpo del Lector */}
        <div ref={contentContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={28} className="animate-spin text-blue-600" />
              <p className="text-xs font-semibold">Cargando texto íntegro del corpus oficial...</p>
            </div>
          ) : !lawData ? (
            <div className="flex h-64 flex-col items-center justify-center text-slate-400 text-xs">
              No se pudo cargar el texto normativo.
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <Layers size={24} />
              <p>No se encontraron artículos que coincidan con &quot;{filterTerm}&quot;.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSections.map((section) => (
                <div
                  key={section.id}
                  id={section.id}
                  className="group rounded-2xl border border-slate-200 bg-slate-50/40 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-3">
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      {section.title}
                    </h3>
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(`${section.title} (${lawData.code}):\n${section.content}`);
                          notify('Artículo copiado.', 'success');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition"
                        title="Copiar este artículo"
                      >
                        <Clipboard size={12} /> Copiar
                      </button>
                      {onInsertGrounding && (
                        <button
                          type="button"
                          onClick={() => {
                            onInsertGrounding(`Conforme a lo dispuesto por el ${section.title} de la ${lawData.name} (${lawData.code}):\n"${section.content.trim()}"`);
                            notify('Fundamento insertado en el Redactor.', 'success');
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition"
                          title="Usar como fundamento en el documento activo"
                        >
                          <FileSignature size={12} /> Usar en Redactor
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="prose prose-xs max-w-none text-slate-700 text-xs leading-relaxed select-text font-serif">
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con información legal y cierre */}
        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
          <span>Fuente: Corpus Oficial Certificado de México (Texto íntegro local)</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-1.5 font-bold text-white hover:bg-slate-800 transition"
          >
            Cerrar Lector
          </button>
        </footer>
      </div>
    </div>
  );
};
