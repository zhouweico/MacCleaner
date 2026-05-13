import { ipcMain, shell } from 'electron';
import { safeClean, advancedClean } from '../services/cleaner';
import type { ModuleId, CleanAction } from '../types';

export function registerCleanHandlers() {
  ipcMain.handle('clean:safe', async (_event, moduleId: ModuleId) => {
    return safeClean(moduleId);
  });

  ipcMain.handle('clean:advanced', async (_event, moduleId: ModuleId, actions: CleanAction[]) => {
    return advancedClean(moduleId, actions);
  });

  ipcMain.handle('clean:move-to-trash', async (_event, path: string) => {
    return shell.trashItem(path);
  });
}
