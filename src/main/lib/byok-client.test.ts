import { afterEach, describe, expect, it, vi } from 'vitest';
import { composeLimitedByokPrompt, generateByokText } from './byok-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockJsonResponse(payload: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => payload,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('BYOK provider client', () => {
  it('calls Gemini generateContent without placing the key in the URL', async () => {
    const fetchMock = mockJsonResponse({ candidates: [{ content: { parts: [{ text: 'gemini-result' }] } }] });
    const result = await generateByokText({ provider: 'gemini', apiKey: 'gemini-secret', model: 'gemini-test', prompt: 'consulta' });

    expect(result).toBe('gemini-result');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain('gemini-secret');
    expect(init.headers['x-goog-api-key']).toBe('gemini-secret');
  });

  it('calls OpenAI Responses with storage disabled and a strict JSON schema', async () => {
    const fetchMock = mockJsonResponse({ output_text: '{"ok":true}' });
    await generateByokText({
      provider: 'openai',
      apiKey: 'openai-secret',
      model: 'gpt-test',
      prompt: 'consulta',
      jsonSchema: { name: 'result', schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false } },
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(init.headers.Authorization).toBe('Bearer openai-secret');
    expect(body.store).toBe(false);
    expect(body.text.format).toMatchObject({ type: 'json_schema', strict: true, name: 'result' });
  });

  it('uses an Anthropic tool schema to obtain structured output', async () => {
    const fetchMock = mockJsonResponse({ content: [{ type: 'tool_use', name: 'result', input: { ok: true } }] });
    const result = await generateByokText({
      provider: 'anthropic',
      apiKey: 'anthropic-secret',
      model: 'claude-test',
      prompt: 'consulta',
      jsonSchema: { name: 'result', schema: { type: 'object', properties: { ok: { type: 'boolean' } } } },
    });

    expect(result).toBe('{"ok":true}');
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(init.headers['x-api-key']).toBe('anthropic-secret');
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'result' });
  });

  it('omits sampling parameters rejected by Claude Sonnet 5', async () => {
    const fetchMock = mockJsonResponse({ content: [{ type: 'text', text: 'OK' }] });
    await generateByokText({
      provider: 'anthropic',
      apiKey: 'anthropic-secret',
      model: 'claude-sonnet-5',
      prompt: 'consulta',
      temperature: 0,
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.temperature).toBeUndefined();
  });

  it('truncates document evidence before losing the legal context or output contract', () => {
    const prompt = composeLimitedByokPrompt({
      instruction: 'INSTRUCCION-CONSERVADA',
      evidence: 'E'.repeat(20_000),
      legalContext: 'FUNDAMENTO-CONSERVADO',
      outputContract: 'CONTRATO-CONSERVADO',
      maxChars: 10_000,
    });

    expect(prompt).toContain('INSTRUCCION-CONSERVADA');
    expect(prompt).toContain('FUNDAMENTO-CONSERVADO');
    expect(prompt).toContain('CONTRATO-CONSERVADO');
    expect(prompt).toContain('EVIDENCIA DOCUMENTAL RECORTADA');
  });
});
