import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useClean } from '@/hooks/useClean';

function NpmModule() {
  const { scanResults, setScanning } = useAppStore();
  const { doSafeClean } = useClean();
  const result = scanResults['npm'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try { await scanModule('npm'); }
    finally { setScanning(false); }
  }

  async function handleClean() {
    setScanning(true);
    try { await doSafeClean('npm'); }
    finally { setScanning(false); }
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📦 npm / Node.js</h1>
        <button onClick={handleClean} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700">
          ⚡ 清理 npm 缓存
        </button>
      </div>

      <div className="rounded-lg bg-gray-800 p-4">
        {result.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between border-b border-gray-700 py-3 last:border-0">
            <div>
              <div className="font-medium">{item.name}</div>
              {item.description && <div className="text-xs text-gray-400">{item.description}</div>}
            </div>
            <div className="text-right">
              <div className="font-bold">{formatBytes(item.size)}</div>
              <div className="text-xs text-gray-400">{item.safeToRemove ? '可安全清理' : '需确认'}</div>
            </div>
          </div>
        ))}
        {result.items.length === 0 && <p className="text-gray-500">没有可清理项</p>}
      </div>
    </div>
  );
}

export default NpmModule;
