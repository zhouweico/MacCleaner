import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, '../data/operation-log.json');

const MAX_ENTRIES = 200;

export interface OperationLogEntry {
  timestamp: string;
  type: 'clean' | 'uninstall' | 'trash' | 'scan';
  module: string;
  freedSpace: number;
  success: boolean;
  error?: string;
  details?: string;
}

function ensureDir() {
  const dir = dirname(LOG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadLogs(): OperationLogEntry[] {
  try {
    if (existsSync(LOG_PATH)) {
      return JSON.parse(readFileSync(LOG_PATH, 'utf-8'));
    }
  } catch { /* ignore */ }
  return [];
}

function saveLogs(entries: OperationLogEntry[]) {
  try {
    ensureDir();
    // Keep only the most recent entries
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(-MAX_ENTRIES);
    }
    writeFileSync(LOG_PATH, JSON.stringify(entries, null, 2));
  } catch { /* ignore */ }
}

export function logOperation(entry: Omit<OperationLogEntry, 'timestamp'>) {
  const logs = loadLogs();
  logs.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });
  saveLogs(logs);
}

export function getOperationLogs(): OperationLogEntry[] {
  return loadLogs();
}

export function clearOperationLogs() {
  saveLogs([]);
}
