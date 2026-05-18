import { ipcMain, shell } from 'electron';
import { safeClean, advancedClean } from '../services/cleaner';
import { logOperation } from '../services/operation-log';
import type { ModuleId, CleanAction } from '../types';

export function registerCleanHandlers() {
  ipcMain.handle('clean:safe', async (_event, moduleId: ModuleId) => {
    const result = await safeClean(moduleId);
    logOperation({
      type: 'clean',
      module: moduleId,
      freedSpace: result.freedSpace,
      success: result.success,
      error: result.errors.join('; '),
    });
    return result;
  });

  ipcMain.handle('clean:advanced', async (_event, moduleId: ModuleId, actions: CleanAction[]) => {
    const result = await advancedClean(moduleId, actions);
    logOperation({
      type: 'clean',
      module: moduleId,
      freedSpace: result.freedSpace,
      success: result.success,
      error: result.errors.join('; '),
      details: `${actions.length} items cleaned`,
    });
    return result;
  });

  ipcMain.handle('clean:move-to-trash', async (_event, path: string) => {
    try {
      await shell.trashItem(path);
      logOperation({
        type: 'trash',
        module: path,
        freedSpace: 0,
        success: true,
      });
      return true;
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      logOperation({
        type: 'trash',
        module: path,
        freedSpace: 0,
        success: false,
        error,
      });
      throw e;
    }
  });
}
