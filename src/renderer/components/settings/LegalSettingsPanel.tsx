import React from 'react';
import { ChevronRight, FileText, Info, Shield, Sparkles } from 'lucide-react';
import { BRAND_CONTENT } from '../../lib/product-content';

interface LegalSettingsPanelProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export const LegalSettingsPanel: React.FC<LegalSettingsPanelProps> = ({ onOpenTerms, onOpenPrivacy }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-base font-bold text-slate-950">Acerca de y Legal</h2>
      <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
        Información de la versión, políticas de privacidad y protocolo de responsabilidad de Lex Corporativo.
      </p>
    </div>

    {/* Versión del sistema */}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
          <Info size={18} />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{BRAND_CONTENT.name} Desktop</h3>
          <p className="text-xs text-slate-500">Versión 1.0.0 (Release Candidate 13) · Motor Local SQLite + LanceDB</p>
        </div>
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
        Edición Local Privada
      </span>
    </section>

    {/* Enlaces Legales */}
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={onOpenTerms}
        className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-slate-100 p-2 text-slate-600 group-hover:text-slate-900 transition">
            <FileText size={16} />
          </span>
          <div>
            <span className="block text-xs font-bold text-slate-900">Términos y Condiciones</span>
            <span className="block text-[11px] text-slate-500">Uso responsable del software</span>
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
      </button>

      <button
        type="button"
        onClick={onOpenPrivacy}
        className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-slate-100 p-2 text-slate-600 group-hover:text-slate-900 transition">
            <Shield size={16} />
          </span>
          <div>
            <span className="block text-xs font-bold text-slate-900">Aviso de Privacidad</span>
            <span className="block text-[11px] text-slate-500">Tratamiento local de datos</span>
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
      </button>
    </div>

    {/* Protocolo de IA */}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
        <Sparkles size={15} className="text-legal-gold" />
        Protocolo de Inteligencia y Responsabilidad
      </div>
      <ul className="space-y-2 text-xs leading-relaxed text-slate-600">
        <li className="flex items-start gap-2">
          <span className="text-slate-400 font-bold">•</span>
          <span><strong>Herramienta de Asistencia:</strong> Lex Corporativo es un asistente inteligente de redacción y análisis documental, no sustituye la revisión profesional personalizada.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-slate-400 font-bold">•</span>
          <span><strong>Validación Recomendada:</strong> Todo documento o contrato generado debe ser leído y validado por las partes involucradas antes de su suscripción formal.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-slate-400 font-bold">•</span>
          <span><strong>Corpus Oficial:</strong> Las citas legales provienen de los textos oficiales de las leyes federales mexicanas indexadas localmente en la base de conocimientos.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-slate-400 font-bold">•</span>
          <span><strong>Orden de Búsqueda:</strong> La IA BYOK, cuando está activa, sólo ordena IDs candidatos; los artículos impresos conservan literalmente el texto del corpus local.</span>
        </li>
      </ul>
    </section>
  </div>
);
