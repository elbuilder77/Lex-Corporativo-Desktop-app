import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export type AiExecutionMode = 'local' | 'byok';
export type ByokProvider = 'gemini' | 'openai' | 'anthropic';
export type ByokKeyStatus = 'missing' | 'ready' | 'unreadable';

export const BYOK_PROVIDERS: ByokProvider[] = ['gemini', 'openai', 'anthropic'];
export const DEFAULT_BYOK_MODELS: Record<ByokProvider, string> = {
  gemini: 'gemini-3.5-flash',
  openai: 'gpt-5.6-terra',
  anthropic: 'claude-sonnet-4-20250514',
};
export const DEFAULT_GEMINI_MODEL = DEFAULT_BYOK_MODELS.gemini;
export const DEFAULT_BYOK_MAX_INPUT_CHARS = 60_000;
export const MIN_BYOK_MAX_INPUT_CHARS = 10_000;
export const MAX_BYOK_MAX_INPUT_CHARS = 200_000;

export interface ByokProviderStatus {
  model: string;
  hasApiKey: boolean;
  keyStatus: ByokKeyStatus;
  requiresApiKeyReset: boolean;
  apiKeyFingerprint?: string;
  updatedAt?: string;
}

export interface ByokSettings {
  enabled: boolean;
  provider: ByokProvider;
  model: string;
  strictPrivacy: boolean;
  automaticUpdatesEnabled: boolean;
  maxInputChars: number;
  hasApiKey: boolean;
  keyStatus: ByokKeyStatus;
  requiresApiKeyReset: boolean;
  apiKeyFingerprint?: string;
  updatedAt?: string;
  providers: Record<ByokProvider, ByokProviderStatus>;
}

export interface SaveByokSettingsInput {
  enabled: boolean;
  provider?: ByokProvider;
  model?: string;
  apiKey?: string;
  strictPrivacy?: boolean;
  automaticUpdatesEnabled?: boolean;
  maxInputChars?: number;
}

interface StoredProviderSettings {
  model?: string;
  encryptedApiKey?: string;
  apiKeyFingerprint?: string;
  updatedAt?: string;
}

interface StoredByokSettings {
  schemaVersion: 2;
  enabled: boolean;
  provider: ByokProvider;
  strictPrivacy?: boolean;
  automaticUpdatesEnabled?: boolean;
  maxInputChars?: number;
  providers: Partial<Record<ByokProvider, StoredProviderSettings>>;
}

interface LegacyGeminiSettings {
  enabled?: boolean;
  provider?: 'gemini';
  model?: string;
  strictPrivacy?: boolean;
  automaticUpdatesEnabled?: boolean;
  maxInputChars?: number;
  encryptedApiKey?: string;
  apiKeyFingerprint?: string;
  updatedAt?: string;
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'byok-settings.json');
}

function encryptText(plainText: string): string {
  if (safeStorage?.isEncryptionAvailable()) {
    return `safe:${safeStorage.encryptString(plainText).toString('base64')}`;
  }
  throw new Error('No se puede guardar la API key porque el cifrado seguro del sistema operativo no está disponible.');
}

function decryptText(encryptedText?: string): string | null {
  if (!encryptedText) return null;

  if (encryptedText.startsWith('safe:') && safeStorage?.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(encryptedText.slice(5), 'base64'));
    } catch {
      return null;
    }
  }

  // Compatibility with early local builds. A successful save rewrites the
  // selected provider using OS-backed encryption.
  if (encryptedText.startsWith('base64:')) {
    try {
      return Buffer.from(encryptedText.slice(7), 'base64').toString('utf-8');
    } catch {
      return null;
    }
  }

  return null;
}

function fingerprintApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 12);
}

function normalizeMaxInputChars(value?: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BYOK_MAX_INPUT_CHARS;
  return Math.min(MAX_BYOK_MAX_INPUT_CHARS, Math.max(MIN_BYOK_MAX_INPUT_CHARS, Math.round(value!)));
}

function normalizeProvider(value: unknown): ByokProvider {
  return BYOK_PROVIDERS.includes(value as ByokProvider) ? value as ByokProvider : 'gemini';
}

function emptyStoredSettings(): StoredByokSettings {
  return {
    schemaVersion: 2,
    enabled: false,
    provider: 'gemini',
    strictPrivacy: true,
    automaticUpdatesEnabled: false,
    maxInputChars: DEFAULT_BYOK_MAX_INPUT_CHARS,
    providers: {},
  };
}

function migrateSettings(raw: Partial<StoredByokSettings & LegacyGeminiSettings>): StoredByokSettings {
  const provider = normalizeProvider(raw.provider);
  const providers = raw.schemaVersion === 2 && raw.providers && typeof raw.providers === 'object'
    ? { ...raw.providers }
    : {};

  if (raw.encryptedApiKey || raw.model || raw.apiKeyFingerprint) {
    providers.gemini = {
      model: raw.model || DEFAULT_BYOK_MODELS.gemini,
      encryptedApiKey: raw.encryptedApiKey,
      apiKeyFingerprint: raw.apiKeyFingerprint,
      updatedAt: raw.updatedAt,
    };
  }

  return {
    schemaVersion: 2,
    enabled: Boolean(raw.enabled),
    provider,
    strictPrivacy: raw.strictPrivacy !== false,
    automaticUpdatesEnabled: Boolean(raw.automaticUpdatesEnabled),
    maxInputChars: normalizeMaxInputChars(raw.maxInputChars),
    providers,
  };
}

function readStoredSettings(): StoredByokSettings {
  const filePath = getSettingsPath();
  if (!fs.existsSync(filePath)) return emptyStoredSettings();

  try {
    return migrateSettings(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
  } catch {
    return emptyStoredSettings();
  }
}

function writeStoredSettings(settings: StoredByokSettings): void {
  const filePath = getSettingsPath();
  const tempPath = `${filePath}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tempPath, JSON.stringify(settings, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

function getKeyStatus(stored?: StoredProviderSettings): ByokKeyStatus {
  if (!stored?.encryptedApiKey) return 'missing';
  return decryptText(stored.encryptedApiKey) ? 'ready' : 'unreadable';
}

function providerStatus(provider: ByokProvider, stored?: StoredProviderSettings): ByokProviderStatus {
  const keyStatus = getKeyStatus(stored);
  return {
    model: stored?.model || DEFAULT_BYOK_MODELS[provider],
    hasApiKey: keyStatus === 'ready',
    keyStatus,
    requiresApiKeyReset: keyStatus === 'unreadable',
    apiKeyFingerprint: stored?.apiKeyFingerprint,
    updatedAt: stored?.updatedAt,
  };
}

export function getByokSettings(): ByokSettings {
  const stored = readStoredSettings();
  const providers = Object.fromEntries(
    BYOK_PROVIDERS.map(provider => [provider, providerStatus(provider, stored.providers[provider])]),
  ) as Record<ByokProvider, ByokProviderStatus>;
  const active = providers[stored.provider];

  return {
    enabled: Boolean(stored.enabled && active.hasApiKey),
    provider: stored.provider,
    model: active.model,
    strictPrivacy: stored.strictPrivacy !== false,
    automaticUpdatesEnabled: Boolean(stored.automaticUpdatesEnabled),
    maxInputChars: normalizeMaxInputChars(stored.maxInputChars),
    hasApiKey: active.hasApiKey,
    keyStatus: active.keyStatus,
    requiresApiKeyReset: active.requiresApiKeyReset,
    apiKeyFingerprint: active.apiKeyFingerprint,
    updatedAt: active.updatedAt,
    providers,
  };
}

export function getActiveByokConfig(): {
  enabled: boolean;
  provider: ByokProvider;
  model: string;
  apiKey: string | null;
  maxInputChars: number;
} {
  const stored = readStoredSettings();
  const active = stored.providers[stored.provider];
  const apiKey = decryptText(active?.encryptedApiKey);

  return {
    enabled: Boolean(stored.enabled && apiKey),
    provider: stored.provider,
    model: active?.model || DEFAULT_BYOK_MODELS[stored.provider],
    apiKey,
    maxInputChars: normalizeMaxInputChars(stored.maxInputChars),
  };
}

export function getByokProviderConfig(providerInput: ByokProvider): {
  provider: ByokProvider;
  model: string;
  apiKey: string | null;
} {
  const provider = normalizeProvider(providerInput);
  const stored = readStoredSettings().providers[provider];
  return {
    provider,
    model: stored?.model || DEFAULT_BYOK_MODELS[provider],
    apiKey: decryptText(stored?.encryptedApiKey),
  };
}

export function saveByokSettings(input: SaveByokSettingsInput): ByokSettings {
  const current = readStoredSettings();
  const provider = normalizeProvider(input.provider || current.provider);
  const previousProvider = current.providers[provider] || {};
  const nextApiKey = input.apiKey?.trim() || decryptText(previousProvider.encryptedApiKey);

  if (input.enabled && !nextApiKey) {
    if (getKeyStatus(previousProvider) === 'unreadable') {
      throw new Error(`La API key guardada para ${provider} ya no puede descifrarse. Escribe y guarda una nueva key.`);
    }
    throw new Error(`Agrega una API key válida para ${provider} antes de activar BYOK.`);
  }

  const now = new Date().toISOString();
  const next: StoredByokSettings = {
    schemaVersion: 2,
    enabled: Boolean(input.enabled && nextApiKey),
    provider,
    strictPrivacy: input.strictPrivacy ?? current.strictPrivacy ?? true,
    automaticUpdatesEnabled: input.automaticUpdatesEnabled ?? current.automaticUpdatesEnabled ?? false,
    maxInputChars: normalizeMaxInputChars(input.maxInputChars ?? current.maxInputChars),
    providers: {
      ...current.providers,
      [provider]: {
        model: input.model?.trim() || previousProvider.model || DEFAULT_BYOK_MODELS[provider],
        encryptedApiKey: nextApiKey ? encryptText(nextApiKey) : undefined,
        apiKeyFingerprint: nextApiKey ? fingerprintApiKey(nextApiKey) : undefined,
        updatedAt: now,
      },
    },
  };

  writeStoredSettings(next);
  return getByokSettings();
}

export function clearByokApiKey(providerInput?: ByokProvider): ByokSettings {
  const current = readStoredSettings();
  const provider = normalizeProvider(providerInput || current.provider);
  const previousProvider = current.providers[provider] || {};
  const providers = { ...current.providers };
  providers[provider] = {
    model: previousProvider.model || DEFAULT_BYOK_MODELS[provider],
    updatedAt: new Date().toISOString(),
  };

  writeStoredSettings({
    ...current,
    enabled: current.provider === provider ? false : current.enabled,
    providers,
  });
  return getByokSettings();
}
