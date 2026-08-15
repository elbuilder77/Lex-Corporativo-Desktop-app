import React, { useEffect, useState } from 'react';
import {
  FileText,
  FileCode,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { inspectDocumentFile, type DocumentInspectionSummary } from '../lib/document-inspector';
import { cn } from '../lib/utils';

interface UniversalDocumentBadgeProps {
  file: File;
  area?: string;
  onRemove: () => void;
  className?: string;
}

export const UniversalDocumentBadge: React.FC<UniversalDocumentBadgeProps> = ({
  file,
  area,
  onRemove,
  className,
}) => {
  const [summary, setSummary] = useState<DocumentInspectionSummary | null>(null);

  useEffect(() => {
    let isMounted = true;
    inspectDocumentFile(file, area).then((res) => {
      if (isMounted) setSummary(res);
    });
    return () => {
      isMounted = false;
    };
  }, [file, area]);

  if (!summary) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 animate-pulse shadow-xs">
        <div className="h-10 w-10 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 rounded-sm bg-slate-200" />
          <div className="h-2 w-20 rounded-sm bg-slate-100" />
        </div>
      </div>
    );
  }

  const formatBadgeStyles: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    pdf: {
      bg: 'bg-rose-50/80',
      border: 'border-rose-200',
      text: 'text-rose-700',
      icon: <FileText size={20} className="text-rose-600" />,
    },
    docx: {
      bg: 'bg-blue-50/80',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: <FileText size={20} className="text-blue-600" />,
    },
    cfdi: {
      bg: 'bg-emerald-50/80',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      icon: <Receipt size={20} className="text-emerald-600" />,
    },
    xml: {
      bg: 'bg-amber-50/80',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: <FileSpreadsheet size={20} className="text-amber-600" />,
    },
    markdown: {
      bg: 'bg-indigo-50/80',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      icon: <FileCode size={20} className="text-indigo-600" />,
    },
    text: {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-700',
      icon: <FileText size={20} className="text-slate-600" />,
    },
  };

  const style = formatBadgeStyles[summary.format] || formatBadgeStyles.text;

  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-white p-4 shadow-xs transition hover:shadow-md',
        style.border,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left icon and Main info */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border', style.bg, style.border)}>
            {style.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', style.bg, style.text)}>
                {summary.formatLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                <Tag size={10} className="text-slate-400" />
                {summary.categoryLabel}
              </span>
            </div>

            <h4 className="mt-1 text-xs font-bold text-slate-900 truncate" title={summary.fileName}>
              {summary.fileName}
            </h4>

            <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
              {summary.fileSizeFormatted} · <span className="text-emerald-700 inline-flex items-center gap-1 font-semibold"><ShieldCheck size={12} className="inline" /> Procesamiento 100% local</span>
            </p>
          </div>
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          aria-label="Remover archivo"
          title="Remover archivo"
        >
          <X size={15} />
        </button>
      </div>

      {/* Dynamic Insight Pills */}
      {summary.detectedInsights.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 pt-2.5 border-t border-slate-100">
          {summary.detectedInsights.map((insight, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-50/90 px-2.5 py-1 text-[10px] font-medium text-slate-700"
            >
              <Sparkles size={10} className="text-amber-500 shrink-0" />
              <strong className="font-semibold text-slate-900">{insight.label}:</strong> {insight.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
