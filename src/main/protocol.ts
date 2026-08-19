import { app, BrowserWindow } from 'electron';

const PROTOCOL = 'lexcorp';
const ALLOWED_HOSTS = ['auth'];

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
    if (urlObj.protocol !== 'lexcorp:') {
      console.warn('[Protocol] Rejected deep link: invalid protocol', rawUrl);
      return;
    }
    if (!ALLOWED_HOSTS.includes(urlObj.host)) {
      console.warn('[Protocol] Rejected deep link: host not allowed', rawUrl);
      return;
    }
    if (!urlObj.pathname.includes('auth/callback') && urlObj.host !== 'auth') {
      console.warn('[Protocol] Rejected deep link: path not allowed', rawUrl);
      return;
    }
    mainWindow.webContents.send('auth:callback', {
      hash: urlObj.hash,
      search: urlObj.search
    });
    mainWindow.focus();
  } catch (e) {
    console.error('Invalid deep link URL:', e);
  }
}
