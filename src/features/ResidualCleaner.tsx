import { useEffect, useState } from 'react';
import { scanResidual, advancedClean } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import type { AppInfo, CleanAction } from '@/types';

function ResidualCleaner() {
  const [residuals, setResiduals] = useState<AppInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    try {
      const result = await scanResidual();
      setResiduals(result);
    } finally {
      setSelected(new Set());
    }
  }

  async function handleClean() {
    const actions: CleanAction[] = residuals
      .filter((r) => selected.has(r.path))
      .flatMap((r) => r.associatedFiles.map((f) => ({
        path: f.path,
        size: f.size,
        description: f.path,
      })));

    if (actions.length === 0) return;

    await advancedClean('system-cache', actions);
    await handleScan();
    setSelected(new Set());
  }

  function toggleSelect(path: string) {
    const next = new Set(selected);
    next.has(path) ? next.delete(path) : next.add(path);
    setSelected(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🗑️ APP 残留清理</h1>
        <button onClick={handleClean} disabled={selected.size === 0} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          清理选中 ({selected.size})
        </button>
      </div>

      <p className="text-sm text-gray-400">以下文件属于已卸载 APP 的残留</p>

      <div className="rounded-lg bg-gray-800 p-4">
        {residuals.map((res, i) => (
          <div
            key={i}
            className="flex cursor-pointer items-center gap-3 border-b border-gray-700 py-3 last:border-0 hover:bg-gray-700/50"
            onClick={() => toggleSelect(res.path)}
          >
            <input type="checkbox" checked={selected.has(res.path)} onChange={() => {}} className="rounded" />
            <div className="flex-1">
              <div className="font-medium">{res.name}</div>
              <div className="text-xs text-gray-400">{res.path}</div>
            </div>
            <div className="font-bold">{formatBytes(res.size)}</div>
          </div>
        ))}
        {residuals.length === 0 && <p className="text-gray-500">没有检测到残留文件</p>}
      </div>
    </div>
  );
}

export default ResidualCleaner;
