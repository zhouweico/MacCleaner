import { ipcMain } from 'electron';
import { scanApps, uninstallApp, scanResidual, scanCliTools, uninstallCliTool, findAssociatedFiles } from '../services/uninstaller';
import { logOperation } from '../services/operation-log';

export function registerUninstallHandlers() {
  ipcMain.handle('scan:apps', async () => scanApps());
  ipcMain.handle('scan:app-associated', async (_event, bundleId: string, appName: string) =>
    findAssociatedFiles(bundleId, appName),
  );
  ipcMain.handle('uninstall:app', async (_event, appPath: string, paths: string[], keep: boolean) => {
    const result = await uninstallApp(appPath, paths, keep);
    logOperation({
      type: 'uninstall',
      module: appPath.split('/').pop() ?? appPath,
      freedSpace: result.freedSpace,
      success: result.success,
      error: result.errors.join('; '),
      details: keep ? '用户数据已保留' : '完全清除',
    });
    return result;
  });
  ipcMain.handle('scan:residual', async () => scanResidual());
  ipcMain.handle('scan:cli-tools', async () => scanCliTools());
  ipcMain.handle('uninstall:cli', async (_event, name: string, source: string) => {
    const result = await uninstallCliTool(name, source);
    logOperation({
      type: 'uninstall',
      module: `${name} (${source})`,
      freedSpace: result.freedSpace,
      success: result.success,
      error: result.errors.join('; '),
    });
    return result;
  });
}
