import { Menu, BrowserWindow } from 'electron';

export function createAppMenu(): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Lex Corporativo',
      submenu: [
        { label: 'Acerca de Lex Corporativo', role: 'about' },
        { type: 'separator' },
        {
          label: 'Configuración',
          accelerator: 'CmdOrCtrl+,',
          click: (_menuItem, browserWindow) => {
            if (browserWindow) {
              // Send navigation request to React router via IPC/webcontents
              (browserWindow as BrowserWindow).webContents.send('nav:settings');
            }
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Volver a cargar' },
        { role: 'forceReload', label: 'Forzar recarga' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamaño original' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        { label: 'Soporte disponible en el sitio de descarga', enabled: false },
      ],
    },
  ];
  
  return Menu.buildFromTemplate(template);
}
