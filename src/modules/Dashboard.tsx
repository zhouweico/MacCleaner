import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { scanAll, scanApps, scanResidual } from '@/lib/ipc';
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
    <div className="bg-macos-surface rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold">Macintosh HD</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-macos-text-secondary">
            已使用 {formatBytes(diskInfo.used)} / {formatBytes(diskInfo.total)}
          </span>
          <button className="rounded bg-macos-content px-3 py-1 text-xs font-medium hover:bg-macos-content">
            全部宗卷...
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1 h-6 rounded-full overflow-hidden flex bg-macos-content">
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
            className="bg-macos-content"
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
              <span className="text-macos-text-secondary">{categoryLabels[key]}</span>
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
            className="bg-macos-surface rounded-xl p-4 text-left hover:bg-macos-surface-hover transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-semibold truncate">{item.label}</span>
            </div>
            <div className="text-xl font-bold">{formatBytes(item.size)}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1 rounded-full bg-macos-content overflow-hidden">
                <div
                  className="h-full rounded-full bg-macos-accent transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-xs text-macos-text-tertiary">{percent}%</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function UninstallCards({ apps, residuals, cliCount, cliSize }: { apps: { size: number }[]; residuals: { size: number }[]; cliCount: number; cliSize: number }) {
  const { setCurrentModule } = useAppStore();

  const modules = [
    { id: 'uninstall-apps', label: '应用程序', icon: '📱', size: apps.reduce((s, a) => s + a.size, 0), count: apps.length },
    { id: 'uninstall-cli', label: 'CLI 工具', icon: '🛠️', size: cliSize, count: cliCount },
    { id: 'residual-clean', label: '残留文件', icon: '🗑️', size: residuals.reduce((s, r) => s + r.size, 0), count: residuals.length },
  ].filter(m => m.count > 0);

  if (modules.length === 0) return null;

  const totalSize = modules.reduce((s, m) => s + m.size, 0);

  return (
    <div>
      <h2 className="text-xs font-semibold text-macos-text-secondary mb-2">
        卸载管理 · {formatBytes(totalSize)}
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {modules.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentModule(item.id)}
            className="bg-macos-surface rounded-xl p-4 text-left hover:bg-macos-surface-hover transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-semibold truncate">{item.label}</span>
            </div>
            <div className="text-xl font-bold">{formatBytes(item.size)}</div>
            <div className="text-xs text-macos-text-tertiary mt-1">{item.count} 项</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const { scanResults, setScanResults, isScanning, setScanning, apps, setApps, residuals, setResiduals, setCliTools } = useAppStore();
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null);
  const [cliCount, setCliCount] = useState(0);
  const [cliSize, setCliSize] = useState(0);

  useEffect(() => {
    if (Object.keys(scanResults).length === 0) {
      handleScan();
    }
    window.electronAPI.ipc.invoke('disk:info').then((data: unknown) => setDiskInfo(data as DiskInfo));
    scanApps().then(setApps).catch(() => {});
    scanResidual().then(setResiduals).catch(() => {});
    window.electronAPI.ipc.invoke('scan:cli-tools').then((tools: unknown) => {
      const list = tools as { size?: number }[];
      setCliTools(list as { name: string; source: string; version: string; path: string; size?: number }[]);
      setCliCount(list.length);
      setCliSize(list.reduce((s, t) => s + (t.size ?? 0), 0));
    }).catch(() => {});
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
          className="rounded bg-macos-accent px-3 py-1.5 text-xs font-medium hover:bg-macos-accent-hover disabled:opacity-50"
        >
          {isScanning ? '扫描中...' : '重新扫描'}
        </button>
      </div>

      {/* Storage overview */}
      <StorageBar diskInfo={diskInfo} />

      {/* Module cards */}
      {totalCleanable > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-macos-text-secondary mb-2">
            可清理空间 · {formatBytes(totalCleanable)}
          </h2>
          <ModuleCards />
        </div>
      )}

      {/* Uninstall cards */}
      <UninstallCards apps={apps} residuals={residuals} cliCount={cliCount} cliSize={cliSize} />
    </div>
  );
}

export default Dashboard;
