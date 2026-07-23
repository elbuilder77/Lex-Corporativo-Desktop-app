import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Settings2, Play, Scale, CheckCircle, Check, History, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUiStore } from '../store/useUiStore';
import { DocumentAnalysisResult, AnalyzedDocumentHistory } from '../types';
import { useCaseStore } from '../store/useCaseStore';
import { cn } from '../lib/utils';
import { ensureModuleActivity } from '../lib/case-access';
import { MODULE_CONTENT } from '../lib/product-content';
import { getAnalysisPromptProfile } from '../../shared/legal-contracts';
import { generateAnalysisPDF } from '../lib/pdf-export';
import {
  FISCAL_ANALYSIS_WORKFLOWS,
  type FiscalAnalysisTab,
} from '../lib/fiscal-workflows';
import logoUrl from '../assets/logo-lockup-transparent.png';
import { DocumentAnalysisHistoryPanel } from './document-analysis/DocumentAnalysisHistoryPanel';
import { DocumentAnalysisResultPanel } from './document-analysis/DocumentAnalysisResultPanel';

interface DocumentAnalysisViewProps {
  fiscalWorkflow?: FiscalAnalysisTab;
}

const ANALYSIS_STEPS = [
  { id: 1, label: 'Extrayendo texto', icon: <FileText size={14} /> },
  { id: 2, label: 'Identificando cláusulas', icon: <Settings2 size={14} /> },
  { id: 3, label: 'Buscando fundamentos en corpus local', icon: <Scale size={14} /> },
  { id: 4, label: 'Generando análisis estructurado', icon: <Play size={14} /> },
  { id: 5, label: 'Preparando dictamen PDF', icon: <CheckCircle size={14} /> },
];

export const DocumentAnalysisView: React.FC<DocumentAnalysisViewProps> = ({
  fiscalWorkflow = 'analysis',
}) => {
  const { notify } = useUiStore();
  const { currentCaseId, setCurrentCaseId, addFiscalAnalysis, fiscalAnalysisHistory } = useCaseStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fiscalContent = FISCAL_ANALYSIS_WORKFLOWS[fiscalWorkflow];
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [focusInstruction, setFocusInstruction] = useState(fiscalContent.initialInstruction);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const [expandedRisks, setExpandedRisks] = useState<Record<number, boolean>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const history = fiscalAnalysisHistory;
  const content = MODULE_CONTENT.fiscal.analysis;
  const viewTitle = fiscalContent.title;
  const viewSubtitle = fiscalContent.subtitle;
  const focusLabel = fiscalContent.focusLabel;
  const focusPlaceholder = fiscalContent.focusPlaceholder;
  const expectedOutputs = fiscalContent.expectedOutputs;

  useEffect(() => {
    setSelectedFiles([]);
    setFocusInstruction(fiscalContent.initialInstruction);
    setResult(null);
    setCurrentStep(0);
    setShowHistory(false);
  }, [fiscalContent.initialInstruction]);

  useEffect(() => {
    if (!showHistory) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowHistory(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHistory]);

  const applySelectedFiles = (files: File[]) => {
    const pdfFiles = files.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    const rejected = files.length - pdfFiles.length;
    const oversized = pdfFiles.filter((file) => file.size > 50 * 1024 * 1024);
    const accepted = pdfFiles.filter((file) => file.size <= 50 * 1024 * 1024).slice(0, 10);

    setSelectedFiles(accepted);
    if (rejected > 0) notify('Solo se aceptan documentos PDF.', 'warning', 'Archivo no compatible');
    if (oversized.length > 0) notify('Cada PDF debe pesar menos de 50 MB.', 'warning', 'Archivo demasiado grande');
    if (pdfFiles.length > 10) notify('Se procesarán como máximo 10 documentos por análisis.', 'info', 'Límite de documentos');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) applySelectedFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        resolve(res.split(',')[1] || res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      notify('Por favor seleccione al menos un documento.', 'error');
      return;
    }
    setIsAnalyzing(true);
    setCurrentStep(1);
    setResult(null);
    setShowHistory(false);

    try {
      const targetCaseId = await ensureModuleActivity('fiscal', currentCaseId);
      setCurrentCaseId(targetCaseId);

      window.lexDesktop.analysis.onProgress((progress: any) => {
        if (progress.step) setCurrentStep(progress.step);
      });

      const filesData = await Promise.all(selectedFiles.map(async f => ({
        name: f.name,
        mimeType: f.type || 'application/pdf',
        base64: await readFileAsBase64(f)
      })));

      const response = await window.lexDesktop.analysis.analyzeDocument({
        caseId: targetCaseId,
        files: filesData,
        focusedInstruction: focusInstruction,
        ecosystem: 'fiscal',
        module: 'analysis',
        currentDocumentOnly: true,
        promptProfile: getAnalysisPromptProfile('fiscal'),
      });
      
      setCurrentStep(5);

      let parsedResult: DocumentAnalysisResult;
      try {
        parsedResult = JSON.parse(response.result) as DocumentAnalysisResult;
      } catch (e) {
        notify('Advertencia: El modelo generó un formato degradado. Se intentará recuperar la estructura.', 'warning');
        parsedResult = {
          summary: response.result,
          documentType: 'Documento Jurídico',
          riskScore: 0,
          detectedParties: [],
          detectedObligations: [],
          missingClauses: [],
          missingData: [],
          risks: [],
          recommendedActions: [],
          checklist: [],
          legalFoundations: [],
          confidence: 'low',
          engine: 'hybrid'
        };
      }

      parsedResult.engine = response.engine === 'byok' ? 'byok' : 'gemma-local';

      setResult(parsedResult);

      const historyItem: AnalyzedDocumentHistory = {
        id: response.requestId || `analysis_${Date.now()}`,
        requestId: response.requestId,
        ecosystem: 'fiscal',
        promptProfile: response.promptProfile,
        currentDocumentOnly: true,
        timestamp: new Date().toISOString(),
        files: selectedFiles.map(f => ({ name: f.name, type: f.type })),
        result: parsedResult,
        module: 'fiscal',
        customInstruction: focusInstruction,
        executionMode: response.requestedExecutionMode,
        engine: response.engine,
      };

      addFiscalAnalysis(historyItem);

      const providerLabel = response.provider === 'openai' ? 'OpenAI' : response.provider === 'anthropic' ? 'Claude' : 'Gemini';
      notify(`Revisión completada con ${response.engine === 'byok' ? `${providerLabel} BYOK` : 'el motor local'}.`, 'success');
      
      setTimeout(() => {
        setCurrentStep(0);
        setIsAnalyzing(false);
      }, 1000);

    } catch (error: any) {
      setIsAnalyzing(false);
      setCurrentStep(0);
      notify(error?.message || 'No se pudo completar el análisis documental local.', 'error');
    }
  };

  const exportReport = async () => {
    if (!result) return;

    setIsExportingPdf(true);
    try {
      const formatList = (items?: string[]) => items?.length ? items.join('\n') : 'Sin hallazgos registrados.';
      const exportResult = await generateAnalysisPDF({
        title: fiscalContent.reportTitle,
        subtitle: viewTitle,
        riskScore: result.riskScore,
        summary: result.summary,
        pillars: [
          {
            title: 'TIPO DE DOCUMENTO',
            content: result.documentType || 'No identificado.',
          },
          {
            title: 'PARTES IDENTIFICADAS',
            content: formatList(result.detectedParties),
          },
          {
            title: 'OBLIGACIONES DETECTADAS',
            content: formatList(result.detectedObligations),
          },
          {
            title: 'INFORMACIÓN O CLÁUSULAS FALTANTES',
            content: formatList([...(result.missingClauses || []), ...(result.missingData || [])]),
          },
        ],
        risks: result.risks?.map((risk) => (
          `[${risk.severity.toUpperCase()}] ${risk.title}: ${risk.explanation}`
        )) || [],
        recommendation: formatList(result.recommendedActions),
        moduleName: 'Lex Corporativo · Fiscal',
        filenamePrefix: fiscalContent.fileNamePrefix,
      });

      if (exportResult.success) {
        notify('Dictamen exportado en formato PDF.', 'success');
      }
    } catch (error: any) {
      notify(error?.message || 'No se pudo exportar el dictamen en PDF.', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-700 overflow-hidden font-sans relative">
      <header className="px-4 md:px-8 py-3 border-b border-slate-200 bg-white/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
            <Scale className="text-legal-gold" size={16} />
          </div>
          <h2 className="text-lg font-serif font-bold text-slate-900 tracking-tight">
            {viewTitle}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={cn("px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 rounded-lg border transition-all cursor-pointer", showHistory ? "bg-slate-100 text-slate-900 border-slate-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700")}
          >
            <History size={14} /> Historial ({history.length})
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide relative">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <p className="max-w-3xl text-sm leading-relaxed text-slate-500">{viewSubtitle}</p>
          
          {/* Input Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-200"></div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Paso 1: Evidencia Documental</label>
              <motion.div 
                whileHover={{ scale: isAnalyzing ? 1 : 1.01 }}
                whileTap={{ scale: isAnalyzing ? 1 : 0.99 }}
                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (!isAnalyzing) setIsDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (event.currentTarget === event.target) setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  if (!isAnalyzing) applySelectedFiles(Array.from(event.dataTransfer.files));
                }}
                role="button"
                tabIndex={isAnalyzing ? -1 : 0}
                onKeyDown={(event) => {
                  if (!isAnalyzing && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label="Seleccionar o arrastrar documentos PDF"
                className={cn(
                  "border-2 border-dashed rounded-xl p-5 md:p-8 text-center cursor-pointer transition-all duration-300 mb-4",
                  isAnalyzing ? 'border-slate-300 bg-slate-100 opacity-50 cursor-not-allowed' : 
                  isDragging ? 'border-legal-gold bg-legal-gold/10 shadow-[0_0_20px_rgba(212,175,55,0.15)]' :
                  selectedFiles.length > 0 ? 'border-legal-gold/50 bg-legal-gold/5' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                )}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,application/pdf" multiple disabled={isAnalyzing} />
                <Upload className={cn("mx-auto mb-3", selectedFiles.length > 0 ? 'text-legal-gold' : 'text-slate-400')} size={28} />
                {selectedFiles.length > 0 ? (
                  <div>
                    <div className="text-base font-bold text-slate-900">{selectedFiles.length} documento{selectedFiles.length === 1 ? '' : 's'} listo{selectedFiles.length === 1 ? '' : 's'}</div>
                    <p className="mt-1 text-sm text-slate-500">Puede volver a seleccionar o arrastrar para reemplazar la lista.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-base font-bold text-slate-700">Arrastre o seleccione los contratos/documentos</p>
                    <p className="text-sm text-slate-500 mt-1">El archivo se extrae localmente; tú eliges el motor antes de iniciar.</p>
                  </>
                )}
              </motion.div>

              {selectedFiles.length > 0 && (
                <ul className="mb-4 space-y-2" aria-label="Documentos seleccionados">
                  {selectedFiles.map((file, index) => (
                    <li key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <FileText size={15} className="shrink-0 text-slate-500" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{file.name}</span>
                      <span className="text-xs font-medium text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
                        }}
                        disabled={isAnalyzing}
                        className="rounded-md p-1 text-slate-400 hover:bg-red-900/30 hover:text-red-400 disabled:opacity-40 transition-colors"
                        aria-label={`Quitar ${file.name}`}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Expected Outputs Checklist */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 shadow-inner">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  El dictamen final incluirá:
                </span>
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {expectedOutputs.map((output) => (
                    <li key={output} className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                      <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                      <span>{output}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Paso 2: {focusLabel}</label>
              <textarea
                value={focusInstruction}
                onChange={(e) => setFocusInstruction(e.target.value)}
                placeholder={focusPlaceholder}
                disabled={isAnalyzing}
                className="h-24 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-4 text-base text-slate-800 shadow-inner outline-none transition-all placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/20"
              />
            </div>

            <div className="flex flex-col items-end gap-1.5 pt-2">
              <motion.button
                whileHover={{ scale: selectedFiles.length === 0 || isAnalyzing ? 1 : 1.02 }}
                whileTap={{ scale: selectedFiles.length === 0 || isAnalyzing ? 1 : 0.98 }}
                onClick={handleAnalyze}
                disabled={selectedFiles.length === 0 || isAnalyzing}
                className="px-8 py-3.5 bg-slate-900 text-white border border-slate-800 text-sm font-bold uppercase tracking-widest rounded-xl disabled:opacity-50 flex items-center gap-3 shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]" />
                
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-legal-gold/30 border-t-legal-gold rounded-full animate-spin" />
                    <span className="animate-pulse tracking-widest">Ejecutando análisis...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} className="fill-current" /> 
                    {fiscalContent.actionLabel}
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Progress Steps */}
          {isAnalyzing && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-in fade-in zoom-in duration-300">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Estado de la Máquina de Inferencia</h3>
              <div className="space-y-4">
                {ANALYSIS_STEPS.map((step) => {
                  const isPast = currentStep > step.id;
                  const isCurrent = currentStep === step.id;
                  return (
                    <div key={step.id} className={cn("flex items-center gap-4 transition-all", isPast ? 'text-emerald-600' : isCurrent ? 'text-slate-900' : 'text-slate-400')}>
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2", isPast ? 'border-emerald-500 bg-emerald-50' : isCurrent ? 'border-slate-400 bg-slate-100 animate-pulse' : 'border-slate-200 bg-slate-50')}>
                        {isPast ? <Check size={14} /> : step.icon}
                      </div>
                      <span className={cn("text-sm tracking-wide", isCurrent ? 'font-bold' : 'font-medium')}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Result Panel */}
          {result && !isAnalyzing && (
            <DocumentAnalysisResultPanel
              result={result}
              reportTitle={fiscalContent.reportTitle}
              expandedRisks={expandedRisks}
              zoomLevel={zoomLevel}
              isExportingPdf={isExportingPdf}
              onToggleRisk={(index) => setExpandedRisks((current) => ({ ...current, [index]: !current[index] }))}
              onZoomChange={setZoomLevel}
              onExport={() => void exportReport()}
            />
          )}
        </div>

        <DocumentAnalysisHistoryPanel
          open={showHistory}
          history={history}
          onClose={() => setShowHistory(false)}
          onSelect={(item) => {
            setResult(item.result);
            setShowHistory(false);
          }}
        />
      </div>
    </div>
  );
};

export default DocumentAnalysisView;
