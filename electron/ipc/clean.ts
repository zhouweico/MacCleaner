import { ipcMain } from 'electron';
import { safeClean, advancedClean } from '../services/cleaner';
import type { ModuleId, CleanAction } from '../types';

export function registerCleanHandlers() {
  ipcMain.handle('clean:safe', async (_event, moduleId: ModuleId) => {
    return safeClean(moduleId);
  });

  ipcMain.handle('clean:advanced', async (_event, moduleId: ModuleId, actions: CleanAction[]) => {
    return advancedClean(moduleId, actions);
  });
}
