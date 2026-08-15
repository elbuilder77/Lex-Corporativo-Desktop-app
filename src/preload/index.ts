import { contextBridge, ipcRenderer } from 'electron';
import type { LexDesktopAPI } from './types';

const api: LexDesktopAPI = {
  cases: {
    createCase: (payload) => ipcRenderer.invoke('vault:create-case', payload),
    listCases: () => ipcRenderer.invoke('vault:list-cases'),
    getCase: (caseId) => ipcRenderer.invoke('vault:load-case-data', caseId),
    renameCase: (payload) => ipcRenderer.invoke('vault:rename-case', payload),
    deleteCase: (caseId) => ipcRenderer.invoke('vault:delete-case', caseId),
    saveAnalysis: (payload) => ipcRenderer.invoke('vault:save-analysis', payload),
    saveDraft: (payload) => ipcRenderer.invoke('vault:save-draft', payload),
    deleteAnalysis: (payload) => ipcRenderer.invoke('vault:delete-analysis', payload),
    deleteDraft: (payload) => ipcRenderer.invoke('vault:delete-draft', payload),
    saveState: (payload) => ipcRenderer.invoke('vault:save-state', payload),
    purgeExpired: () => ipcRenderer.invoke('vault:purge-expired'),
    exportAll: () => ipcRenderer.invoke('vault:export-all'),
    deleteAll: (payload) => ipcRenderer.invoke('vault:delete-all', payload),
  },
  documents: {
    selectFile: () => ipcRenderer.invoke('dialog:show-open-dialog'),
    exportPdf: (payload) => ipcRenderer.invoke('vault:export-pdf', payload),
    exportDocx: (payload) => ipcRenderer.invoke('vault:export-docx', payload),
  },

  analysis: {
    analyzeDocument: (payload) => ipcRenderer.invoke('ipc:analyze', payload),
    onProgress: (cb) => {
      ipcRenderer.removeAllListeners('engine:progress');
      ipcRenderer.on('engine:progress', (_event, progress) => cb(progress));
    },
  },
  drafts: {
    generateDraft: (payload) => ipcRenderer.invoke('ipc:draft', payload),
  },
  legalKnowledge: {
    searchRAG: (payload) => ipcRenderer.invoke('ipc:rag-search', payload),
  },
  runtime: {
    getHealth: () => ipcRenderer.invoke('runtime:get-health'),
  },
  traceability: {
    getStatus: () => ipcRenderer.invoke('trace:get-status'),
    exportLedger: () => ipcRenderer.invoke('trace:export'),
  },
  byok: {
    getSettings: () => ipcRenderer.invoke('byok:get-settings'),
    saveSettings: (payload) => ipcRenderer.invoke('byok:save-settings', payload),
    clearKey: (payload) => ipcRenderer.invoke('byok:clear-key', payload),
    testConnection: (payload) => ipcRenderer.invoke('byok:test-connection', payload),
  },
  settings: {
    getAppVersion: () => ipcRenderer.invoke('app:version'),
    getPlatform: () => ipcRenderer.invoke('app:platform'),
    onUpdateAvailable: (cb) => {
      ipcRenderer.removeAllListeners('update:available');
      ipcRenderer.on('update:available', (_e, v) => cb(v));
    },
    onUpdateDownloaded: (cb) => {
      ipcRenderer.removeAllListeners('update:downloaded');
      ipcRenderer.on('update:downloaded', () => cb());
    },
    checkForUpdates: () => ipcRenderer.invoke('update:check-now'),
    installUpdate: () => ipcRenderer.send('update:install'),
  },
  navigation: {
    onSettings: (cb) => {
      const listener = () => cb();
      ipcRenderer.on('nav:settings', listener);
      return () => ipcRenderer.removeListener('nav:settings', listener);
    },
  },
  assistant: {
    askInstructivo: (payload) => ipcRenderer.invoke('ipc:assistant-ask', payload),
    askFiscal: (payload) => ipcRenderer.invoke('ipc:fiscal-ask', payload),
  }
};

contextBridge.exposeInMainWorld('lexDesktop', api);
