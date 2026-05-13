import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { scanAll } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { navItems } from '@/store';

function Dashboard() {
  const { scanResults, setScanResults, isScanning, setScanning, setCurrentModule } = useAppStore();

  useEffect(() => {
    if (Object.keys(scanResults).length === 0) {
      handleScan();
    }
  }, []);

  async function handleScan() {
    setScanning(true);
    try {
      const results = await scanAll();
      setScanResults(results);
    } catch (error) {
      console.error('扫描失败:', error);
    } finally {
      setScanning(false);
    }
  }

  const totalCleanable = Object.values(scanResults).reduce(
    (sum, r) => sum + (r?.totalSize ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏠 仪表盘</h1>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isScanning ? '扫描中...' : '重新扫描'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-red-500 to-purple-700 p-6">
          <div className="text-3xl font-bold text-white">{formatBytes(totalCleanable)}</div>
          <div className="mt-1 text-sm text-white/70">可清理空间</div>
        </div>
        <div className="rounded-xl bg-gray-800 p-6">
          <div className="text-3xl font-bold text-blue-400">
            {Object.values(scanResults).length > 0 ? '已扫描' : '未扫描'}
          </div>
          <div className="mt-1 text-sm text-gray-400">{Object.keys(scanResults).length} / 7 模块</div>
        </div>
      </div>

      <div className="rounded-xl bg-gray-800 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">各模块可清理空间</h2>
        <div className="space-y-2">
          {navItems
            .filter((item) => item.group === 'clean' && item.id !== 'dashboard')
            .map((item) => {
              const result = scanResults[item.id as keyof typeof scanResults];
              const size = result?.totalSize ?? 0;
              const max = Math.max(totalCleanable, 1);
              const percent = Math.round((size / max) * 100);

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentModule(item.id)}
                  className="flex w-full items-center gap-3 py-1.5 hover:bg-gray-700/50"
                >
                  <span className="w-20 text-left text-sm">{item.icon} {item.label.split(' ')[0]}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-gray-700">
                    <div
                      className="h-4 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm text-gray-400">{formatBytes(size)}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
