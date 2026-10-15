const { app, BrowserWindow, shell, Menu } = require('electron');

const URL_APP = process.env.EDUGO_URL || 'https://edugo-1-lrk6.onrender.com';
const APP_HOST = new URL(URL_APP).host;

function create() {
  const win = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 420,
    minHeight: 600,
    backgroundColor: '#0b0f17',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  // Tashqi havolalar (t.me va boshqalar) — tizim brauzerida
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (new URL(url).host !== APP_HOST) shell.openExternal(url);
    } catch { /* noto'g'ri URL */ }
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    try {
      if (new URL(url).host !== APP_HOST) { e.preventDefault(); shell.openExternal(url); }
    } catch { e.preventDefault(); }
  });

  win.loadURL(URL_APP).catch(() => {
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
      '<body style="font-family:-apple-system;background:#0b0f17;color:#eee;display:grid;place-items:center;height:100vh;margin:0;text-align:center">' +
      '<div><h2>Internetga ulanib bo\'lmadi</h2><p>Ulanishni tekshirib, ilovani qayta oching.</p></div></body>'));
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
  ]));
  create();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) create(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
