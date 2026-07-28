import React, { useEffect, useRef, useState } from 'react';
import { FileSearch, Loader2, Send, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useCaseStore } from '../store/useCaseStore';
import { useUiStore } from '../store/useUiStore';
import { cn } from '../lib/utils';
import { useProcessingGuard } from '../hooks/useProcessingGuard';
import { useAIProcessing } from '../hooks/useAIProcessing';
import { FiscalSaveButton } from './FiscalSaveButton';

const FISCAL_TOPICS = [
  'Deducción',
  'IVA acreditable',
  'CFDI',
  'RESICO',
  'Dividendos',
  'Nómina',
  'Honorarios',
  'Arrendamiento',
  'Materialidad',
  '69-B',
  'Facultades de comprobación',
];

export const FiscalConsultation: React.FC = () => {
  const { fiscalChatHistory: messages, setFiscalChatHistory } = useCaseStore();
  const { notify } = useUiStore();
  const canConsult = useProcessingGuard('legalGeneration', 'responder esta consulta fiscal');
  const [input, setInput] = useState('');
  const { isProcessing, stageLabel, elapsed, execute, cancel } = useAIProcessing();
  const endRef = useRef<HTMLDivElement>(null);
  const hasUserMessages = messages.some((message) => message.role === 'user');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const send = async (value: string) => {
    const query = value.trim();
    if (!query || isProcessing) return;
    if (!canConsult()) return;

    const history = messages.filter((message) => !message.isThinking);
    setInput('');
    setFiscalChatHistory((current) => [
      ...current,
      { role: 'user', text: query },
      { role: 'model', text: '', isThinking: true },
    ]);

    await execute(async (setStage, signal) => {
      try {
        setStage('preparing');
        setStage('searching');
        const response = await window.lexDesktop.assistant.askFiscal({
          query,
          history,
        });

        if (signal.aborted) throw new Error('AbortError');
        setStage('generating');

        setFiscalChatHistory((current) => {
          const next = current.filter((message) => !message.isThinking);
          return [...next, { role: 'model', text: response.result }];
        });
        if (!response.citationsAvailable) {
          notify('El sistema se abstuvo porque no recuperó fundamentos verificables.', 'warning', 'Consulta fiscal');
        }
      } catch (error: any) {
        setFiscalChatHistory((current) => current.filter((message) => !message.isThinking));
        if (error.message !== 'AbortError' && error.name !== 'AbortError') {
          notify(error?.message || 'No se pudo procesar la consulta fiscal.', 'error', 'Consulta fiscal');
        }
        throw error;
      }
    });
  };

  return (
    <div className="flex h-full flex-col bg-slate-50/60">
      <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">
        {!hasUserMessages ? (
          <div className="mx-auto max-w-4xl py-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-fiscal/10 text-fiscal">
                <FileSearch size={24} strokeWidth={1.8} />
              </div>
              <div><h2 className="text-2xl font-bold text-slate-950">Consulta asistida</h2><p className="mt-1 text-sm text-slate-600">Recupera fundamento local y prepara una respuesta.</p></div>
            </div>
            <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Temas frecuentes</p>
              <div className="mt-4 flex flex-wrap gap-2">
              {FISCAL_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => void send(`Deseo consultar sobre ${topic}.`)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-fiscal/40 hover:bg-white hover:text-fiscal"
                >
                  {topic}
                </button>
              ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-5">
            {messages.map((message, index) => (
              <motion.div
                key={`${message.role}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex gap-3 rounded-2xl p-4',
                  message.role === 'user'
                    ? 'ml-auto max-w-[85%] border border-slate-200 bg-white shadow-sm'
                    : 'mr-auto max-w-full',
                )}
              >
                {message.role === 'model' && (
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fiscal text-white">
                    {message.isThinking ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  </span>
                )}
                <div className="min-w-0 flex-1 text-sm leading-7 text-slate-700">
                  {message.isThinking ? (
                    <div className="flex items-center gap-2">
                      <p className="animate-pulse text-slate-500">{stageLabel || 'Recuperando y validando fundamentos fiscales…'}</p>
                      {elapsed > 0 && <span className="text-xs text-slate-400">({elapsed}s)</span>}
                      <button onClick={cancel} className="ml-2 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200">Cancelar</button>
                    </div>
                  ) : message.role === 'model' ? (
                    <div className="prose prose-sm max-w-none prose-slate"><ReactMarkdown>{message.text}</ReactMarkdown></div>
                  ) : (
                    <p className="whitespace-pre-wrap font-medium">{message.text}</p>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white/90 p-4 backdrop-blur">
        {hasUserMessages && <div className="mx-auto mb-2 flex max-w-4xl justify-end"><FiscalSaveButton name="Consulta asistida" /></div>}
        <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-md focus-within:border-fiscal/40 focus-within:ring-4 focus-within:ring-fiscal/10">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            disabled={isProcessing}
            placeholder="Describe tu situación fiscal, deducción o duda normativa…"
            aria-label="Consulta fiscal"
            className="min-h-12 max-h-32 flex-1 resize-none border-0 bg-transparent px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={!input.trim() || isProcessing}
            aria-label="Enviar consulta fiscal"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fiscal text-white transition hover:bg-fiscal-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isProcessing ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiscalConsultation;
