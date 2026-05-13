import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useClean } from '@/hooks/useClean';

function DockerModule() {
  const { scanResults, setScanning } = useAppStore();
  const { doSafeClean } = useClean();
  const result = scanResults['docker'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try { await scanModule('docker'); }
    finally { setScanning(false); }
  }

  async function handleClean() {
    setScanning(true);
    try { await doSafeClean('docker'); }
    finally { setScanning(false); }
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🐳 Docker 清理</h1>
        <button onClick={handleClean} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700">
          ⚡ 安全清理
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {result.items.map((item, i) => (
          <div key={i} className="rounded-lg bg-gray-800 p-3">
            <div className="text-xs text-gray-400">{item.name}</div>
            <div className="text-lg font-bold">{formatBytes(item.size)}</div>
          </div>
        ))}
      </div>

      {result.items.length > 0 ? (
        <div className="rounded-lg bg-gray-800 p-4">
          <h3 className="mb-2 text-sm font-semibold text-green-400">🟢 可清理项</h3>
          {result.items.filter(i => i.safeToRemove).map((item, i) => (
            <div key={i} className="flex justify-between py-1 text-sm">
              <span>{item.name}</span>
              <span>{formatBytes(item.size)}</span>
            </div>
          ))}
          {result.items.filter(i => !i.safeToRemove).length > 0 && (
            <>
              <h3 className="mb-2 mt-4 text-sm font-semibold text-orange-400">🟠 需要确认</h3>
              {result.items.filter(i => !i.safeToRemove).map((item, i) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span>{item.name}</span>
                  <span>{formatBytes(item.size)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <p className="text-gray-500">没有可清理项</p>
      )}
    </div>
  );
}

export default DockerModule;
