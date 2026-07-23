import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, FileText, X } from 'lucide-react';
import type { DraftingTemplate } from '../lib/constants';
import { cn } from '../lib/utils';

type TemplateTone = 'blue' | 'amber' | 'emerald';

interface DraftingTemplatePickerProps {
  templates: DraftingTemplate[];
  selectedTemplate: DraftingTemplate | null;
  tone: TemplateTone;
  onSelect: (template: DraftingTemplate) => void;
  onClear: () => void;
}

const toneClasses: Record<TemplateTone, {
  activeButton: string;
  activeIcon: string;
  focus: string;
  hover: string;
  status: string;
}> = {
  blue: {
    activeButton: 'border-blue-300 bg-blue-50 text-blue-950 shadow-sm',
    activeIcon: 'text-blue-600',
    focus: 'focus:ring-blue-500/30',
    hover: 'hover:border-blue-200 hover:bg-blue-50/60',
    status: 'text-blue-700 bg-blue-50 border-blue-100',
  },
  emerald: {
    activeButton: 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm',
    activeIcon: 'text-emerald-600',
    focus: 'focus:ring-emerald-500/30',
    hover: 'hover:border-emerald-200 hover:bg-emerald-50/60',
    status: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  },
  amber: {
    activeButton: 'border-amber-300 bg-amber-50 text-amber-950 shadow-sm',
    activeIcon: 'text-amber-600',
    focus: 'focus:ring-amber-500/30',
    hover: 'hover:border-amber-200 hover:bg-amber-50/60',
    status: 'text-amber-800 bg-amber-50 border-amber-100',
  },
};

export const DraftingTemplatePicker: React.FC<DraftingTemplatePickerProps> = ({
  templates,
  selectedTemplate,
  tone,
  onSelect,
  onClear,
}) => {
  const classes = toneClasses[tone];
  const [isBrowsing, setIsBrowsing] = useState(!selectedTemplate);

  useEffect(() => {
    if (!selectedTemplate) setIsBrowsing(true);
  }, [selectedTemplate]);

  return (
    <div className="relative z-10 mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {selectedTemplate ? 'Plantilla seleccionada' : 'Plantillas disponibles'}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {selectedTemplate ? 'Confirma los datos requeridos o cambia de plantilla.' : 'Elige el documento que quieres preparar.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium',
            selectedTemplate ? classes.status : 'border-slate-200 bg-slate-50 text-slate-500'
          )}>
            {selectedTemplate ? <CheckCircle2 size={13} /> : <FileText size={13} />}
            <span className="truncate">{selectedTemplate ? selectedTemplate.title : 'Sin plantilla'}</span>
          </span>
          {selectedTemplate && (
            <button
              type="button"
              onClick={() => setIsBrowsing((value) => !value)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              aria-expanded={isBrowsing}
            >
              Cambiar <ChevronDown size={13} className={cn('transition-transform', isBrowsing && 'rotate-180')} />
            </button>
          )}
          {selectedTemplate && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              title="Quitar plantilla"
              aria-label={`Quitar plantilla ${selectedTemplate.title}`}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {(!selectedTemplate || isBrowsing) && <div className="max-h-[390px] space-y-6 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3 pr-2">
        {Object.entries(
          templates.reduce((acc, t) => {
            const group = t.intentGroup || 'Otros';
            if (!acc[group]) acc[group] = [];
            acc[group].push(t);
            return acc;
          }, {} as Record<string, typeof templates>)
        ).map(([groupName, groupTemplates]) => (
          <div key={groupName} className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/50 pb-1">
              {groupName}
            </h4>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {groupTemplates.map((template) => {
                const isActive = selectedTemplate?.id === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => { onSelect(template); setIsBrowsing(false); }}
                    aria-label={`Seleccionar plantilla ${template.title}`}
                    className={cn(
                      'min-h-[96px] rounded-xl border bg-white p-3 text-left transition focus:outline-none focus:ring-2',
                      classes.focus,
                      isActive ? classes.activeButton : `border-slate-200 text-slate-700 ${classes.hover}`
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <FileText
                        size={15}
                        className={cn('mt-0.5 shrink-0', isActive ? classes.activeIcon : 'text-slate-400')}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold">{template.title}</div>
                        <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{template.description}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {template.requiredFields.slice(0, 2).map((field) => (
                            <span
                              key={field}
                              className="max-w-full truncate rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] text-slate-500"
                            >
                              {field}
                            </span>
                          ))}
                          {template.requiredFields.length > 2 && (
                            <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] text-slate-500">
                              +{template.requiredFields.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>}

      {selectedTemplate && (
        <div className={cn('rounded-lg border p-3 text-xs', classes.status)}>
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={14} />
            Plantilla activa
          </div>
          <p className="mt-2 leading-5 text-slate-600">
            {selectedTemplate.output}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedTemplate.requiredFields.map((field) => (
              <span key={field} className="rounded-md bg-white/75 px-2 py-1 text-[10px] text-slate-600">
                {field}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
