export const DEFAULT_BYOK_MODELS = {
  gemini: 'gemini-3.7-flash',
  openai: '5.6-luna',
  anthropic: 'claude-3-5-sonnet-20241022',
} as const;

export type ByokProvider = keyof typeof DEFAULT_BYOK_MODELS;
