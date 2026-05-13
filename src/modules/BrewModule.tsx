import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useClean } from '@/hooks/useClean';

function BrewModule() {
  const { scanResults, setScanning } = useAppStore();
  const { doSafeClean } = useClean();
  const result = scanResults['brew'];

  useEffect(() => {
    handleScan();
  }, []);

  async function handleScan() {
    setScanning(true);
    try {
      await scanModule('brew');
    } finally {
      setScanning(false);
    }
  }

  async function handleClean() {
    setScanning(true);
    try {
      await doSafeClean('brew');
    } finally {
      setScanning(false);
    }
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🍺 Brew 缓存</h1>
        <button
          onClick={handleClean}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700"
        >
          ⚡ 安全清理
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-gray-800 p-4">
          <div className="text-sm text-gray-400">已扫描项</div>
          <div className="text-2xl font-bold">{result.itemCount}</div>
        </div>
        <div className="rounded-lg bg-gray-800 p-4">
          <div className="text-sm text-gray-400">可清理项</div>
          <div className="text-2xl font-bold text-yellow-400">
            {result.items.filter((i) => i.safeToRemove).length}
          </div>
        </div>
        <div className="rounded-lg bg-gray-800 p-4">
          <div className="text-sm text-gray-400">可清理空间</div>
          <div className="text-2xl font-bold text-green-400">{formatBytes(result.totalSize)}</div>
        </div>
      </div>

      {result.items.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="pb-2 text-left">名称</th>
              <th className="pb-2 text-left">详情</th>
              <th className="pb-2 text-right">占用</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-800">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-gray-400">{item.description ?? '-'}</td>
                <td className="py-2 text-right">{formatBytes(item.size)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500">没有可清理的旧版本</p>
      )}
    </div>
  );
}

export default BrewModule;
