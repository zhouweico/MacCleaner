import type { ModuleId } from '../types';
import { ipcMain } from 'electron';
import { scanAllModules, scanModule } from '../services/scanner';
import { execFileNoThrow } from '../utils/execFileNoThrow';

export function registerScanHandlers() {
  ipcMain.handle('scan:all', async () => {
    console.log('[scan] scan:all started');
    const result = await scanAllModules();
    console.log('[scan] scan:all completed, modules:', Object.keys(result).length);
    return result;
  });

  ipcMain.handle('scan:module', async (_event, moduleId: string) => {
    console.log('[scan] scan:module:', moduleId);
    const result = await scanModule(moduleId as ModuleId);
    console.log('[scan] scan:module done:', moduleId, '- items:', result.itemCount, 'size:', result.totalSize);
    return result;
  });

  ipcMain.handle('disk:info', async () => {
    try {
      const { stdout } = await execFileNoThrow('df', ['-k', '/']);
      const lines = stdout.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        const total = parseInt(parts[1]) * 1024;
        const used = parseInt(parts[2]) * 1024;
        const available = parseInt(parts[3]) * 1024;
        return { total, used, available, usagePercent: Math.round((used / total) * 100) };
      }
    } catch (e) {
      console.error('[disk] get info failed:', e);
    }
    return null;
  });
}
