import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { scanAll } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { navItems } from '@/store';

interface DiskInfo {
  total: number;
  used: number;
  available: number;
  usagePercent: number;
}

const categoryColors: Record<string, string> = {
  documents: '#ef4444',
  applications: '#f97316',
  development: '#eab308',
  mail: '#22c55e',
  chat: '#06b6d4',
  systemData: '#6b7280',
  macos: '#9ca3af',
};

const categoryLabels: Record<string, string> = {
  documents: '文稿',
  applications: '应用程序',
  development: '开发者',
  mail: '邮件',
  chat: '播客',
  systemData: '系统数据',
  macos: 'macOS',
};

function estimateCategorySizes(used: number): Record<string, number> {
  // 根据 macOS 存储管理估算各类别占比
  const estimates = {
    documents: 0.15,
    applications: 0.25,
    development: 0.08,
    mail: 0.02,
    chat: 0.03,
    systemData: 0.22,
    macos: 0.25,
  };
  const result: Record<string, number> = {};
  for (const [key, ratio] of Object.entries(estimates)) {
    result[key] = Math.round(used * ratio);
  }
  return result;
}

function StorageBar({ diskInfo }: { diskInfo: DiskInfo | null }) {
  if (!diskInfo) return null;

  const categories = estimateCategorySizes(diskInfo.used);
  const segments = Object.entries(categories);
  const freePercent = 100 - diskInfo.usagePercent;

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold">Macintosh HD</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            已使用 {formatBytes(diskInfo.used)} / {formatBytes(diskInfo.total)}
          </span>
          <button className="rounded bg-gray-700 px-3 py-1 text-xs font-medium hover:bg-gray-600">
            全部宗卷...
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1 h-6 rounded-full overflow-hidden flex bg-gray-700">
          {segments.map(([key, size]) => {
            const percent = (size / diskInfo.total) * 100;
            if (percent < 1) return null;
            return (
              <div
                key={key}
                style={{ width: `${percent}%`, backgroundColor: categoryColors[key] }}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                title={`${categoryLabels[key]}: ${formatBytes(size)}`}
              />
            );
          })}
          <div
            style={{ width: `${freePercent}%` }}
            className="bg-gray-600"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map(([key]) => {
          const size = categories[key];
          const percent = Math.round((size / diskInfo.total) * 100);
          if (percent < 1) return null;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[key] }} />
              <span className="text-gray-400">{categoryLabels[key]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModuleCards() {
  const { scanResults, setCurrentModule } = useAppStore();

  const modules = navItems
    .filter((item) => item.group === 'clean' && item.id !== 'dashboard')
    .map((item) => ({
      ...item,
      size: scanResults[item.id as keyof typeof scanResults]?.totalSize ?? 0,
    }))
    .filter((m) => m.size > 0)
    .sort((a, b) => b.size - a.size);

  const totalCleanable = modules.reduce((s, m) => s + m.size, 0);

  if (modules.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3">
      {modules.map((item) => {
        const percent = totalCleanable > 0 ? Math.round((item.size / totalCleanable) * 100) : 0;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentModule(item.id)}
            className="bg-gray-800 rounded-xl p-4 text-left hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-semibold truncate">{item.label}</span>
            </div>
            <div className="text-xl font-bold">{formatBytes(item.size)}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1 rounded-full bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{percent}%</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Dashboard() {
  const { scanResults, setScanResults, isScanning, setScanning } = useAppStore();
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null);

  useEffect(() => {
    if (Object.keys(scanResults).length === 0) {
      handleScan();
    }
    // 获取磁盘信息
    window.electronAPI.ipc.invoke('disk:info').then((data: unknown) => setDiskInfo(data as DiskInfo));
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold">🏠 仪表盘</h1>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isScanning ? '扫描中...' : '重新扫描'}
        </button>
      </div>

      {/* Storage overview */}
      <StorageBar diskInfo={diskInfo} />

      {/* Module cards */}
      {totalCleanable > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 mb-2">
            可清理空间 · {formatBytes(totalCleanable)}
          </h2>
          <ModuleCards />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
