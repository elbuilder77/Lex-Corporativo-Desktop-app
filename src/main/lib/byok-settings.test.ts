import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const settingsRoot = path.join(process.cwd(), '.tmp-byok-settings-test');
const mockState = { encryptionAvailable: true };

vi.mock('electron', () => ({
  app: {
    getPath: () => settingsRoot,
  },
  safeStorage: {
    isEncryptionAvailable: () => mockState.encryptionAvailable,
    encryptString: (value: string) => Buffer.from(`protected:${value}`, 'utf8'),
    decryptString: (value: Buffer) => {
      const decoded = value.toString('utf8');
      if (!decoded.startsWith('protected:')) throw new Error('unreadable');
      return decoded.slice('protected:'.length);
    },
  },
}));

describe('BYOK provider settings', () => {
  beforeEach(() => {
    mockState.encryptionAvailable = true;
    fs.rmSync(settingsRoot, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(settingsRoot, { recursive: true, force: true });
  });

  it('refuses to enable cloud execution without a usable API key', async () => {
    const { saveByokSettings } = await import('./byok-settings');
    expect(() => saveByokSettings({ enabled: true })).toThrow(/API key válida/);
  });

  it('stores a protected key and exposes only readiness metadata', async () => {
    const { getActiveByokConfig, saveByokSettings } = await import('./byok-settings');
    const settings = saveByokSettings({ enabled: true, apiKey: 'secret-key', maxInputChars: 1 });
    const storedText = fs.readFileSync(path.join(settingsRoot, 'byok-settings.json'), 'utf8');

    expect(settings.enabled).toBe(true);
    expect(settings.keyStatus).toBe('ready');
    expect(settings.maxInputChars).toBe(10_000);
    expect(storedText).not.toContain('secret-key');
    expect(fs.existsSync(path.join(settingsRoot, 'byok-settings.json.tmp'))).toBe(false);
    expect(getActiveByokConfig().apiKey).toBe('secret-key');
  });

  it('disables an unreadable saved key until the user replaces it', async () => {
    const { getByokSettings, saveByokSettings } = await import('./byok-settings');
    const filePath = path.join(settingsRoot, 'byok-settings.json');
    fs.mkdirSync(settingsRoot, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({
      enabled: true,
      provider: 'gemini',
      model: 'gemini-test',
      encryptedApiKey: 'safe:not-valid-protected-data',
    }), 'utf8');

    expect(getByokSettings()).toMatchObject({
      enabled: false,
      hasApiKey: false,
      keyStatus: 'unreadable',
      requiresApiKeyReset: true,
    });
    expect(() => saveByokSettings({ enabled: true })).toThrow(/ya no puede descifrarse/);
    expect(saveByokSettings({ enabled: true, apiKey: 'replacement-key' })).toMatchObject({
      enabled: true,
      keyStatus: 'ready',
      requiresApiKeyReset: false,
    });
  });

  it('keeps encrypted keys and models isolated by provider', async () => {
    const { getByokProviderConfig, getByokSettings, saveByokSettings } = await import('./byok-settings');
    saveByokSettings({ enabled: true, provider: 'gemini', apiKey: 'gemini-secret', model: 'gemini-test' });
    const active = saveByokSettings({ enabled: true, provider: 'openai', apiKey: 'openai-secret', model: 'gpt-test' });

    expect(active).toMatchObject({ provider: 'openai', model: 'gpt-test', enabled: true });
    expect(active.providers.gemini).toMatchObject({ model: 'gemini-test', hasApiKey: true });
    expect(active.providers.openai).toMatchObject({ model: 'gpt-test', hasApiKey: true });
    expect(getByokProviderConfig('gemini').apiKey).toBe('gemini-secret');
    expect(getByokProviderConfig('openai').apiKey).toBe('openai-secret');
    expect(JSON.stringify(getByokSettings())).not.toContain('secret');
  });
});
