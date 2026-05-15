import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import type { ModuleId } from '@/types';

const STORAGE_KEY = 'maccleaner-settings';

interface ShortcutConfig {
  selectAll: string;
  rescan: string;
}

const DEFAULT_SHORTCUTS: ShortcutConfig = {
  selectAll: 'meta+a',
  rescan: 'meta+r',
};

function matchShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+');
  const needMeta = parts.includes('meta');
  const needShift = parts.includes('shift');
  const needCtrl = parts.includes('ctrl');
  const needAlt = parts.includes('alt');
  const key = parts[parts.length - 1];

  if (needMeta !== e.metaKey) return false;
  if (needShift !== e.shiftKey) return false;
  if (needCtrl !== e.ctrlKey) return false;
  if (needAlt !== e.altKey) return false;
  if (e.key.toLowerCase() !== key) return false;

  return true;
}

function getEnabled(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return s.shortcutEnabled ?? { selectAll: true, rescan: true };
    }
  } catch {}
  return { selectAll: true, rescan: true };
}

export function useKeyboardShortcuts(customShortcuts?: Partial<ShortcutConfig>) {
  const { isSelected, selectAll, clearSelection } = useAppStore();
  const enabledRef = useRef(getEnabled());

  const shortcuts = { ...DEFAULT_SHORTCUTS, ...customShortcuts };

  // Keep enabledRef in sync with settings changes
  useEffect(() => {
    function onSettingsChange() {
      enabledRef.current = getEnabled();
    }
    window.addEventListener('settings-changed', onSettingsChange);
    return () => window.removeEventListener('settings-changed', onSettingsChange);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (matchShortcut(e, shortcuts.selectAll) && enabledRef.current.selectAll !== false) {
        e.preventDefault();
        const state = useAppStore.getState();
        const currentModule = state.currentModule;
        const paths: string[] = [];

        const scanResult = state.scanResults[currentModule as ModuleId];
        if (scanResult?.items) {
          for (const item of scanResult.items) paths.push(item.path);
        }
        if (currentModule === 'uninstall-apps') {
          for (const app of state.apps) paths.push(app.path);
        }
        if (currentModule === 'residual-clean') {
          for (const res of state.residuals) paths.push(res.path);
        }
        if (currentModule === 'uninstall-cli') {
          for (const tool of state.cliTools) {
            const key = tool.path || `${tool.source}:${tool.name}`;
            paths.push(key);
          }
        }

        if (paths.length === 0) return;
        const allSelected = paths.every(p => isSelected(p));
        if (allSelected) clearSelection();
        else selectAll(paths);
      }
    }

    // Listen for rescan shortcut from main process via DOM event
    const handleRescanShortcut = () => {
      if (enabledRef.current.rescan !== false) {
        clearSelection();
        const currentModule = useAppStore.getState().currentModule;
        window.dispatchEvent(new CustomEvent('rescan-module', { detail: { moduleId: currentModule } }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('rescan-shortcut', handleRescanShortcut);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('rescan-shortcut', handleRescanShortcut);
    };
  }, [shortcuts, isSelected, selectAll, clearSelection]);
}

export function useRescanListener(moduleId: string, scanFn: () => void) {
  useEffect(() => {
    function handleRescan(e: Event) {
      const detail = (e as CustomEvent).detail as { moduleId: string };
      if (detail.moduleId === moduleId) scanFn();
    }
    window.addEventListener('rescan-module', handleRescan);
    return () => window.removeEventListener('rescan-module', handleRescan);
  }, [moduleId, scanFn]);
}

export { DEFAULT_SHORTCUTS };
export type { ShortcutConfig };
