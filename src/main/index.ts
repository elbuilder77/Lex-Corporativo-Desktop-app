import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { createAppMenu } from './menu';
import { registerIpcHandlers } from './ipc';
import { registerProtocol, handleDeepLink } from './protocol';
import { getByokSettings } from './lib/byok-settings';
import { purgeExpiredUserDocuments } from './lib/rag';
import { purgeExpiredCases } from './lib/case-vault';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

let mainWindow: BrowserWindow | null = null;

function canCheckUpdatesAutomatically(): boolean {
  const settings = getByokSettings();
  return app.isPackaged && settings.automaticUpdatesEnabled && !settings.strictPrivacy && settings.updateConsentGiven;
}

function setupUpdateHandlers(): void {
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update:available', info.version);
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update:downloaded');
  });

  ipcMain.handle('update:check-now', async () => {
    if (!app.isPackaged) {
      return { ok: false, status: 'dev-mode', message: 'La búsqueda de actualizaciones solo aplica a la app instalada.' };
    }

    try {
      const result = await autoUpdater.checkForUpdatesAndNotify();
      return {
        ok: true,
        status: result?.updateInfo ? 'checked' : 'no-update-info',
        version: result?.updateInfo?.version,
      };
    } catch (err: any) {
      return { ok: false, status: 'error', message: err?.message || 'No se pudo revisar actualizaciones.' };
    }
  });

  ipcMain.on('update:install', () => {
    autoUpdater.quitAndInstall();
  });
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 720,
    minHeight: 600,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform === 'win32' ? {
      color: '#0f172a',
      symbolColor: '#c5a059',
      height: 40
    } : undefined,
    title: 'Lex Corporativo',
    backgroundColor: '#0f172a', // Avoids white flash before React mounts
    icon: process.platform === 'win32'
      ? join(__dirname, '../../resources/icon.ico')
      : join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true, // Strong local CSP
    }
  });

  // Native application menu
  Menu.setApplicationMenu(createAppMenu());

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // External navigation shield
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Prevent any navigation away from the local app
    if (!url.startsWith('file:') && !url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1')) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open http/https links in the default OS browser
    if (url.startsWith('http:') || url.startsWith('https:')) {
      require('electron').shell.openExternal(url);
    }
    // Always deny new Electron windows to prevent unsandboxed execution
    return { action: 'deny' };
  });

  // HMR for renderer in development, or load static index.html in production
  const rendererUrl = process.env['ELECTRON_RENDERER_URL'];
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Single instance lock for deep linking & security
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Focus window if another instance was launched
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // Parse deep link url on Windows/Linux
      const url = commandLine.find(arg => arg.startsWith('lexcorp://'));
      if (url) {
        handleDeepLink(url, mainWindow);
      }
    }
  });

  // This method will be called when Electron has finished initialization
  app.whenReady().then(() => {
    // Set app user model id for windows notifications
    electronApp.setAppUserModelId('mx.lexcorporativo.desktop');

    // Register protocol client (lexcorp://)
    registerProtocol();

    // Register all secure IPC handlers
    registerIpcHandlers();
    setupUpdateHandlers();

    void Promise.all([
      purgeExpiredUserDocuments(),
      purgeExpiredCases(),
    ]).catch(error => {
      console.warn('[Startup] Local retention cleanup did not complete:', error);
    });

    // Default open or close DevTools by F12 in development
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    createWindow();

    // Auto Update logic. By default this stays off to preserve local/offline operation.
    if (canCheckUpdatesAutomatically()) {
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        console.error('Error al revisar actualizaciones:', err);
      });
    }

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

// macOS deep link handler
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    handleDeepLink(url, mainWindow);
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
