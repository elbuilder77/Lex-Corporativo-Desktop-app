import { ipcMain } from 'electron';
import { z } from 'zod';
import {
  BYOK_PROVIDERS,
  clearByokApiKey,
  getActiveByokConfig,
  getByokSettings,
  getByokProviderConfig,
  saveByokSettings,
} from '../lib/byok-settings';
import { testByokConnection } from '../lib/byok-client';

const ByokProviderSchema = z.enum(BYOK_PROVIDERS as ['gemini', 'openai', 'anthropic']);

const SaveByokSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: ByokProviderSchema.optional(),
  model: z.string().trim().min(1).max(120).optional(),
  apiKey: z.string().trim().min(10).max(500).optional(),
  strictPrivacy: z.boolean().optional(),
  automaticUpdatesEnabled: z.boolean().optional(),
  maxInputChars: z.number().int().min(10_000).max(200_000).optional(),
});

export function registerByokHandlers(): void {
  ipcMain.handle('byok:get-settings', async () => getByokSettings());

  ipcMain.handle('byok:save-settings', async (_event, rawPayload: unknown) => {
    return saveByokSettings(SaveByokSettingsSchema.parse(rawPayload));
  });

  ipcMain.handle('byok:clear-key', async (_event, rawPayload: unknown) => {
    const payload = z.object({ provider: ByokProviderSchema.optional() }).parse(rawPayload || {});
    return clearByokApiKey(payload.provider);
  });

  ipcMain.handle('byok:test-connection', async (_event, rawPayload: unknown) => {
    const payload = z.object({
      provider: ByokProviderSchema.optional(),
      apiKey: z.string().trim().min(10).max(500).optional(),
      model: z.string().trim().min(1).max(120).optional(),
    }).parse(rawPayload || {});

    const active = getActiveByokConfig();
    const provider = payload.provider || active.provider;
    const configuredProvider = getByokProviderConfig(provider);
    const apiKey = payload.apiKey || configuredProvider.apiKey;
    if (!apiKey) throw new Error(`Agrega una API key de ${provider} antes de probar la conexión.`);

    return testByokConnection({
      provider,
      apiKey,
      model: payload.model || configuredProvider.model,
    });
  });
}
