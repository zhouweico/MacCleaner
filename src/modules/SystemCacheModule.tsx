import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { scanModule, advancedClean } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import type { CleanAction } from '@/types';

function SystemCacheModule() {
  const { scanResults, setScanning } = useAppStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const result = scanResults['system-cache'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try { await scanModule('system-cache'); }
    finally { setScanning(false); }
  }

  async function handleClean() {
    const actions: CleanAction[] = result!.items
      .filter((item) => selected.has(item.path))
      .map((item) => ({
        path: item.path,
        size: item.size,
        description: item.name,
      }));

    if (actions.length === 0) return;

    setScanning(true);
    try {
      await advancedClean('system-cache', actions);
      await handleScan();
    } finally {
      setScanning(false);
      setSelected(new Set());
    }
  }

  function toggleSelect(path: string) {
    const next = new Set(selected);
    next.has(path) ? next.delete(path) : next.add(path);
    setSelected(next);
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🗂️ 系统缓存</h1>
        <button
          onClick={handleClean}
          disabled={selected.size === 0}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          清理选中 ({selected.size})
        </button>
      </div>

      <p className="text-sm text-gray-400">缓存删除后应用会自动重建，不影响数据</p>

      <div className="rounded-lg bg-gray-800 p-4">
        {result.items.map((item, i) => (
          <div
            key={i}
            className="flex cursor-pointer items-center gap-3 border-b border-gray-700 py-3 last:border-0 hover:bg-gray-700/50"
            onClick={() => toggleSelect(item.path)}
          >
            <input type="checkbox" checked={selected.has(item.path)} onChange={() => {}} className="rounded" />
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-gray-400">{item.path}</div>
            </div>
            <div className="font-bold">{formatBytes(item.size)}</div>
          </div>
        ))}
        {result.items.length === 0 && <p className="text-gray-500">没有可清理缓存</p>}
      </div>
    </div>
  );
}

export default SystemCacheModule;
