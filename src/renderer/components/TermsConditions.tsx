import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';

interface TermsConditionsProps {
  onBack: () => void;
}

export const TermsConditions: React.FC<TermsConditionsProps> = ({ onBack }) => {
  return (
    <div className="h-full overflow-y-auto bg-slate-50 scrollbar-hide">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 md:py-16">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-legal-950 transition-colors mb-8 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Volver
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-legal-gold/10 rounded-xl flex items-center justify-center">
              <FileText size={20} className="text-legal-gold" />
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-legal-950 tracking-tight">
              Términos y Condiciones
            </h1>
          </div>
          <p className="text-sm text-slate-400 mb-10">Última actualización: 23 de julio de 2026</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="prose prose-slate prose-sm max-w-none space-y-8"
        >
          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">1. Aceptación de los Términos</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Al instalar y utilizar LexCorporativo Desktop (en adelante "el Software"), usted acepta estos Términos y Condiciones en su totalidad. Si no está de acuerdo con alguna parte de estos términos, no deberá utilizar el Software. El uso continuado del Software constituye la aceptación de cualquier modificación a estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">2. Descripción del Servicio</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              LexCorporativo Desktop es una estación jurídica local asistida por inteligencia artificial para derecho corporativo mexicano que ofrece:
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1 mt-3">
              <li>Generación asistida de contratos y documentos jurídicos mercantiles y corporativos.</li>
              <li>Análisis automatizado de documentos legales con identificación de riesgos.</li>
              <li>Generación de borradores de instrumentos jurídicos.</li>
              <li>Acceso a normativa federal mexicana vigente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">3. Naturaleza del Servicio — Limitación Importante</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
              <p className="text-sm text-amber-800 leading-relaxed font-medium">
                El Software es una herramienta de asistencia y orientación jurídica basada en inteligencia artificial. <strong>No constituye asesoría legal profesional, ni sustituye el criterio de un abogado licenciado.</strong>
              </p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Los resultados generados por el Software son orientativos y deben ser verificados por un profesional del derecho antes de ser utilizados en procedimientos legales, contratos vinculantes o cualquier acto jurídico. LexCorporativo no se responsabiliza por decisiones tomadas exclusivamente con base en las respuestas de la inteligencia artificial.
            </p>
          </section>

          <section>
              <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">4. Instalación y Uso Local</h2>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
              <li>La aplicación de escritorio funciona como estación local instalada.</li>
              <li>Usted es responsable de mantener la seguridad física y lógica del equipo donde se instale.</li>
                <li>Debe instalar y usar el software conforme a la licencia adquirida.</li>
                <li>No podrá compartir el instalador, claves de licencia o copias no autorizadas con terceros.</li>
                <li>LexCorporativo se reserva el derecho de revocar licencias que violen estos términos.</li>
            </ul>
          </section>

          <section>
              <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">5. Compra, Licencia y Descarga</h2>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
                <li>La venta, descarga y soporte comercial se gestionan fuera de la aplicación instalada.</li>
                <li>Los términos comerciales aplicables serán los publicados en la página de venta vigente.</li>
                <li>El procesamiento jurídico de portafolios y documentos no requiere conexión a internet.</li>
                <li>Los pagos realizados <strong>no son reembolsables</strong> salvo que la legislación aplicable disponga lo contrario.</li>
              <li>La cancelación evita renovaciones futuras, pero no elimina automáticamente el acceso ya pagado durante el periodo vigente.</li>
              <li>La compra y descarga del instalador se realizan fuera de la aplicación de escritorio, a través de los canales comerciales vigentes de Lex Corporativo.</li>
              <li>Los precios están expresados en Pesos Mexicanos (MXN) e incluyen IVA cuando corresponda.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">6. Uso Aceptable</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">El usuario se compromete a no utilizar el Software para:</p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li>Realizar actividades ilegales o contrarias al orden público.</li>
              <li>Subir documentos que contengan información falsa con el fin de obtener ventajas indebidas.</li>
              <li>Intentar acceder a datos de otros usuarios.</li>
              <li>Realizar ingeniería inversa, descompilar o intentar extraer el código fuente del Software.</li>
              <li>Utilizar bots, scrapers o medios automatizados para acceder al servicio.</li>
              <li>Usar el Software de forma automatizada o abusiva para generar resultados masivos fuera del alcance de la licencia adquirida.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">7. Propiedad Intelectual</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Todos los elementos del Software (diseño, código, marca, logotipos, textos y demás contenidos) son propiedad exclusiva de LexCorporativo o sus licenciantes. Queda prohibida su reproducción, distribución o uso no autorizado. Los documentos, plantillas o machotes que el usuario cargue siguen siendo propiedad del usuario; LexCorporativo no adquiere ningún derecho sobre ellos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">8. Disponibilidad del Servicio</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              LexCorporativo hará esfuerzos razonables para mantener versiones funcionales del Software. La operación local puede verse afectada por fallas del equipo del usuario, archivos corruptos, ausencia de recursos locales requeridos, actualizaciones o causa de fuerza mayor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">9. Limitación de Responsabilidad</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              En la máxima medida permitida por la legislación mexicana aplicable, LexCorporativo no será responsable por: daños indirectos, incidentales, especiales o consecuentes derivados del uso del Software; pérdidas económicas derivadas de decisiones tomadas con base en los resultados de la inteligencia artificial; ni interrupciones causadas por el equipo, sistema operativo o archivos locales del usuario.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">10. Procesamiento de Datos y Privacidad (Bring Your Own Key)</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              LexCorporativo opera bajo un modelo de Privacidad por Diseño. El tratamiento cambia según el modo que el usuario mantenga activo en Configuración:
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
              <li><strong>API propia:</strong> La recuperación normativa y la administración documental se realizan en el equipo; la inferencia generativa utiliza el proveedor configurado por el usuario y queda sujeta a sus costos, disponibilidad y políticas.</li>
              <li><strong>Procesamiento mediante API propia (BYOK):</strong> Al activar este modo, cada operación compatible envía por HTTPS al proveedor configurado las instrucciones, una selección del texto extraído y los fundamentos recuperados. El archivo original no se transmite. El tratamiento, registro o retención del proveedor se rige por la cuenta, contrato y políticas que el usuario haya contratado con éste.</li>
              <li><strong>Almacenamiento Local (Portafolio):</strong> Los resultados, historiales y documentos se guardan en el disco del equipo. La desinstalación conserva la bóveda salvo que el usuario la elimine explícitamente desde Datos locales.</li>
              <li><strong>Control de fundamentación:</strong> En los flujos jurídicos compatibles, la respuesta del proveedor se valida localmente contra el corpus recuperado. Puede solicitarse una sola corrección automática; si la salida continúa sin sustento verificable, no se entrega.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">11. Modificaciones</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              LexCorporativo se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigor a partir de su publicación en el Software o en los canales comerciales vigentes. El uso continuado del servicio después de la publicación de cambios constituye la aceptación de los mismos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">12. Legislación Aplicable y Jurisdicción</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Estos Términos y Condiciones se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia derivada de estos términos, las partes se someten a la jurisdicción de los tribunales competentes en la Ciudad de México, renunciando expresamente a cualquier otro fuero que pudiera corresponderles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">13. Contacto</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Para cualquier consulta relacionada con estos Términos y Condiciones: <strong>contacto@lexcorporativo.mx</strong>
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
};
