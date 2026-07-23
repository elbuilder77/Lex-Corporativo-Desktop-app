import { DEFAULT_GEMINI_MODEL } from './byok-settings';

export interface GeminiGenerateInput {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  thinkingLevel?: 'low' | 'medium' | 'high';
  timeoutMs?: number;
}

export function limitGeminiInput(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[CONTEXTO RECORTADO POR LIMITE CONFIGURADO: ${text.length - maxChars} CARACTERES OMITIDOS]`;
}

function extractGeminiText(payload: any): string {
  const parts = payload?.candidates?.flatMap((candidate: any) => candidate?.content?.parts || []) || [];
  return parts
    .map((part: any) => part?.text || '')
    .join('')
    .trim();
}

function describeEmptyGeminiResponse(payload: any): string {
  const candidate = payload?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const blockReason = payload?.promptFeedback?.blockReason;
  const safetyReason = candidate?.safetyRatings
    ?.filter((rating: any) => rating?.blocked || rating?.probability === 'HIGH')
    ?.map((rating: any) => rating?.category)
    ?.filter(Boolean)
    ?.join(', ');

  if (finishReason === 'MAX_TOKENS') {
    return 'Gemini respondió sin texto porque el límite de tokens fue insuficiente. Intenta de nuevo o aumenta el límite de salida.';
  }

  if (blockReason) {
    return `Gemini bloqueó la solicitud (${blockReason}).`;
  }

  if (safetyReason) {
    return `Gemini no devolvió texto por filtros de seguridad (${safetyReason}).`;
  }

  return `Gemini API no devolvió contenido utilizable${finishReason ? ` (motivo: ${finishReason})` : ''}.`;
}

export async function generateGeminiText(input: GeminiGenerateInput): Promise<string> {
  const model = input.model || DEFAULT_GEMINI_MODEL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs ?? 45_000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': input.apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: input.systemInstruction
            ? { parts: [{ text: input.systemInstruction }] }
            : undefined,
          contents: [
            {
              role: 'user',
              parts: [{ text: input.prompt }],
            },
          ],
          generationConfig: {
            temperature: input.temperature ?? 0.2,
            maxOutputTokens: input.maxOutputTokens ?? 8192,
            thinkingConfig: {
              thinkingLevel: input.thinkingLevel ?? 'low',
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Gemini API error ${response.status}: ${errorText.slice(0, 500)}`);
    }

    const payload: any = await response.json();
    const text = extractGeminiText(payload);

    if (!text) {
      throw new Error(describeEmptyGeminiResponse(payload));
    }

    return text;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Gemini agotó el tiempo de espera. Se continuará con el motor local cuando el flujo permita fallback.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function testGeminiConnection(apiKey: string, model = DEFAULT_GEMINI_MODEL): Promise<{ ok: true; model: string }> {
  await generateGeminiText({
    apiKey,
    model,
    prompt: 'Responde solamente: OK',
    temperature: 0,
    maxOutputTokens: 256,
    thinkingLevel: 'low',
  });

  return { ok: true, model };
}
