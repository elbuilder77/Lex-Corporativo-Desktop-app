import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

// Browser-only development preview. Electron always injects the real, isolated
// preload API; this small read-only fixture lets design QA render the renderer
// directly without weakening or changing the packaged application.
if (import.meta.env.DEV && !window.lexDesktop) {
  const emptyProvider = (model: string) => ({
    model,
    hasApiKey: false,
    keyStatus: 'missing' as const,
    requiresApiKeyReset: false,
  });
  Object.defineProperty(window, 'lexDesktop', {
    configurable: true,
    value: {
      cases: {
        purgeExpired: async () => ({ deleted: 0 }),
        listCases: async () => [],
      },
      runtime: {
        getHealth: async () => ({
          status: 'degraded' as const,
          checks: [],
          rust: {
            binaryPath: '', binaryExists: false, modelsPath: '', expectedGgufModel: '',
            expectedGgufModelPath: '', expectedGgufModelExists: false, ggufModels: [],
            embeddingModelExists: false, canUseDevelopmentMock: true, modelPathSource: 'default' as const,
          },
          capabilities: {
            vault: { ready: true, label: 'Portafolio local', detail: 'Vista previa de desarrollo.' },
            legalSearch: { ready: false, label: 'Consulta de corpus', detail: 'Recursos pendientes en la vista previa.' },
            legalGeneration: { ready: false, label: 'Análisis y generación jurídica', detail: 'Configura un modo de procesamiento.' },
            rulesAssessment: { ready: true, label: 'Evaluaciones por reglas', detail: 'Disponible.' },
            localAssistant: { ready: false, label: 'Guía interactiva', detail: 'Configura un modo de procesamiento.' },
          },
        }),
      },
      byok: {
        getSettings: async () => ({
          enabled: false, provider: 'gemini' as const, model: 'gemini', strictPrivacy: true,
          automaticUpdatesEnabled: false, maxInputChars: 60_000, hasApiKey: false,
          keyStatus: 'missing' as const, requiresApiKeyReset: false,
          providers: {
            gemini: emptyProvider('gemini'),
            openai: emptyProvider('openai'),
            anthropic: emptyProvider('claude'),
          },
        }),
        saveSettings: async (payload: { enabled: boolean; provider?: 'gemini' | 'openai' | 'anthropic'; model?: string }) => ({
          enabled: payload.enabled,
          provider: payload.provider ?? 'gemini',
          model: payload.model ?? 'gemini',
          strictPrivacy: true,
          automaticUpdatesEnabled: false,
          maxInputChars: 60_000,
          hasApiKey: payload.enabled,
          keyStatus: payload.enabled ? 'ready' as const : 'missing' as const,
          requiresApiKeyReset: false,
          providers: {
            gemini: emptyProvider('gemini'),
            openai: emptyProvider('openai'),
            anthropic: emptyProvider('claude'),
          },
        }),
        testConnection: async (payload?: { provider?: 'gemini' | 'openai' | 'anthropic'; model?: string }) => ({
          ok: true as const,
          provider: payload?.provider ?? 'gemini',
          model: payload?.model ?? 'gemini',
        }),
      },
      navigation: { onSettings: () => () => undefined },
    },
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// CSP Violation Reporting - sends violations to main process via preload API
if (window.lexDesktop?.security?.reportCspViolation) {
  document.addEventListener('securitypolicyviolation', (event) => {
    const violation = {
      'document-uri': event.documentURI,
      'referrer': event.referrer,
      'blocked-uri': event.blockedURI,
      'violated-directive': event.violatedDirective,
      'effective-directive': event.effectiveDirective,
      'original-policy': event.originalPolicy,
      'disposition': event.disposition,
      'status-code': event.statusCode,
      'line-number': event.lineNumber,
      'column-number': event.columnNumber,
      'source-file': event.sourceFile,
    };
    window.lexDesktop.security.reportCspViolation(violation).catch(() => undefined);
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
