import { ipcMain } from 'electron';
import { z } from 'zod';
import { getActiveByokConfig } from '../lib/byok-settings';
import { composeLimitedByokPrompt, generateByokText } from '../lib/byok-client';

const APP_GUIDE = `Lex Corporativo Desktop - Guia de Funcionamiento:

1. Privacidad y funcionamiento BYOK:
   - La aplicación usa Gemini, OpenAI o Anthropic Claude con una API key aportada por el usuario. Sin una key válida, las funciones generativas y el reranking con IA permanecen desactivados; el Buscador conserva su orden híbrido local.
   - El corpus, LanceDB, los embeddings de búsqueda, la bóveda y la validación de citas permanecen en el equipo.
   - En BYOK se envían instrucciones, una selección del texto extraído y fundamentos recuperados. El archivo original no se transmite y aplican los costos, límites y políticas del proveedor.
   - La privacidad estricta está activa por defecto: no se revisan actualizaciones automáticamente y un proveedor externo solo se usa mientras BYOK permanece activado en Configuración.
   - La app limita el texto enviado, recupera fundamentos del corpus local y valida la salida de la API. Si falla, permite una corrección restringida y bloquea el resultado cuando continúa sin sustento.
   - El historial de actividades se guarda localmente en una base de datos SQLite segura y protegida.

2. Módulos de la Aplicación:
   - Inicio: Sección introductoria que contiene este instructivo interactivo.
   - Portafolio: Panel de control donde se muestran las actividades previas organizadas cronológicamente. Permite reanudar casos anteriores o destruirlos de forma segura y permanente.
   - Generación y análisis documental: Genera, analiza y corrige documentos mercantiles/corporativos, laborales, de comercio exterior y aduanales. El usuario puede partir de una plantilla precargada o proporcionar su propio machote en PDF, TXT o Markdown.
   - Buscador Normativo Oficial: Localiza artículos del corpus por materia mediante coincidencia textual y semántica local. Si BYOK está activo, la API configurada solo reordena los IDs candidatos; no redacta la respuesta ni sustituye el texto oficial.
   - Configuración: Permite validar el corpus local, configurar BYOK multiproveedor, revisar actualizaciones manualmente y controlar privacidad estricta.

3. Flujos de Trabajo:
   - Ingeniería Jurídica: El usuario elige la materia, selecciona una plantilla precargada o carga un machote propio, completa los datos e instrucciones y genera el documento. El resultado se guarda localmente y puede copiarse o exportarse en PDF.
   - Buscador Normativo Oficial: El usuario elige una materia o todos los artículos y escribe entre dos y cuatro conceptos. LanceDB recupera artículos verificados, advierte si la consulta parece pertenecer a otra materia y muestra literalmente el contenido del corpus.
   - Preparación de Operación: El usuario describe una operación y puede adjuntar hasta cinco archivos PDF, TXT o Markdown. La app genera un estado preventivo y lo guarda en el portafolio local.
   - Soporte Corporativo: Un cuestionario integra participantes, monto, contrato, entregables y razón de negocio; después genera una revisión local de evidencia y trazabilidad.
   - Riesgos y Requisitos: Un cuestionario ordena soporte documental, obligaciones, pendientes y acciones de cierre.
   - Documentación: El usuario elige una plantilla corporativa, laboral, de comercio exterior o aduanal, completa los datos y genera un documento con fundamentos locales cuando el flujo es compatible.
   - Normativa Documental: Muestra el catálogo instalado y permite buscar artículos, reglas o conceptos en la base local.

4. Reglas del Asistente del Instructivo:
   - El asistente solo responde a dudas sobre el uso de la aplicación, sus secciones, su funcionamiento técnico, su privacidad y flujos de trabajo.
   - El asistente tiene prohibido dar asesoramiento legal, mercantil, laboral, societario o fiscal. Tampoco analiza documentos del usuario ni cita leyes para responder casos jurídicos.
   - Si el usuario pregunta por temas de derecho o leyes externas a esta guía, el asistente debe declinar amablemente y explicar que solo está capacitado para guiar sobre el uso de Lex Corporativo Desktop.`;

const GuideQuestionSchema = z.object({
  query: z.string().trim().min(3).max(8_000),
  history: z.array(z.object({
    role: z.enum(['user', 'model', 'assistant']),
    text: z.string().max(12_000),
  })).max(20).optional(),
});

function mapHistory(history: Array<{ role: 'user' | 'model' | 'assistant'; text: string }> = []) {
  return history.slice(-12).map((message) => ({
    role: message.role === 'model' ? 'assistant' : message.role,
    content: message.text,
  }));
}

export function registerAssistantHandlers(): void {
  ipcMain.handle('ipc:assistant-ask', async (_event, payload: { query: string; history?: Array<{ role: 'user' | 'model' | 'assistant'; text: string }> }) => {
    const parsed = GuideQuestionSchema.parse(payload);
    const mappedHistory = mapHistory(parsed.history);

    try {
      const byok = getActiveByokConfig();
      if (byok.enabled && byok.apiKey) {
        const result = await generateByokText({
          provider: byok.provider,
          apiKey: byok.apiKey,
          model: byok.model,
          systemInstruction: [
            'Eres el instructivo de producto de Lex Corporativo Desktop.',
            'Responde solo sobre el uso, privacidad, configuración y flujos descritos en la guía.',
            'No des asesoría jurídica ni respondas preguntas de derecho.',
          ].join('\n'),
          prompt: composeLimitedByokPrompt({
            instruction: `PREGUNTA:\n${parsed.query}\n\nHISTORIAL RECIENTE:\n${mappedHistory.map(message => `${message.role}: ${message.content}`).join('\n') || 'Sin historial.'}`,
            evidence: APP_GUIDE,
            outputContract: 'Responde en español claro y breve. Si la pregunta es jurídica, declina y dirige al módulo apropiado.',
            maxChars: Math.min(byok.maxInputChars, 30_000),
          }),
          temperature: 0.1,
          maxOutputTokens: 1_200,
        });
        return { result: result.trim() };
      }
      throw new Error('Configura y activa una API key propia para usar el asistente.');
    } catch (err: any) {
      console.error('[IPC Assistant] Query failure:', err);
      throw new Error(err.message || 'No se pudo obtener respuesta del asistente.');
    }
  });

}
