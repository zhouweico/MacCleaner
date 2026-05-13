import { useCallback } from 'react';
import { useAppStore } from '@/store';
import { safeClean, advancedClean } from '@/lib/ipc';
import type { ModuleId, CleanAction, CleanResult } from '@/types';

export function useClean() {
  const { setLastCleanResult, setScanResults } = useAppStore();

  const doSafeClean = useCallback(async (moduleId: ModuleId): Promise<CleanResult> => {
    const result = await safeClean(moduleId);
    setLastCleanResult(result);
    const { scanModule } = await import('@/lib/ipc');
    const newResult = await scanModule(moduleId);
    setScanResults((prev) => ({ ...prev, [moduleId]: newResult }));
    return result;
  }, [setLastCleanResult, setScanResults]);

  const doAdvancedClean = useCallback(async (moduleId: ModuleId, actions: CleanAction[]): Promise<CleanResult> => {
    const result = await advancedClean(moduleId, actions);
    setLastCleanResult(result);
    return result;
  }, [setLastCleanResult]);

  return { doSafeClean, doAdvancedClean };
}
