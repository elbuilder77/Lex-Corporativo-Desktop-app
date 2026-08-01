import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
              <Shield size={20} className="text-legal-gold" />
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-legal-950 tracking-tight">
              Aviso de Privacidad
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
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">I. Identidad del Responsable</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong>LexCorporativo</strong> (en adelante "el Responsable"), con domicilio en México, es responsable del tratamiento de los datos personales que nos proporcione, los cuales serán protegidos conforme a lo dispuesto por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y demás normatividad aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">II. Datos Personales Recabados</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">En la aplicación de escritorio, el tratamiento se limita a información local necesaria para operar la estación jurídica:</p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li><strong>Datos de la estación:</strong> identificador técnico local utilizado para organizar la información en este equipo.</li>
              <li><strong>Datos de trabajo:</strong> portafolios, consultas, resultados de análisis, documentos generados, bitácoras y archivos que el usuario decida guardar localmente.</li>
              <li><strong>Datos técnicos locales:</strong> trazas, hashes, logs de operación y configuración necesaria para el funcionamiento del software instalado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">III. Finalidades del Tratamiento</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3"><strong>Finalidades primarias (necesarias):</strong></p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li>Operar la estación jurídica instalada en el equipo del usuario.</li>
              <li>Preparar localmente el contexto y procesar consultas, análisis y documentos mediante la API elegida por el usuario.</li>
              <li>Guardar portafolios y bitácoras en el almacenamiento local del dispositivo.</li>
              <li>Permitir exportación y recuperación de trabajo sin conexión a internet.</li>
            </ul>
            <p className="text-sm text-slate-600 leading-relaxed mt-3 mb-3"><strong>Finalidades secundarias (opcionales):</strong></p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li>Generar reportes locales de soporte cuando el usuario decida compartirlos fuera de la aplicación.</li>
              <li>Procesar una operación compatible mediante el proveedor de IA que el usuario active con su propia API key (BYOK).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">IV. Transferencias de Datos</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">Las funciones generativas requieren BYOK. Al ejecutarlas, la aplicación transmite al proveedor elegido la instrucción y los extractos necesarios; la bóveda completa no se transmite.</p>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              <li>En BYOK se envían por HTTPS al proveedor elegido la instrucción, una selección limitada del texto extraído y los fundamentos locales recuperados.</li>
              <li>El archivo original, la bóveda completa y los historiales no seleccionados no se transmiten al proveedor.</li>
              <li>El tratamiento, registro y retención del contenido enviado dependen de la cuenta, contrato y políticas del proveedor elegido por el usuario.</li>
              <li>La compra, descarga o soporte comercial se atienden fuera de esta aplicación instalada.</li>
              <li>También habrá salida de información si el usuario exporta archivos o los comparte manualmente.</li>
            </ul>
            <p className="text-sm text-slate-600 leading-relaxed mt-3">
              Cualquier servicio web de venta o descarga opera separado de la estación desktop y no forma parte del flujo de procesamiento jurídico local.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">V. Derechos ARCO</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales (derechos ARCO). Para ejercer cualquiera de estos derechos, puede enviar una solicitud al correo electrónico: <strong>privacidad@lexcorporativo.mx</strong>. Su solicitud deberá contener: nombre completo, correo electrónico registrado, descripción clara del derecho que desea ejercer y cualquier documento que acredite su identidad. Responderemos en un plazo máximo de 20 días hábiles conforme a la LFPDPPP.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">VI. Uso de Cookies y Tecnologías de Rastreo</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              La aplicación de escritorio no utiliza cookies ni tecnologías de rastreo web para operar portafolios o documentos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">VII. Tratamiento de Documentos</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Los archivos se extraen y organizan primero en el equipo. Las operaciones generativas envían al proveedor configurado una selección limitada del texto extraído y los fundamentos recuperados; el archivo binario original y la bóveda completa no se transmiten. Los respaldos exportados quedan sin cifrar en el destino elegido por el usuario.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">VIII. Retención y Eliminación</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Los portafolios aplican la retención configurada al crearse y pueden respaldarse o eliminarse desde Datos locales. Desinstalar la aplicación no borra automáticamente la bóveda: la eliminación total requiere una confirmación explícita dentro del software.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">IX. Medidas de Seguridad</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Implementamos aislamiento de contexto de Electron, validación de payloads IPC, cifrado de contenidos de la bóveda mediante el almacén seguro del sistema operativo, bitácoras de trazabilidad con hashes e identificadores de fuentes y bloqueo de nuevas escrituras cuando el cifrado seguro no está disponible. La API key BYOK también se cifra con el almacén del sistema operativo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">X. Modificaciones al Aviso de Privacidad</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              El Responsable se reserva el derecho de modificar el presente Aviso de Privacidad. Cualquier cambio será publicado en esta misma página con la fecha de actualización correspondiente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-serif font-bold text-legal-950 mb-3">XI. Contacto</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Para cualquier duda o aclaración respecto al tratamiento de sus datos personales, puede contactarnos en: <strong>privacidad@lexcorporativo.mx</strong>
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
};
