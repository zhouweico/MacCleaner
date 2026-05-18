import { ipcMain } from 'electron';
import { analyzeWithOllama } from '../services/ai-analyzer';

export function registerAiHandlers() {
  ipcMain.handle('ai:analyze', async (_event, dirPath: string, ollamaUrl?: string) => {
    return analyzeWithOllama(dirPath, ollamaUrl);
  });
}
