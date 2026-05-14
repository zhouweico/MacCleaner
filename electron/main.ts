import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { registerScanHandlers } from './ipc/scan';
import { registerCleanHandlers } from './ipc/clean';
import { registerUninstallHandlers } from './ipc/uninstall';
import { registerScheduleHandlers } from './ipc/schedule';

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

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
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip('MacCleaner');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开 MacCleaner',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => app.quit(),
    },
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

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
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.loadURL('http://localhost:5173');
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createTray();
  createWindow();
  registerScanHandlers();
  registerCleanHandlers();
  registerUninstallHandlers();
  registerScheduleHandlers(mainWindow!);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
