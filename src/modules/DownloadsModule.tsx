import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';

function DownloadsModule() {
  const { scanResults, setScanning } = useAppStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const result = scanResults['downloads'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try { await scanModule('downloads'); }
    finally { setScanning(false); }
  }

  function toggleSelect(path: string) {
    const next = new Set(selected);
    next.has(path) ? next.delete(path) : next.add(path);
    setSelected(next);
  }

  function getFileType(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      dmg: '📦', zip: '📦', tar: '📦', gz: '📦',
      pdf: '📄', doc: '📄', docx: '📄',
      png: '🖼️', jpg: '🖼️', jpeg: '🖼️',
    };
    return types[ext ?? ''] ?? '📄';
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📥 Downloads</h1>
        <button onClick={handleScan} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
          重新扫描
        </button>
      </div>

      <p className="text-sm text-gray-400">选中文件将移至废纸篓（非永久删除）</p>

      <div className="rounded-lg bg-gray-800 p-4">
        {result.items.map((item, i) => (
          <div
            key={i}
            className="flex cursor-pointer items-center gap-3 border-b border-gray-700 py-3 last:border-0 hover:bg-gray-700/50"
            onClick={() => toggleSelect(item.path)}
          >
            <input type="checkbox" checked={selected.has(item.path)} onChange={() => {}} className="rounded" />
            <span className="w-8 text-center">{getFileType(item.name)}</span>
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
            </div>
            <div className="font-bold">{formatBytes(item.size)}</div>
          </div>
        ))}
        {result.items.length === 0 && <p className="text-gray-500">没有大于 10MB 的文件</p>}
      </div>
    </div>
  );
}

export default DownloadsModule;
