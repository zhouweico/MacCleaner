import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, shell } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { registerScanHandlers } from './ipc/scan';
import { registerCleanHandlers } from './ipc/clean';
import { registerUninstallHandlers } from './ipc/uninstall';
import { registerScheduleHandlers } from './ipc/schedule';
import { restoreSchedule } from './services/scheduler';
import { registerAiHandlers } from './ipc/ai';
import { readFileSync, unlinkSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { autoUpdater } from 'electron-updater';

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = true;

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

app.setName('MacCleaner');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let panelWindow: BrowserWindow | null = null;

async function showAboutPanel() {
  const aboutWin = new BrowserWindow({
    width: 300,
    height: 400,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    titleBarStyle: 'hidden',
    hasShadow: true,
    backgroundColor: '#2a2a2a',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const iconPath = join(process.resourcesPath, 'icon.icns');
  const aboutHtmlPath = join(__dirname, 'about.html');

  let iconDataUri = '';
  try {
    const pngPath = join(tmpdir(), 'maccleaner-about-icon.png');
    execFileSync('sips', ['-s', 'format', 'png', '--out', pngPath, iconPath]);
    const nativeImg = nativeImage.createFromPath(pngPath);
    if (!nativeImg.isEmpty()) {
      iconDataUri = encodeURIComponent(nativeImg.toDataURL());
    }
    unlinkSync(pngPath);
  } catch {}

  aboutWin.webContents.once('did-finish-load', () => {
    aboutWin.show();
    aboutWin.focus();
  });
  aboutWin.loadURL(`file://${aboutHtmlPath}?icon=${iconDataUri}&version=${encodeURIComponent(packageJson.version)}&electron=${encodeURIComponent(process.versions.electron)}&node=${encodeURIComponent(process.versions.node)}&chrome=${encodeURIComponent(process.versions.chrome)}&v8=${encodeURIComponent(process.versions.v8)}`);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function createTray() {
  const basePath = app.getAppPath();
  const iconPath = join(basePath, 'resources/tray-icon.png');
  const trayImg = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayImg.resize({ width: 16, height: 16 }));
  tray.setToolTip('MacCleaner');

  tray.on('click', () => {
    if (panelWindow && panelWindow.isVisible()) {
      panelWindow.hide();
    } else {
      showPanel();
    }
  });
}

function createPanelWindow() {
  panelWindow = new BrowserWindow({
    width: 320,
    height: 460,
    minWidth: 280,
    minHeight: 400,
    show: false,
    frame: false,
    hasShadow: true,
    type: 'panel',
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  panelWindow.on('blur', () => {
    panelWindow?.hide();
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    panelWindow.loadURL('http://localhost:5173/?panel=1');
  } else {
    panelWindow.loadFile(join(__dirname, '../dist/index.html'), { search: '?panel=1' });
  }
}

function showPanel() {
  if (!panelWindow) createPanelWindow();
  if (tray && panelWindow) {
    const trayBounds = tray.getBounds();
    const [pw] = panelWindow.getSize();
    const x = Math.round(trayBounds.x + trayBounds.width / 2 - pw / 2);
    const y = Math.round(trayBounds.y + trayBounds.height + 4);
    panelWindow.setPosition(x, y);
    panelWindow.show();
  }
}

let willQuit = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1152,
    height: 712,
    minWidth: 1152,
    minHeight: 712,
    show: false,
    center: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 20 },
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('close', (event) => {
    if (!willQuit) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  // Intercept Cmd+R: check renderer switch. If disabled, block refresh (no-op). If enabled, let it reload.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Cmd+, — open Settings (macOS standard)
    if (input.key === ',' && input.meta) {
      event.preventDefault();
      mainWindow?.webContents.executeJavaScript("window.__navigateToModule?.('settings')");
      return;
    }
    // Cmd+W — hide window (macOS standard, non-destructive)
    if (input.key.toLowerCase() === 'w' && input.meta && !input.shift) {
      event.preventDefault();
      mainWindow?.hide();
      return;
    }
    // Cmd+R — reload (respect settings toggle)
    if (input.key.toLowerCase() === 'r' && input.meta && !input.shift) {
      event.preventDefault();
      mainWindow?.webContents.executeJavaScript(`
        (() => {
          try {
            const s = JSON.parse(localStorage.getItem('maccleaner-settings') || '{}');
            return s.shortcutEnabled?.rescan !== false;
          } catch { return true; }
        })()
      `).then((enabled) => {
        if (enabled) {
          mainWindow?.webContents.reload();
        }
      });
    }
  });
}

function createAppMenu() {
  if (process.platform !== 'darwin') return;

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { label: `关于 ${app.name}`, click: showAboutPanel },
        { label: '检查更新', click: () => mainWindow?.webContents.executeJavaScript('window.__checkUpdate?.()') },
        { type: 'separator' },
        {
          label: '设置',
          accelerator: 'Command+,',
          click: () => {
            mainWindow?.show();
            mainWindow?.focus();
            mainWindow?.webContents.executeJavaScript("window.__navigateToModule?.('settings')");
          },
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'windowMenu' },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  autoUpdater.requestHeaders = {
    'User-Agent': `MacCleaner/${packageJson.version} (Electron/${process.versions.electron})`,
    'Accept': 'application/vnd.github.v3+json',
  };

  createAppMenu();
  createTray();
  createWindow();
  createPanelWindow();
  registerScanHandlers();
  registerCleanHandlers();
  registerUninstallHandlers();
  registerScheduleHandlers(mainWindow!);
  restoreSchedule(mainWindow!);
  registerAiHandlers();

  ipcMain.handle('window:show-main', (_e, module?: string) => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      if (module) {
        mainWindow.webContents.send('navigate:module', module);
      }
    }
    panelWindow?.hide();
  });

  ipcMain.handle('panel:refresh', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('events:refresh');
    }
  });

  ipcMain.on('app:quit', () => {
    app.quit();
  });

  ipcMain.on('app:about', () => {
    showAboutPanel();
  });

  ipcMain.handle('app:info', () => ({
    name: 'MacCleaner',
    version: packageJson.version,
    description: packageJson.description,
    electron: process.versions.electron,
    node: process.versions.node,
  }));

  // Auto-update handlers
  ipcMain.handle('update:check', async () => {
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : '检查更新失败' };
    }
  });

  ipcMain.handle('update:download', async () => {
    autoUpdater.downloadUpdate();
    return { success: true };
  });

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle('shell:open-external', (_e, url: string) => {
    shell.openExternal(url);
  });
});

// Auto-update events
autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: '发现新版本',
    message: `MacCleaner ${info.version} 已发布`,
    detail: '是否立即下载并安装？',
    buttons: ['下载', '取消'],
    cancelId: 1,
  }).then(({ response }) => {
    if (response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-not-available', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('toast:show', { message: '当前已是最新版本', type: 'success' });
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('update:progress', {
    percent: Math.round(progress.percent),
  });
});

autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: '下载完成',
    message: `新版本 ${info.version} 已下载完成`,
    detail: '是否立即安装并重启？',
    buttons: ['安装并重启', '稍后'],
    cancelId: 1,
  }).then(({ response }) => {
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('Auto update error:', err);
});

app.on('before-quit', () => {
  willQuit = true;
  if (tray) { tray.destroy(); tray = null; }
  if (panelWindow) { panelWindow.destroy(); panelWindow = null; }
});

app.on('window-all-closed', () => {
  if (willQuit || process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
