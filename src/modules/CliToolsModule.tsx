import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';

function CliToolsModule() {
  const { scanResults, setScanning } = useAppStore();
  const result = scanResults['cli-tools'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try { await scanModule('cli-tools'); }
    finally { setScanning(false); }
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🛠️ CLI 工具</h1>
        <button onClick={handleScan} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
          重新扫描
        </button>
      </div>

      <div className="rounded-lg bg-gray-800 p-4">
        {result.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between border-b border-gray-700 py-3 last:border-0">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-gray-400">{item.path}</div>
            </div>
            <div className="text-right">
              <div className="font-bold">{formatBytes(item.size)}</div>
            </div>
          </div>
        ))}
        {result.items.length === 0 && <p className="text-gray-500">没有检测到 CLI 工具数据</p>}
      </div>
    </div>
  );
}

export default CliToolsModule;
