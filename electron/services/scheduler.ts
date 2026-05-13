import { BrowserWindow } from 'electron';
import { scanAllModules } from './scanner';

let scheduleInterval: NodeJS.Timeout | null = null;

export function registerSchedule(cronExpression: string, window: BrowserWindow): boolean {
  const [minute] = cronExpression.split(' ');
  const targetMinute = parseInt(minute, 10);

  if (scheduleInterval) clearInterval(scheduleInterval);

  scheduleInterval = setInterval(async () => {
    const now = new Date();
    if (now.getMinutes() === targetMinute) {
      const results = await scanAllModules();
      window.webContents.send('events:complete', {
        success: true,
        freedSpace: 0,
        errors: [],
        type: 'schedule-scan',
        results,
      });
    }
  }, 60000);

  return true;
}

export function stopSchedule() {
  if (scheduleInterval) {
    clearInterval(scheduleInterval);
    scheduleInterval = null;
  }
}
