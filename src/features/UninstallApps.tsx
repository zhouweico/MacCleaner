import { useEffect, useState } from 'react';
import { scanApps, uninstallApp } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import type { AppInfo } from '@/types';

function UninstallApps() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [selected, setSelected] = useState<AppInfo | null>(null);
  const [keepUserData, setKeepUserData] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try {
      const result = await scanApps();
      setApps(result);
    } finally {
      setScanning(false);
    }
  }

  async function handleUninstall() {
    if (!selected) return;
    const paths = selected.associatedFiles.map((f) => f.path);
    await uninstallApp(selected.path, paths, keepUserData);
    setSelected(null);
    await handleScan();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📱 已安装 APP</h1>
        <button onClick={handleScan} disabled={scanning} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {scanning ? '扫描中...' : '重新扫描'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {apps.map((app, i) => (
          <button
            key={i}
            onClick={() => setSelected(app)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              selected?.path === app.path ? 'border-red-500 bg-red-500/10' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <div className="font-medium">{app.name}</div>
            <div className="text-xs text-gray-400">
              {formatBytes(app.size)} • {app.associatedFiles.length} 个关联文件
            </div>
          </button>
        ))}
        {apps.length === 0 && <p className="col-span-2 text-gray-500">{scanning ? '扫描中...' : '没有检测到 APP'}</p>}
      </div>

      {selected && (
        <div className="rounded-lg border border-red-500/50 bg-gray-800 p-4">
          <h3 className="mb-3 text-lg font-bold text-red-400">🗑️ 卸载 {selected.name}</h3>

          <div className="mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={keepUserData} onChange={(e) => setKeepUserData(e.target.checked)} className="rounded" />
              保留用户数据（Documents、Application Support 中的用户文件）
            </label>
          </div>

          <div className="mb-3 max-h-40 overflow-y-auto rounded bg-gray-900 p-2 text-xs">
            <div className="font-medium text-gray-400 mb-1">将被删除的文件：</div>
            <div className="text-red-400">{selected.path}</div>
            {selected.associatedFiles.map((f, i) => (
              <div key={i} className="text-gray-400">{f.path} ({formatBytes(f.size)})</div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleUninstall}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-700"
            >
              确认卸载
            </button>
            <button
              onClick={() => setSelected(null)}
              className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium hover:bg-gray-500"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UninstallApps;
