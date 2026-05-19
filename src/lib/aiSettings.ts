const STORAGE_KEY = 'maccleaner-settings';

export function isAiEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return !!JSON.parse(raw).aiEnabled;
  } catch {
    return false;
  }
}
