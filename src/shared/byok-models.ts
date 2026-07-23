export const DEFAULT_BYOK_MODELS = {
  gemini: 'gemini-3.5-flash',
  openai: 'gpt-5.6-terra',
  anthropic: 'claude-sonnet-5',
} as const;

export type ByokProvider = keyof typeof DEFAULT_BYOK_MODELS;
