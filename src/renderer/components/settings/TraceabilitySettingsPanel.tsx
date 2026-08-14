import React from 'react';
import { CheckCircle2, Download, ShieldCheck } from 'lucide-react';

interface TraceabilitySettingsPanelProps {
  ledgerStatus: { path: string; exists: boolean; size: number } | null;
  ledgerExporting: boolean;
  ledgerMessage: string;
  onExport: () => void;
}

export const TraceabilitySettingsPanel: React.FC<TraceabilitySettingsPanelProps> = ({
  ledgerStatus,
  ledgerExporting,
  ledgerMessage,
  onExport,
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-base font-bold text-slate-950">Seguridad y Trazabilidad Local</h2>
      <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
        Cada operación de redacción, análisis y consulta genera un registro criptográfico de trazabilidad (Ledger) que acredita la hora, fundamentos utilizados y huella digital sin exponer el contenido de tus contratos.
      </p>
    </div>

    {/* Estado de la bitácora */}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-start gap-3.5">
        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
          <ShieldCheck size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Bitácora Criptográfica de Operaciones (Ledger)
            </h3>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              {ledgerStatus?.exists ? `${Math.max(1, Math.round(ledgerStatus.size / 1024))} KB registrados` : 'Activo (sin registros)'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Registra hashes SHA-256 de las fuentes consultadas y respuestas generadas para brindar evidencia auditable de diligencia legal y cumplimiento.
          </p>
          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-2.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Ruta del archivo local</span>
            <code className="text-xs text-slate-800 break-all font-mono">
              {ledgerStatus?.path || 'Consultando ubicación en este equipo...'}
            </code>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500" role="status">{ledgerMessage}</p>
        <button
          type="button"
          onClick={onExport}
          disabled={ledgerExporting || !ledgerStatus?.exists}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition shadow-xs"
        >
          <Download size={14} /> {ledgerExporting ? 'Exportando...' : 'Exportar bitácora (.jsonl)'}
        </button>
      </div>
    </section>

    {/* Garantías de Cero Telemetría */}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
        Garantías de Privacidad Estricta
      </h3>
      <div className="grid gap-2.5 text-xs text-slate-600">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span><strong>Cero Telemetría:</strong> No recolectamos analíticas, uso de herramientas ni datos personales.</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span><strong>Procesamiento Local:</strong> La búsqueda semántica y el corpus legal se ejecutan al 100% en tu CPU.</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span><strong>Conexión Directa:</strong> Las peticiones de IA viajan directamente de tu computadora al endpoint HTTPS del proveedor elegido.</span>
        </div>
      </div>
    </section>
  </div>
);
