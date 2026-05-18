import type { ModuleId } from '../types';
import { ipcMain, shell, app } from 'electron';
import { scanAllModules, scanModule } from '../services/scanner';
import { execFileNoThrow } from '../utils/execFileNoThrow';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Safe logger that catches EPIPE errors from broken stdout pipes in Electron.
 */
function log(...args: unknown[]) {
  try { console.log(...args); } catch { /* EPIPE — stdout pipe closed, ignore */ }
}

function logError(...args: unknown[]) {
  try { console.error(...args); } catch { /* EPIPE — ignore */ }
}

let finderIconDataUri: string | null = null;

async function getFinderIconDataUri(): Promise<string> {
  if (finderIconDataUri) return finderIconDataUri;

  try {
    // Try multiple possible locations for Finder app
    const finderPaths = [
      '/System/Library/CoreServices/Finder.app',
      join(app.getPath('exe'), '..', '..', '..', 'Finder.app'), // Electron fallback
    ];

    for (const finderPath of finderPaths) {
      if (existsSync(finderPath)) {
        const icon = app.getFileIcon(finderPath, { size: 'normal' });
        const nativeImg = await icon;
        finderIconDataUri = nativeImg.toDataURL();
        return finderIconDataUri;
      }
    }
  } catch (e) {
    logError('[finder] get icon failed:', e);
  }

  // Fallback: use a simple Finder-like SVG as data URI
  finderIconDataUri = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGI1Y2Y2IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSI0Ii8+PGNpcmNsZSBjeD0iOSIgY3k9IjEwIiByPSIxIiBmaWxsPSIjOGI1Y2Y2IiBzdHJva2U9Im5vbmUiLz48Y2lyY2xlIGN4PSIxNSIgY3k9IjEwIiByPSIxIiBmaWxsPSIjOGI1Y2Y2IiBzdHJva2U9Im5vbmUiLz48cGF0aCBkPSJNOSA5LjVhMy41IDMuNSAwIDAgMCA2IDAiLz48L3N2Zz4=';
  return finderIconDataUri;
}

export function registerScanHandlers() {
  ipcMain.handle('scan:all', async () => {
    log('[scan] scan:all started');
    const result = await scanAllModules();
    log('[scan] scan:all completed, modules:', Object.keys(result).length);
    return result;
  });

  ipcMain.handle('scan:module', async (_event, moduleId: string) => {
    log('[scan] scan:module:', moduleId);
    const result = await scanModule(moduleId as ModuleId);
    log('[scan] scan:module done:', moduleId, '- items:', result.itemCount, 'size:', result.totalSize);
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
      logError('[disk] get info failed:', e);
    }
    return null;
  });

  ipcMain.handle('finder:show-item', async (_event, filePath: string) => {
    try {
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (e) {
      logError('[finder] showItemInFolder failed:', e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('finder:icon', async () => {
    return { iconDataUri: await getFinderIconDataUri() };
  });
}
