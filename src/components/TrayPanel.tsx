import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { scanAll, scanApps, scanResidual, scanCliToolsList } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { navItems } from '@/store';

interface DiskInfo {
  total: number;
  used: number;
  available: number;
  usagePercent: number;
}

export default function TrayPanel() {
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { scanResults, totalCleanable, isScanning, setScanResults, setApps, setResiduals, setCliTools, setScanning } = useAppStore();

  const hasData = Object.keys(scanResults).length > 0;

  const modules = navItems
    .filter((item) => item.group === 'clean' && item.id !== 'dashboard')
    .map((item) => ({
      ...item,
      size: scanResults[item.id as keyof typeof scanResults]?.totalSize ?? 0,
    }))
    .filter((m) => m.size > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, 5);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      setError(null);
      const [disk, results, apps, residuals, cliTools] = await Promise.all([
        window.electronAPI.ipc.invoke('disk:info'),
        scanAll(),
        scanApps(),
        scanResidual(),
        scanCliToolsList(),
      ]);
      setDiskInfo(disk as DiskInfo);
      setScanResults(results);
      setApps(apps);
      setResiduals(residuals);
      setCliTools(cliTools as { name: string; source: string; version: string; path: string; size?: number }[]);
      // 通知主窗口也刷新数据
      window.electronAPI.ipc.invoke('panel:refresh');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickClean() {
    setScanning(true);
    try {
      for (const item of navItems.filter((n) => n.group === 'clean' && n.id !== 'dashboard')) {
        await window.electronAPI.ipc.invoke('clean:safe', item.id);
      }
      await loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '清理失败');
    } finally {
      setScanning(false);
    }
  }

  function openMainWindow() {
    window.electronAPI.ipc.invoke('window:show-main');
  }

  function openSettings() {
    window.electronAPI.ipc.invoke('window:show-main', 'settings');
  }

  function quitApp() {
    window.electronAPI.ipc.send('app:quit');
  }

  // Keyboard shortcuts for panel buttons
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if (!e.metaKey) return;
      if (key === 'r') {
        e.preventDefault();
        loadData();
      } else if (key === 'o') {
        e.preventDefault();
        openMainWindow();
      } else if (key === ',') {
        e.preventDefault();
        openSettings();
      } else if (key === 'q') {
        e.preventDefault();
        quitApp();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen bg-macos-bg text-macos-text-primary flex flex-col p-2.5 overflow-hidden select-none">
      {/* 磁盘信息 + 一键清理 */}
      <div className="bg-macos-surface rounded-xl p-3 mb-2.5 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Macintosh HD</span>
          {diskInfo && (
            <span className="text-xs text-macos-text-secondary">
              {diskInfo.usagePercent}% 已用
            </span>
          )}
        </div>
        {diskInfo && (
          <div className="h-2 rounded-full bg-macos-content overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-macos-accent transition-all duration-500"
              style={{ width: `${diskInfo.usagePercent}%` }}
            />
          </div>
        )}
        <button
          onClick={handleQuickClean}
          disabled={isScanning || totalCleanable === 0}
          className="w-full rounded-lg bg-macos-green py-1.5 text-sm font-medium hover:bg-macos-green-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isScanning ? '扫描中...' : `一键清理 ${formatBytes(totalCleanable)}`}
        </button>
      </div>

      {/* 模块卡片 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1.5 pr-0.5">
        {error && (
          <div className="text-xs text-macos-red bg-macos-red/10 rounded-lg p-2 text-center">
            {error}
          </div>
        )}
        {!hasData && !isScanning && !error && (
          <div className="text-xs text-macos-text-secondary text-center py-4">
            暂无数据，点击刷新
          </div>
        )}
        {modules.map((item) => (
          <div
            key={item.id}
            className="bg-macos-surface rounded-lg p-2.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base flex-shrink-0">{item.icon}</span>
              <span className="text-sm truncate">{item.label}</span>
            </div>
            <span className="text-sm font-semibold flex-shrink-0 ml-2">
              {formatBytes(item.size)}
            </span>
          </div>
        ))}
      </div>

      {/* 底部按钮：刷新 / 打开 / 设置 / 退出 */}
      <div className="mt-2.5 flex-shrink-0 grid grid-cols-4 gap-1.5">
        <button
          onMouseDown={(e) => { e.preventDefault(); loadData(); }}
          className="rounded-lg bg-macos-surface py-1.5 text-xs font-medium text-macos-text-secondary hover:bg-macos-surface-hover transition-colors"
        >
          {loading ? '刷新中' : '刷新'}<span className="ml-1 opacity-40">⌘R</span>
        </button>
        <button
          onClick={openMainWindow}
          className="rounded-lg bg-macos-surface py-1.5 text-xs font-medium text-macos-text-secondary hover:bg-macos-surface-hover transition-colors"
        >
          打开<span className="ml-1 opacity-40">⌘O</span>
        </button>
        <button
          onClick={openSettings}
          className="rounded-lg bg-macos-surface py-1.5 text-xs font-medium text-macos-text-secondary hover:bg-macos-surface-hover transition-colors"
        >
          设置<span className="ml-1 opacity-40">⌘,</span>
        </button>
        <button
          onClick={quitApp}
          className="rounded-lg bg-macos-red/20 py-1.5 text-xs font-medium text-macos-red hover:bg-macos-red/30 transition-colors"
        >
          退出<span className="ml-1 opacity-40">⌘Q</span>
        </button>
      </div>
    </div>
  );
}
