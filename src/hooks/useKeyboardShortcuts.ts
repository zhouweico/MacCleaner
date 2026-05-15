import { useEffect } from 'react';
import { useAppStore } from '@/store';
import type { ModuleId } from '@/types';

const DEFAULT_SHORTCUTS = {
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

function isShortcutEnabled(key: string): boolean {
  try {
    const raw = localStorage.getItem('maccleaner-settings');
    if (raw) {
      const s = JSON.parse(raw);
      return s.shortcutEnabled?.[key] !== false;
    }
  } catch {}
  return true;
}

export function useKeyboardShortcuts() {
  const { isSelected, selectAll, clearSelection } = useAppStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+A: Select all / deselect all
      if (matchShortcut(e, DEFAULT_SHORTCUTS.selectAll) && isShortcutEnabled('selectAll')) {
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, selectAll, clearSelection]);
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
