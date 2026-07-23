import { app, BrowserWindow } from 'electron';

const PROTOCOL = 'lexcorp';

export function registerProtocol(): void {
  // Register deep link protocol client on the operating system
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        joinAppPath(process.argv[1])
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

function joinAppPath(arg: string): string {
  // Helper to resolve app paths in dev mode
  return arg;
}

export function handleDeepLink(rawUrl: string, mainWindow: BrowserWindow): void {
  try {
    const urlObj = new URL(rawUrl);
    if (urlObj.protocol === 'lexcorp:' && (urlObj.pathname.includes('auth/callback') || urlObj.host === 'auth')) {
      mainWindow.webContents.send('auth:callback', {
        hash: urlObj.hash,
        search: urlObj.search
      });
      mainWindow.focus();
    }
  } catch (e) {
    console.error('Invalid deep link URL:', e);
  }
}
