import { ipcMain } from 'electron';
import { scanApps, uninstallApp, scanResidual, scanCliTools, uninstallCliTool, findAssociatedFiles } from '../services/uninstaller';

export function registerUninstallHandlers() {
  ipcMain.handle('scan:apps', async () => scanApps());
  ipcMain.handle('scan:app-associated', async (_event, bundleId: string, appName: string) =>
    findAssociatedFiles(bundleId, appName),
  );
  ipcMain.handle('uninstall:app', async (_event, appPath: string, paths: string[], keep: boolean) =>
    uninstallApp(appPath, paths, keep),
  );
  ipcMain.handle('scan:residual', async () => scanResidual());
  ipcMain.handle('scan:cli-tools', async () => scanCliTools());
  ipcMain.handle('uninstall:cli', async (_event, name: string, source: string) =>
    uninstallCliTool(name, source),
  );
}
