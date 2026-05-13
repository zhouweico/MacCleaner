import { ipcMain, BrowserWindow } from 'electron';
import { registerSchedule } from '../services/scheduler';

export function registerScheduleHandlers(window: BrowserWindow) {
  ipcMain.handle('schedule:register', async (_event, cron: string) => {
    return registerSchedule(cron, window);
  });
}
