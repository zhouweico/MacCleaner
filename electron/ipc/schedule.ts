import { ipcMain, BrowserWindow } from 'electron';
import { registerSchedule, stopSchedule } from '../services/scheduler';
import { getOperationLogs, clearOperationLogs } from '../services/operation-log';

export function registerScheduleHandlers(window: BrowserWindow) {
  ipcMain.handle('schedule:register', async (_event, cron: string) => {
    // Empty cron = disable schedule
    if (!cron || cron.trim() === '') {
      stopSchedule();
      return false;
    }
    return registerSchedule(cron, window);
  });

  ipcMain.handle('schedule:stop', async () => {
    stopSchedule();
    return true;
  });

  // Operation log handlers
  ipcMain.handle('log:get', async () => {
    return getOperationLogs();
  });

  ipcMain.handle('log:clear', async () => {
    clearOperationLogs();
    return true;
  });
}
