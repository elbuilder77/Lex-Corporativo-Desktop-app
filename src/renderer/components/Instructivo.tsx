import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudOff,
  FileSignature,
  FolderOpen,
  History,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  User,
  Wifi,
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
  const {
    notify,
    runtimeHealth,
    runtimeHealthLoading,
    refreshRuntimeHealth,
    setActiveTab,
  } = useUiStore();
  const { recentCases, fetchRecentCases, loadCase, switchModule } = useCaseStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'Puedo guiarte sobre las herramientas y flujos de Lex Corporativo Desktop. No respondo consultas jurídicas desde este instructivo.',
    },
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
    if (helpOpen && (messages.length > 1 || isGenerating)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [helpOpen, isGenerating, messages]);

  const checkReady = (id: string) => runtimeHealth?.checks.some((check) => check.id === id && check.ok) ?? false;
  const vaultReady = checkReady('vault');
  const ragReady = checkReady('rag') && checkReady('embeddings');
  const localGenerationReady = Boolean(runtimeHealth?.rust.binaryExists && runtimeHealth.rust.expectedGgufModelExists);
  const byokActive = Boolean(byokSettings?.enabled && byokSettings.hasApiKey);
  const providerLabel = byokSettings?.provider === 'openai'
    ? 'OpenAI'
    : byokSettings?.provider === 'anthropic'
      ? 'Anthropic Claude'
      : 'Gemini';

  const healthLabel = runtimeHealthLoading && !runtimeHealth
    ? 'Comprobando recursos'
    : runtimeHealth?.status === 'blocked'
      ? 'Revisión local necesaria'
      : vaultReady && ragReady
        ? 'Espacio local disponible'
        : 'Recursos locales incompletos';

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
    if (!textToSend.trim() || isGenerating || !localGenerationReady) return;

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
      notify(error?.message || 'No se pudo consultar el instructivo local.', 'error');
      setMessages((current) => [
        ...current,
        { role: 'model', text: 'El instructivo no pudo generar una respuesta. Comprueba el motor y el modelo local en Configuración.' },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 text-slate-700">
      <div className="mx-auto w-full max-w-7xl px-5 py-5 md:px-8 md:py-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <img src={logoMarkUrl} alt="Lex Corporativo" className="h-7 w-7 rounded-md object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-legal-golddark">Estación jurídica local</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Centro de trabajo</h1>
              <p className="mt-1 text-sm text-slate-500">Continúa un asunto o inicia una tarea con el contexto correcto.</p>
            </div>
          </div>
          <div className={cn(
            'inline-flex w-fit items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold',
            runtimeHealth?.status === 'blocked'
              ? 'border-red-200 bg-red-50 text-red-700'
              : vaultReady && ragReady
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-800',
          )}>
            {runtimeHealth?.status === 'blocked' ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
            {healthLabel}
            <button
              type="button"
              onClick={() => void refreshRuntimeHealth()}
              disabled={runtimeHealthLoading}
              className="ml-1 rounded-md p-1 hover:bg-black/5 disabled:opacity-40"
              aria-label="Volver a comprobar los recursos locales"
            >
              <RefreshCw size={13} className={runtimeHealthLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <section aria-labelledby="capabilities-title" className="mt-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="capabilities-title" className="text-sm font-bold text-slate-900">Capacidades disponibles</h2>
              <p className="mt-0.5 text-xs text-slate-500">Estado real de esta estación.</p>
            </div>
            <button type="button" onClick={() => navigate('/settings?tab=ia')} className="text-xs font-bold text-slate-600 hover:text-slate-950">Configurar IA</button>
          </div>
          <div className="mt-2 grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:grid-cols-3 md:divide-x md:divide-slate-100">
            <article className="flex items-center gap-3 p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><Search size={17} /></span>
              <div className="min-w-0">
                <h3 className="truncate text-xs font-bold text-slate-900">Corpus y búsqueda</h3>
                <p className={cn('mt-0.5 text-[11px] font-semibold', ragReady ? 'text-emerald-700' : 'text-amber-700')}>{ragReady ? 'Disponible en local' : 'Requiere revisión'}</p>
              </div>
            </article>
            <article className="flex items-center gap-3 border-t border-slate-100 p-3.5 md:border-t-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><CloudOff size={17} /></span>
              <div className="min-w-0">
                <h3 className="truncate text-xs font-bold text-slate-900">Generación local</h3>
                <p className={cn('mt-0.5 text-[11px] font-semibold', localGenerationReady ? 'text-emerald-700' : 'text-amber-700')}>{localGenerationReady ? 'Motor y modelo listos' : 'Motor o modelo no instalado'}</p>
              </div>
            </article>
            <article className="flex items-center gap-3 border-t border-slate-100 p-3.5 md:border-t-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Wifi size={17} /></span>
              <div className="min-w-0">
                <h3 className="truncate text-xs font-bold text-slate-900">API propia (BYOK)</h3>
                <p className={cn('mt-0.5 truncate text-[11px] font-semibold', byokActive ? 'text-blue-700' : 'text-slate-500')}>{byokActive ? providerLabel : 'Desactivada'}</p>
              </div>
            </article>
          </div>
        </section>

        <section aria-labelledby="tasks-title" className="mt-6">
          <h2 id="tasks-title" className="text-sm font-bold text-slate-900">¿Qué necesitas hacer?</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => openWorkspace('/fiscal', 'fiscal-preparation', 'fiscal')} className="group flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700"><BriefcaseBusiness size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-950">Preparar operación fiscal</span><span className="mt-0.5 block truncate text-xs text-slate-600">Contexto, archivos y revisión preventiva.</span></span>
              <ArrowRight size={16} className="shrink-0 text-emerald-800 transition group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => openWorkspace('/buscador')} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-indigo-200 hover:shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><Search size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-950">Buscar fundamento</span><span className="mt-0.5 block truncate text-xs text-slate-600">Consulta el corpus fiscal o mercantil.</span></span>
              <ArrowRight size={16} className="shrink-0 text-slate-500 transition group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => openWorkspace('/ingenieria-juridica', 'drafting', 'engineering')} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-amber-200 hover:shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><FileSignature size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-950">Crear documento o contrato</span><span className="mt-0.5 block truncate text-xs text-slate-600">Plantilla o archivo propio, sin flujos fiscales.</span></span>
              <ArrowRight size={16} className="shrink-0 text-slate-500 transition group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => openWorkspace('/portafolio')} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-slate-300 hover:shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><FolderOpen size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-950">Revisar portafolio</span><span className="mt-0.5 block truncate text-xs text-slate-600">Asuntos, análisis y documentos guardados.</span></span>
              <ArrowRight size={16} className="shrink-0 text-slate-500 transition group-hover:translate-x-1" />
            </button>
          </div>
        </section>

        <section aria-labelledby="recent-title" className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_0.5fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id="recent-title" className="flex items-center gap-2 text-sm font-bold text-slate-900"><History size={16} /> Asuntos recientes</h2>
                <p className="mt-1 text-xs text-slate-500">Continúa con el estado conservado en este dispositivo.</p>
              </div>
              <button type="button" onClick={() => navigate('/portafolio')} className="text-xs font-bold text-slate-600 hover:text-slate-950">Ver todos</button>
            </div>
            {recentCases.length > 0 ? (
              <div className="mt-4 divide-y divide-slate-100">
                {recentCases.slice(0, 3).map((savedCase) => (
                  <button key={savedCase.id} type="button" onClick={() => void resumeCase(savedCase)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50">
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', savedCase.module === 'fiscal' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                      {savedCase.module === 'fiscal' ? <BriefcaseBusiness size={16} /> : <FileSignature size={16} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-800">{savedCase.name}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">{savedCase.module === 'fiscal' ? 'Fiscal' : 'Documentos y contratos'} · {formatCaseDate(savedCase.date)}</span>
                    </span>
                    <ArrowRight size={15} className="text-slate-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-slate-700">Aún no hay asuntos guardados.</p>
                <p className="mt-1 text-xs text-slate-500">Inicia una operación fiscal o un documento para crear el primero.</p>
              </div>
            )}
          </div>

          <aside className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white shadow-sm lg:block">
            <CheckCircle2 size={19} className="shrink-0 text-legal-gold" />
            <div><h2 className="text-sm font-bold lg:mt-3">Privacidad local</h2>
            <p className="mt-1 text-xs leading-5 text-slate-300">La bóveda, el corpus y la trazabilidad permanecen en este equipo. Si activas BYOK, cada operación compatible envía al proveedor la instrucción, texto extraído seleccionado y fundamentos recuperados.</p></div>
          </aside>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button type="button" onClick={() => setHelpOpen((open) => !open)} className="flex w-full items-center gap-3 p-5 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Bot size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">Instructivo interactivo</span>
              <span className="mt-0.5 block text-xs text-slate-500">Pregunta cómo usar la aplicación. Requiere el motor y el modelo local.</span>
            </span>
            {helpOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {helpOpen && (
            <div className="border-t border-slate-100 p-5">
              {!localGenerationReady && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>El instructivo no puede generar respuestas porque la inferencia local no está instalada. Puedes seguir usando las tareas que no requieren generación o configurar los recursos.</span>
                </div>
              )}
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {messages.map((message, index) => (
                    <motion.div key={`${message.role}-${index}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3 rounded-xl border p-4 text-sm leading-6', message.role === 'user' ? 'ml-auto max-w-[85%] border-emerald-100 bg-emerald-50' : 'max-w-[95%] border-slate-200 bg-slate-50')}>
                      {message.role === 'user' ? <User size={17} className="mt-1 shrink-0 text-slate-400" /> : <Bot size={17} className="mt-1 shrink-0 text-indigo-600" />}
                      <span className="whitespace-pre-wrap">{message.text}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isGenerating && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={15} className="animate-spin" /> Generando guía local…</div>}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={(event) => { event.preventDefault(); void handleSend(input); }} className="mt-4 flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 focus-within:border-slate-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/10">
                <input type="text" value={input} onChange={(event) => setInput(event.target.value)} disabled={!localGenerationReady || isGenerating} placeholder={localGenerationReady ? 'Pregunta cómo usar un flujo o una herramienta…' : 'Inferencia local no instalada'} className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed" />
                <button type="submit" disabled={!localGenerationReady || isGenerating || !input.trim()} className="rounded-lg bg-slate-900 p-2 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Enviar pregunta al instructivo"><Send size={16} /></button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Instructivo;
