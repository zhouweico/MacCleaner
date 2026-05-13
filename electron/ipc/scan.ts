import type { ModuleId } from '../types';
import { ipcMain } from 'electron';
import { scanAllModules, scanModule } from '../services/scanner';

export function registerScanHandlers() {
  ipcMain.handle('scan:all', async () => {
    return scanAllModules();
  });

  ipcMain.handle('scan:module', async (_event, moduleId: string) => {
    return scanModule(moduleId as ModuleId);
  });
}
