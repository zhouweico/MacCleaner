import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } from 'electron';
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
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

app.setName('MacCleaner');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let panelWindow: BrowserWindow | null = null;

autoUpdater.logger = log;
(log as any).transports.file.level = 'info';
autoUpdater.autoDownload = false;

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
  mainWindow?.webContents.send('update:checking');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  mainWindow?.webContents.send('update:available', {
    version: info.version,
    releaseNotes: info.releaseNotes
  });
});

autoUpdater.on('update-not-available', () => {
  log.info('Update not available');
  mainWindow?.webContents.send('update:not-available');
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('update:progress', {
    percent: progress.percent,
    bytesPerSecond: progress.bytesPerSecond,
    transferred: progress.transferred,
    total: progress.total
  });
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);
  mainWindow?.webContents.send('update:downloaded', {
    version: info.version
  });
});

autoUpdater.on('error', (error) => {
  log.error('Update error:', error.message);
  mainWindow?.webContents.send('update:error', {
    message: error.message
  });
});

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

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === ',' && input.meta) {
      event.preventDefault();
      mainWindow?.webContents.executeJavaScript("window.__navigateToModule?.('settings')");
      return;
    }
    if (input.key.toLowerCase() === 'w' && input.meta && !input.shift) {
      event.preventDefault();
      mainWindow?.hide();
      return;
    }
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

  ipcMain.handle('update:check', async () => {
    try {
      if (!app.isPackaged) {
        const message = '开发环境不支持自动更新，请构建生产版本后测试';
        mainWindow?.webContents.send('update:error', { message });
        return { success: false, error: message };
      }
      const result = await autoUpdater.checkForUpdates();
      // updateInfo 可能为 null（无可用更新时），此时 update-not-available 事件已由 electron-updater 触发
      if (!result?.updateInfo) {
        return { success: true, updateInfo: null };
      }
      return { success: true, updateInfo: result.updateInfo };
    } catch (error) {
      const message = error instanceof Error ? error.message : '检查更新失败';
      mainWindow?.webContents.send('update:error', { message });
      return { success: false, error: message };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '下载失败';
      mainWindow?.webContents.send('update:error', { message });
      return { success: false, error: message };
    }
  });

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall();
    return { success: true };
  });

  ipcMain.handle('shell:open-external', (_e, url: string) => {
    shell.openExternal(url);
  });

  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdatesAndNotify();
  }
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
  if (!app.isReady()) return;
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});
