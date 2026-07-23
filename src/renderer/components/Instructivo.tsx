import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  FileSignature,
  FolderOpen,
  History,
  Loader2,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useCaseStore } from '../store/useCaseStore';
import { useUiStore } from '../store/useUiStore';
import type { ModuleTab, SavedCase } from '../types';
import logoMarkUrl from '../assets/logo-mark.png';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const formatCaseDate = (value?: string) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(date);
};

export const Instructivo: React.FC = () => {
  const navigate = useNavigate();
  const { notify, runtimeHealth, refreshRuntimeHealth, setActiveTab, requestProcessingSetup } = useUiStore();
  const { recentCases, fetchRecentCases, loadCase, switchModule } = useCaseStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Puedo ayudarte a ubicar una herramienta o completar un flujo. No respondo consultas jurídicas desde esta guía.' },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [byokSettings, setByokSettings] = useState<Awaited<ReturnType<typeof window.lexDesktop.byok.getSettings>> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void refreshRuntimeHealth();
    void fetchRecentCases();
    window.lexDesktop.byok.getSettings().then(setByokSettings).catch(() => setByokSettings(null));
  }, [fetchRecentCases, refreshRuntimeHealth]);

  useEffect(() => {
    if (helpOpen && (messages.length > 1 || isGenerating)) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [helpOpen, isGenerating, messages]);

  const vaultReady = runtimeHealth?.capabilities.vault.ready ?? false;
  const corpusReady = runtimeHealth?.capabilities.legalSearch.ready ?? false;
  const localReady = runtimeHealth?.capabilities.localAssistant.ready ?? false;
  const byokActive = Boolean(byokSettings?.enabled && byokSettings.hasApiKey);
  const guideReady = localReady || byokActive;
  const providerLabel = byokSettings?.provider === 'openai'
    ? 'OpenAI'
    : byokSettings?.provider === 'anthropic'
      ? 'Claude'
      : 'Gemini';
  const processingLabel = byokActive
    ? `${providerLabel} conectado`
    : localReady
      ? 'Procesamiento local'
      : 'Elegir procesamiento';
  const processingDetail = byokActive
    ? 'La generación compatible usa tu propia API.'
    : localReady
      ? 'La generación permanece en este equipo.'
      : 'Conecta una API propia o completa el motor local antes de generar.';

  const openWorkspace = (path: string, tab?: ModuleTab, module?: 'engineering' | 'fiscal') => {
    if (tab) setActiveTab(tab);
    if (module) switchModule(module);
    navigate(path);
  };

  const resumeCase = async (savedCase: SavedCase) => {
    await loadCase(savedCase);
    const fiscal = savedCase.module === 'fiscal';
    if (fiscal) setActiveTab('fiscal-consultation');
    navigate(fiscal ? '/fiscal' : '/ingenieria-juridica');
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isGenerating) return;
    if (!guideReady) {
      requestProcessingSetup('usar la guía interactiva');
      return;
    }

    const userMsg = textToSend.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', text: userMsg } as Message];
    setMessages(newMessages);
    setIsGenerating(true);
    try {
      const response = await window.lexDesktop.assistant.askInstructivo({
        query: userMsg,
        history: newMessages.slice(-5, -1).map((message) => ({ role: message.role, text: message.text })),
      });
      setMessages((current) => [...current, { role: 'model', text: response.result }]);
    } catch (error: any) {
      notify(error?.message || 'No se pudo consultar la guía.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const taskRows = [
    {
      title: 'Preparar una operación fiscal',
      description: 'Organiza contexto, evidencia y siguientes pasos preventivos.',
      icon: BriefcaseBusiness,
      tone: 'bg-emerald-50 text-emerald-800',
      action: () => openWorkspace('/fiscal', 'fiscal-preparation', 'fiscal'),
    },
    {
      title: 'Crear o corregir un documento',
      description: 'Parte de una plantilla o de tu propio archivo.',
      icon: FileSignature,
      tone: 'bg-amber-50 text-amber-800',
      action: () => openWorkspace('/ingenieria-juridica', 'drafting', 'engineering'),
    },
    {
      title: 'Buscar fundamento',
      description: 'Consulta directamente el corpus fiscal o mercantil.',
      icon: Search,
      tone: 'bg-blue-50 text-blue-800',
      action: () => openWorkspace('/buscador'),
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#f5f2eb] text-slate-700">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <header className="flex flex-col gap-4 border-b border-slate-300/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img src={logoMarkUrl} alt="Lex Corporativo" className="h-10 w-10 rounded-lg object-contain" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-legal-golddark">Lex Corporativo</p>
              <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-slate-950">Estación de trabajo</h1>
              <p className="mt-1 text-sm text-slate-600">Retoma un asunto o comienza una tarea.</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/settings?tab=ia')} className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-slate-400 hover:text-slate-950">
            <CircleDot size={14} className={byokActive ? 'text-blue-600' : localReady ? 'text-emerald-700' : 'text-amber-700'} />
            {processingLabel}
            <Settings2 size={14} className="text-slate-400" />
          </button>
        </header>

        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
          <main className="min-w-0 space-y-8">
            <section aria-labelledby="recent-title">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Tu trabajo</p>
                  <h2 id="recent-title" className="mt-1 font-serif text-xl font-bold text-slate-950">Continúa donde lo dejaste</h2>
                </div>
                <button type="button" onClick={() => navigate('/portafolio')} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-950">Ver portafolio <ArrowRight size={14} /></button>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                {recentCases.length > 0 ? (
                  <div className="divide-y divide-slate-200">
                    {recentCases.slice(0, 4).map((savedCase) => (
                      <button key={savedCase.id} type="button" onClick={() => void resumeCase(savedCase)} className="group flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-slate-50">
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', savedCase.module === 'fiscal' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
                          {savedCase.module === 'fiscal' ? <BriefcaseBusiness size={16} /> : <FileSignature size={16} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-900">{savedCase.name}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{savedCase.module === 'fiscal' ? 'Fiscal' : 'Documentos y contratos'} · {formatCaseDate(savedCase.date)}</span>
                        </span>
                        <ArrowRight size={15} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-6">
                    <History size={20} className="shrink-0 text-slate-400" />
                    <div><p className="text-sm font-bold text-slate-800">Tu primer asunto empieza aquí.</p><p className="mt-1 text-xs text-slate-500">Elige una tarea abajo; el progreso se guardará en este equipo.</p></div>
                  </div>
                )}
              </div>
            </section>

            <section aria-labelledby="tasks-title">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Nuevo trabajo</p>
              <h2 id="tasks-title" className="mt-1 font-serif text-xl font-bold text-slate-950">¿Qué necesitas resolver?</h2>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm divide-y divide-slate-200">
                {taskRows.map((task) => {
                  const Icon = task.icon;
                  return (
                    <button key={task.title} type="button" onClick={task.action} className="group flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-slate-50">
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', task.tone)}><Icon size={19} /></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-950">{task.title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-600">{task.description}</span></span>
                      <ArrowRight size={16} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
                    </button>
                  );
                })}
              </div>
            </section>
          </main>

          <aside className="space-y-6">
            <section className="border-l-2 border-legal-gold pl-4" aria-labelledby="processing-title">
              <h2 id="processing-title" className="text-sm font-bold text-slate-950">Cómo se procesará</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">{processingDetail}</p>
              <button type="button" onClick={() => navigate('/settings?tab=ia')} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-black">Cambiar modo <ArrowRight size={13} /></button>
            </section>

            <section className="border-t border-slate-300 pt-5" aria-labelledby="local-status-title">
              <h2 id="local-status-title" className="text-sm font-bold text-slate-950">Base de trabajo local</h2>
              <div className="mt-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-slate-600"><FolderOpen size={14} /> Portafolio cifrado</span><strong className={vaultReady ? 'text-emerald-800' : 'text-amber-800'}>{vaultReady ? 'Listo' : 'Revisar'}</strong></div>
                <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-slate-600"><Search size={14} /> Corpus e índice</span><strong className={corpusReady ? 'text-emerald-800' : 'text-amber-800'}>{corpusReady ? 'Listo' : 'Revisar'}</strong></div>
              </div>
              {(!vaultReady || !corpusReady) && <button type="button" onClick={() => navigate('/settings?tab=preferences')} className="mt-3 text-xs font-bold text-amber-900 hover:text-amber-950">Revisar instalación</button>}
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
              <button type="button" onClick={() => setHelpOpen((open) => !open)} className="flex w-full items-center gap-3 p-4 text-left">
                <Bot size={18} className="text-slate-700" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-950">Guía de la aplicación</span><span className="mt-0.5 block text-xs text-slate-500">Pregunta cómo completar un flujo.</span></span>
                {helpOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              </button>
              {helpOpen && (
                <div className="border-t border-slate-200 p-4">
                  {!guideReady && <div className="mb-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> Conecta una API propia o completa el motor local para conversar con la guía.</div>}
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    <AnimatePresence initial={false}>
                      {messages.map((message, index) => (
                        <motion.div key={`${message.role}-${index}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2 rounded-lg p-3 text-xs leading-5', message.role === 'user' ? 'ml-6 bg-emerald-50' : 'bg-slate-100')}>
                          {message.role === 'user' ? <User size={14} className="mt-0.5 shrink-0" /> : <Bot size={14} className="mt-0.5 shrink-0" />}<span className="whitespace-pre-wrap">{message.text}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {isGenerating && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Preparando respuesta…</div>}
                    <div ref={messagesEndRef} />
                  </div>
                  <form onSubmit={(event) => { event.preventDefault(); void handleSend(input); }} className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3">
                    <input value={input} onChange={(event) => setInput(event.target.value)} disabled={isGenerating} placeholder={guideReady ? '¿Cómo preparo una operación?' : 'Configura el procesamiento para conversar'} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-slate-700" />
                    <button type="submit" disabled={isGenerating || !input.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white disabled:opacity-30" aria-label="Enviar pregunta"><Send size={15} /></button>
                  </form>
                </div>
              )}
            </section>

            <div className="flex items-start gap-2 border-t border-slate-300 pt-5 text-xs leading-5 text-slate-600">
              {vaultReady ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-700" /> : <ShieldCheck size={15} className="mt-0.5 shrink-0 text-slate-500" />}
              <p>Los asuntos y la trazabilidad permanecen en este equipo. Si usas BYOK, solo la operación compatible envía texto seleccionado al proveedor.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Instructivo;
