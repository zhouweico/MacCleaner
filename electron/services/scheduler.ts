import { BrowserWindow } from 'electron';
import { scanAllModules } from './scanner';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../data/schedule.json');

interface ScheduleConfig {
  enabled: boolean;
  hour: number;
  minute: number;
}

let scheduleTimer: NodeJS.Timeout | null = null;
let currentConfig: ScheduleConfig | null = null;

/**
 * Load persisted schedule config.
 */
function loadConfig(): ScheduleConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch { /* ignore */ }
  return { enabled: false, hour: 9, minute: 0 };
}

/**
 * Persist schedule config to disk.
 */
function saveConfig(config: ScheduleConfig) {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify(config));
  } catch { /* ignore */ }
}

/**
 * Register or update scheduled scan.
 * Uses a simple minute-level timer that fires when the configured time matches.
 * Config is persisted across app restarts.
 */
export function registerSchedule(cronExpression: string, window: BrowserWindow): boolean {
  // Parse "minute hour * * *" format
  const [minuteStr, hourStr] = cronExpression.split(' ');
  const minute = parseInt(minuteStr, 10);
  const hour = parseInt(hourStr, 10);

  if (isNaN(minute) || isNaN(hour)) return false;

  const config: ScheduleConfig = { enabled: true, hour, minute };
  saveConfig(config);
  currentConfig = config;

  startSchedule(config, window);
  return true;
}

/**
 * Stop and clear the schedule.
 */
export function stopSchedule() {
  if (scheduleTimer) {
    clearInterval(scheduleTimer);
    scheduleTimer = null;
  }
  const config = loadConfig();
  config.enabled = false;
  saveConfig(config);
  currentConfig = null;
}

/**
 * Restore schedule from persisted config on app start.
 */
export function restoreSchedule(window: BrowserWindow): void {
  const config = loadConfig();
  currentConfig = config;
  if (config.enabled) {
    startSchedule(config, window);
  }
}

function startSchedule(_config: ScheduleConfig, window: BrowserWindow) {
  if (scheduleTimer) clearInterval(scheduleTimer);

  // Check every 30 seconds if it's time to scan
  scheduleTimer = setInterval(async () => {
    if (!currentConfig?.enabled) return;
    const now = new Date();
    if (now.getHours() === currentConfig.hour && now.getMinutes() === currentConfig.minute) {
      // Prevent double-triggering within the same minute
      currentConfig.enabled = false;
      try {
        const results = await scanAllModules();
        window.webContents.send('events:complete', {
          success: true,
          freedSpace: 0,
          errors: [],
          type: 'schedule-scan',
          results,
        });
      } finally {
        // Re-enable for next day
        currentConfig.enabled = true;
        saveConfig(currentConfig);
      }
    }
  }, 30000);
}
