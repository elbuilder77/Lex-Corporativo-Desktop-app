import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Coins,
  Download,
  Edit3,
  Eye,
  FileDown,
  FileSignature,
  FileText,
  Globe,
  Layers,
  Receipt,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { DraftingTemplate } from '../lib/constants';
import { getFullTemplateBody } from '../lib/template-bodies';
import { cn } from '../lib/utils';
import { Modal, ModalContent, ModalFooter, ModalHeader, ModalTitle } from './ui/Modal';
import { Button } from './ui/Button';

type TemplateTone = 'blue' | 'amber' | 'emerald';

interface DraftingTemplatePickerProps {
  templates: DraftingTemplate[];
  selectedTemplate: DraftingTemplate | null;
  tone: TemplateTone;
  onSelect: (template: DraftingTemplate) => void;
  onClear: () => void;
  onOpenDirectly?: (template: DraftingTemplate) => void;
  onExportDirectly?: (template: DraftingTemplate, format: 'pdf' | 'docx') => void;
}

const toneClasses: Record<TemplateTone, {
  activeButton: string;
  activeIcon: string;
  activePill: string;
  focus: string;
  hover: string;
  status: string;
  primaryBtn: string;
}> = {
  blue: {
    activeButton: 'border-blue-300 bg-blue-50/70 text-blue-950 shadow-sm ring-1 ring-blue-500/20',
    activeIcon: 'text-blue-600',
    activePill: 'bg-blue-600 text-white font-semibold shadow-xs border-transparent',
    focus: 'focus:ring-blue-500/30',
    hover: 'hover:border-blue-200 hover:bg-blue-50/60',
    status: 'text-blue-700 bg-blue-50 border-blue-100',
    primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  emerald: {
    activeButton: 'border-emerald-300 bg-emerald-50/70 text-emerald-950 shadow-sm ring-1 ring-emerald-500/20',
    activeIcon: 'text-emerald-600',
    activePill: 'bg-emerald-600 text-white font-semibold shadow-xs border-transparent',
    focus: 'focus:ring-emerald-500/30',
    hover: 'hover:border-emerald-200 hover:bg-emerald-50/60',
    status: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  amber: {
    activeButton: 'border-amber-300 bg-amber-50/70 text-amber-950 shadow-sm ring-1 ring-amber-500/20',
    activeIcon: 'text-amber-600',
    activePill: 'bg-amber-600 text-white font-semibold shadow-xs border-transparent',
    focus: 'focus:ring-amber-500/30',
    hover: 'hover:border-amber-200 hover:bg-amber-50/60',
    status: 'text-amber-800 bg-amber-50 border-amber-100',
    primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
};

function getTemplateIcon(template: DraftingTemplate) {
  const text = `${template.id} ${template.title} ${template.intentGroup || ''}`.toLowerCase();

  if (text.includes('pagare') || text.includes('adeudo') || text.includes('mutuo') || text.includes('fideicomiso') || text.includes('dacion')) {
    return Coins;
  }
  if (text.includes('nda') || text.includes('confidencial') || text.includes('privacidad') || text.includes('propiedad') || text.includes('acoso')) {
    return ShieldCheck;
  }
  if (text.includes('sapi') || text.includes('asamblea') || text.includes('constitutiva') || text.includes('sociedad') || text.includes('poder')) {
    return Building2;
  }
  if (text.includes('internacional') || text.includes('aduan') || text.includes('pedimento') || text.includes('import') || text.includes('flete')) {
    return Globe;
  }
  if (text.includes('contrato') || text.includes('suministro') || text.includes('distribucion') || text.includes('comision') || text.includes('compraventa') || text.includes('adenda')) {
    return FileSignature;
  }
  if (text.includes('aclaracion') || text.includes('escrito') || text.includes('acta')) {
    return Receipt;
  }

  return FileText;
}

export const DraftingTemplatePicker: React.FC<DraftingTemplatePickerProps> = ({
  templates,
  selectedTemplate,
  tone,
  onSelect,
  onClear,
  onOpenDirectly,
  onExportDirectly,
}) => {
  const classes = toneClasses[tone];
  const [isBrowsing, setIsBrowsing] = useState(!selectedTemplate);
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<DraftingTemplate | null>(null);
  const [modalTab, setModalTab] = useState<'document' | 'structure'>('document');

  useEffect(() => {
    if (!selectedTemplate) setIsBrowsing(true);
  }, [selectedTemplate]);

  const themes = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of templates) {
      const g = t.intentGroup || 'Otros';
      map.set(g, (map.get(g) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [templates]);

  const filteredGroupedTemplates = useMemo(() => {
    const grouped: Record<string, DraftingTemplate[]> = {};

    for (const template of templates) {
      const group = template.intentGroup || 'Otros';
      if (selectedTheme !== 'all' && group !== selectedTheme) {
        continue;
      }
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(template);
    }

    return grouped;
  }, [templates, selectedTheme]);

  const fullPreviewBody = useMemo(() => {
    return previewTemplate ? getFullTemplateBody(previewTemplate) : '';
  }, [previewTemplate]);

  return (
    <div className="relative z-10 mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {selectedTemplate ? 'Plantilla seleccionada' : 'Plantillas disponibles'}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {selectedTemplate
              ? 'Confirma los datos requeridos, edítala directamente o personalízala con IA.'
              : 'Elige el documento agrupado por tema para editar, exportar o personalizar.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex max-w-[240px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium',
              selectedTemplate ? classes.status : 'border-slate-200 bg-slate-50 text-slate-500'
            )}
          >
            {selectedTemplate ? <CheckCircle2 size={13} /> : <Layers size={13} />}
            <span className="truncate">{selectedTemplate ? selectedTemplate.title : 'Sin plantilla'}</span>
          </span>
          {selectedTemplate && (
            <button
              type="button"
              onClick={() => setIsBrowsing((value) => !value)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
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
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {(!selectedTemplate || isBrowsing) && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
          {themes.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedTheme('all')}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs transition border',
                  selectedTheme === 'all'
                    ? classes.activePill
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100/70'
                )}
              >
                Todas ({templates.length})
              </button>
              {themes.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => setSelectedTheme(theme.name)}
                  className={cn(
                    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs transition border',
                    selectedTheme === theme.name
                      ? classes.activePill
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100/70'
                  )}
                >
                  {theme.name} ({theme.count})
                </button>
              ))}
            </div>
          )}

          <div className="max-h-[380px] space-y-5 overflow-y-auto pr-1">
            {Object.entries(filteredGroupedTemplates).map(([groupName, groupTemplates]) => (
              <div key={groupName} className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {groupName}
                  </h4>
                  <span className="text-[11px] font-medium text-slate-400">
                    {groupTemplates.length} {groupTemplates.length === 1 ? 'plantilla' : 'plantillas'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {groupTemplates.map((template) => {
                    const isActive = selectedTemplate?.id === template.id;
                    const Icon = getTemplateIcon(template);

                    return (
                      <div
                        key={template.id}
                        className={cn(
                          'group relative flex flex-col justify-between rounded-xl border bg-white p-3.5 transition shadow-xs focus-within:ring-2',
                          classes.focus,
                          isActive
                            ? classes.activeButton
                            : `border-slate-200 text-slate-700 ${classes.hover}`
                        )}
                      >
                        <div
                          className="cursor-pointer"
                          onClick={() => {
                            onSelect(template);
                            setIsBrowsing(false);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelect(template);
                              setIsBrowsing(false);
                            }
                          }}
                          aria-label={`Seleccionar plantilla ${template.title}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition',
                                isActive
                                  ? 'border-blue-200 bg-blue-100/50 text-blue-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-500 group-hover:border-slate-300 group-hover:bg-white group-hover:text-slate-800'
                              )}
                            >
                              <Icon size={15} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="truncate text-xs font-bold text-slate-900">
                                  {template.title}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">
                                {template.description}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {template.requiredFields.slice(0, 2).map((field) => (
                              <span
                                key={field}
                                className="max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600"
                              >
                                {field}
                              </span>
                            ))}
                            {template.requiredFields.length > 2 && (
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">
                                +{template.requiredFields.length - 2}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewTemplate(template);
                              setModalTab('document');
                            }}
                            className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 transition"
                            title="Previsualizar el documento completo"
                          >
                            <Eye size={12} />
                            <span>Ver machote</span>
                          </button>
                          
                          <div className="flex items-center gap-2">
                            {onOpenDirectly && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenDirectly(template);
                                  setIsBrowsing(false);
                                }}
                                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 transition"
                                title="Abrir y editar en el visor de documentos sin IA"
                              >
                                <Edit3 size={11} />
                                <span>Editar</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onSelect(template);
                                setIsBrowsing(false);
                              }}
                              className="font-semibold text-blue-600 hover:text-blue-800 transition"
                            >
                              {isActive ? 'Activa' : 'Seleccionar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div className={cn('rounded-xl border p-3.5 text-xs shadow-xs', classes.status)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={15} />
              <span>Plantilla activa: {selectedTemplate.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewTemplate(selectedTemplate);
                  setModalTab('document');
                }}
                className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 opacity-85 hover:opacity-100"
              >
                <Eye size={12} /> Ver documento completo
              </button>
              {onOpenDirectly && (
                <button
                  type="button"
                  onClick={() => onOpenDirectly(selectedTemplate)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Edit3 size={12} /> Abrir en editor
                </button>
              )}
            </div>
          </div>
          <p className="mt-1.5 leading-5 text-slate-600">
            {selectedTemplate.output}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {selectedTemplate.requiredFields.map((field) => (
              <span
                key={field}
                className="rounded-md border border-black/5 bg-white/80 px-2 py-0.5 text-xs text-slate-700"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(previewTemplate)}
        onClose={() => setPreviewTemplate(null)}
        className="max-w-2xl"
      >
        {previewTemplate && (
          <div className="space-y-4">
            <ModalHeader>
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {previewTemplate.intentGroup || 'Plantilla Jurídica'}
                </span>
                <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setModalTab('document')}
                    className={cn(
                      'rounded-md px-2.5 py-1 transition font-bold',
                      modalTab === 'document' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Machote Completo
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('structure')}
                    className={cn(
                      'rounded-md px-2.5 py-1 transition font-bold',
                      modalTab === 'structure' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Requisitos & Estructura
                  </button>
                </div>
              </div>
              <ModalTitle className="mt-2 text-lg font-bold text-slate-900">
                {previewTemplate.title}
              </ModalTitle>
              <p className="text-xs text-slate-500">
                {previewTemplate.description}
              </p>
            </ModalHeader>

            <ModalContent className="max-h-[60vh] space-y-4 overflow-y-auto py-1 pr-1 text-xs">
              {modalTab === 'document' ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <article className="prose-legal text-xs leading-relaxed text-slate-800">
                    <ReactMarkdown>{fullPreviewBody}</ReactMarkdown>
                  </article>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <span className="font-bold text-slate-700">Entregable proyectado:</span>
                    <p className="mt-1 leading-relaxed text-slate-600">
                      {previewTemplate.output}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800">
                      Requisitos mínimos y variables ({previewTemplate.requiredFields.length}):
                    </span>
                    <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {previewTemplate.requiredFields.map((field, idx) => (
                        <div
                          key={field}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700"
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                            {idx + 1}
                          </span>
                          <span className="truncate">{field}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800">Instrucción y alcance técnico:</span>
                    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-700">
                      {previewTemplate.prompt}
                    </div>
                  </div>
                </div>
              )}
            </ModalContent>

            <ModalFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5">
                {onExportDirectly && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onExportDirectly(previewTemplate, 'pdf');
                      }}
                      title="Exportar machote directamente a PDF"
                    >
                      <Download size={13} className="mr-1" /> PDF
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onExportDirectly(previewTemplate, 'docx');
                      }}
                      title="Exportar machote directamente a Word (.docx)"
                    >
                      <FileDown size={13} className="mr-1" /> Word (.docx)
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPreviewTemplate(null)}
                >
                  Cerrar
                </Button>
                {onOpenDirectly && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                    onClick={() => {
                      onOpenDirectly(previewTemplate);
                      setPreviewTemplate(null);
                      setIsBrowsing(false);
                    }}
                  >
                    <Edit3 size={13} className="mr-1.5 text-emerald-700" />
                    Abrir y Editar
                  </Button>
                )}
                <Button
                  size="sm"
                  className={classes.primaryBtn}
                  onClick={() => {
                    onSelect(previewTemplate);
                    setPreviewTemplate(null);
                    setIsBrowsing(false);
                  }}
                >
                  <Sparkles size={13} className="mr-1.5" />
                  Personalizar con IA
                </Button>
              </div>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
};
