import { useCallback } from 'react';
import { useAppStore } from '@/store';
import { scanModule as ipcScanModule } from '@/lib/ipc';
import type { ModuleId } from '@/types';

export function useScan() {
  const { setScanResults } = useAppStore();

  const scanOne = useCallback(async (moduleId: ModuleId) => {
    const result = await ipcScanModule(moduleId);
    setScanResults((prev) => ({ ...prev, [moduleId]: result }));
    return result;
  }, [setScanResults]);

  return { scanOne };
}
