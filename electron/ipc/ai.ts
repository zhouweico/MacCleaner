import { ipcMain } from 'electron';
import { analyzeDirectory, testProviderConnection, type AiProviderConfig } from '../services/ai-analyzer';

export function registerAiHandlers() {
  ipcMain.handle('ai:analyze', async (_event, dirPath: string, providerConfig?: AiProviderConfig) => {
    return analyzeDirectory(dirPath, providerConfig ?? { type: 'ollama' });
  });

  ipcMain.handle('ai:test-connection', async (_event, config: AiProviderConfig) => {
    return testProviderConnection(config);
  });
}
