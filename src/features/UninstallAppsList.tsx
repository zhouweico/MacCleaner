import { useEffect, useState } from 'react';
import { useAppStore, type SelectedItem } from '@/store';
import { scanApps, scanAppAssociated, uninstallApp } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import type { AppInfo, AssociatedFile } from '@/types';

// 按类型分组文件
function groupFilesByType(files: AssociatedFile[]) {
  const groups: Record<string, AssociatedFile[]> = {};
  for (const f of files) {
    const typeMap: Record<string, string> = {
      binary: '可执行文件',
      support: '应用程序支持',
      preferences: '偏好设置',
      cache: '缓存',
      container: '容器',
      savedState: '保存状态',
      webkit: 'WebKit 数据',
      hiddenDir: '隐藏目录',
    };
    const group = typeMap[f.type] ?? f.type;
    if (!groups[group]) groups[group] = [];
    groups[group].push(f);
  }
  return groups;
}

function formatDate(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function CollapsibleSection({ title, files, checkedFiles, onToggleFile, defaultExpanded = false }: {
  title: string;
  files: AssociatedFile[];
  checkedFiles: Set<string>;
  onToggleFile: (path: string, checked: boolean) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const checkedCount = files.filter(f => checkedFiles.has(f.path)).length;

  return (
    <div className="border border-macos-separator rounded-lg mb-2 overflow-hidden bg-macos-surface/50">
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-macos-surface-hover"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checkedCount === files.length && files.length > 0}
            onChange={(e) => {
              e.stopPropagation();
              const checked = e.target.checked;
              files.forEach(f => onToggleFile(f.path, checked));
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded shrink-0"
          />
          <span className="text-xs text-macos-text-tertiary">{expanded ? '▾' : '▸'}</span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <span className="text-xs text-macos-text-tertiary">{files.length} 个文件 · {formatBytes(totalSize)}</span>
      </div>
      {expanded && (
        <div className="border-t border-macos-separator">
          {files.map((f, i) => (
            <label key={i} className="flex items-center gap-2 px-4 py-2 hover:bg-macos-surface-hover/30 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={checkedFiles.has(f.path)}
                onChange={(e) => onToggleFile(f.path, e.target.checked)}
                className="rounded shrink-0"
              />
              <span className="text-macos-text-tertiary shrink-0">{f.type === 'binary' ? '⚙️' : f.type === 'cache' ? '🗂️' : '📁'}</span>
              <span className="text-macos-text-primary truncate flex-1 min-w-0">{f.path}</span>
              <span className="text-macos-text-tertiary shrink-0 ml-2">{formatBytes(f.size)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function UninstallAppsList() {
  const { apps, setApps, setScanning, setSelectedItem, isSelected, toggleSelection } = useAppStore();
  const [scanning, setScanningState] = useState(false);

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanningState(true);
    setScanning(true);
    try {
      const result = await scanApps();
      setApps(result);
    } finally {
      setScanningState(false);
      setScanning(false);
    }
  }

  async function handleSelectApp(app: AppInfo) {
    if (app.associatedFiles.length === 0 && app.bundleId) {
      const files = await scanAppAssociated(app.bundleId, app.name);
      const updated = apps.map(a => a.path === app.path ? { ...a, associatedFiles: files } : a);
      setApps(updated);
      setSelectedItem({ ...app, associatedFiles: files } as unknown as SelectedItem);
    } else {
      setSelectedItem(app as unknown as SelectedItem);
    }
  }

  const totalApps = apps.length;
  const totalSize = apps.reduce((s, a) => s + a.size, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-macos-separator px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">📱 已安装 APP</h2>
          <p className="text-xs text-macos-text-tertiary">{totalApps} 个应用 · {formatBytes(totalSize)}</p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="rounded bg-macos-accent px-2.5 py-1.5 text-xs font-medium hover:bg-macos-accent-hover disabled:opacity-50"
        >
          {scanning ? '扫描中...' : '重新扫描'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {apps.map((app, i) => (
          <button
            key={i}
            onClick={() => handleSelectApp(app)}
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-macos-separator ${
              isSelected(app.path) ? 'bg-macos-accent/20' : 'hover:bg-macos-surface-hover'
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected(app.path)}
              onChange={() => toggleSelection(app.path)}
              onClick={(e) => e.stopPropagation()}
              className="rounded shrink-0"
            />
            <div className="w-8 h-8 rounded bg-macos-surface flex items-center justify-center overflow-hidden shrink-0">
              {app.iconData ? (
                <img src={app.iconData} alt={app.name} className="w-8 h-8 object-contain" />
              ) : (
                <span className="text-sm">📱</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{app.name}</div>
              <div className="text-xs text-macos-text-tertiary">{formatDate((app as any).modifiedAt)}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-medium">{formatBytes(app.size)}</div>
              <div className="text-xs text-macos-text-tertiary">{app.associatedFiles.length} 权限</div>
            </div>
          </button>
        ))}
        {apps.length === 0 && (
          <p className="py-8 text-center text-macos-text-tertiary">{scanning ? '扫描中...' : '没有检测到 APP'}</p>
        )}
      </div>
    </div>
  );
}

export function UninstallAppsDetail() {
  const { selectedItem, setSelectedItem, setApps } = useAppStore();
  const [keepUserData, setKeepUserData] = useState(true);
  const [checkedFiles, setCheckedFiles] = useState<Set<string>>(new Set());

  if (!selectedItem || !('associatedFiles' in selectedItem)) {
    return <p className="text-macos-text-tertiary">选择一项以查看详情</p>;
  }

  const app = selectedItem as unknown as AppInfo;
  const totalSize = app.size + app.associatedFiles.reduce((s, f) => s + f.size, 0);
  const fileGroups = groupFilesByType(app.associatedFiles);

  function toggleFile(path: string, checked: boolean) {
    setCheckedFiles(prev => {
      const next = new Set(prev);
      if (checked) next.add(path);
      else next.delete(path);
      return next;
    });
  }

  // 默认选中所有文件
  useEffect(() => {
    if (app.associatedFiles.length > 0 && checkedFiles.size === 0) {
      setCheckedFiles(new Set(app.associatedFiles.map(f => f.path)));
    }
  }, [app.path]);

  const selectedCount = checkedFiles.size;
  const selectedSize = Array.from(checkedFiles)
    .map(p => app.associatedFiles.find(f => f.path === p)?.size ?? 0)
    .reduce((s, v) => s + v, 0);

  async function handleUninstall() {
    const paths = Array.from(checkedFiles);
    await uninstallApp(app.path, paths, keepUserData);
    setSelectedItem(null);
    setCheckedFiles(new Set());
    const result = await scanApps();
    setApps(result);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-macos-separator px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-macos-surface flex items-center justify-center overflow-hidden shrink-0">
              {app.iconData ? (
                <img src={app.iconData} alt={app.name} className="w-10 h-10 object-contain" />
              ) : (
                <span className="text-xl">📱</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">{app.name}</h2>
              <p className="text-xs text-macos-text-tertiary">{app.path}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold">{formatBytes(totalSize)}</div>
            <p className="text-xs text-macos-text-tertiary">{app.associatedFiles.length + 1} 个项目</p>
          </div>
        </div>
      </div>

      {/* Keep user data */}
      <div className="border-b border-macos-separator px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={keepUserData} onChange={e => setKeepUserData(e.target.checked)} className="rounded" />
          保留用户数据（Documents、Application Support 中的用户文件）
        </label>
      </div>

      {/* File groups */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* App binary */}
        <CollapsibleSection
          title="可执行文件"
          files={[{ path: app.path, type: 'binary' as any, size: app.size }]}
          checkedFiles={checkedFiles}
          onToggleFile={toggleFile}
          defaultExpanded
        />

        {/* Associated files grouped by type */}
        {Object.entries(fileGroups).map(([groupName, files]) => (
          <CollapsibleSection
            key={groupName}
            title={groupName}
            files={files}
            checkedFiles={checkedFiles}
            onToggleFile={toggleFile}
            defaultExpanded={groupName === '应用程序支持'}
          />
        ))}
      </div>

      {/* Bottom action bar */}
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span><span className="font-bold">{formatBytes(selectedSize)}</span> <span className="text-macos-text-tertiary">所选</span></span>
            <span><span className="font-bold">{selectedCount}</span> <span className="text-macos-text-tertiary">个项目所选</span></span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedItem(null)}
              className="rounded-lg bg-macos-surface px-4 py-2 text-sm font-medium hover:bg-macos-surface-hover"
            >
              取消
            </button>
            <button
              onClick={handleUninstall}
              disabled={selectedCount === 0}
              className="rounded-lg bg-macos-accent px-6 py-2 text-sm font-bold hover:bg-macos-accent-hover disabled:opacity-50"
            >
              移除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UninstallAppsList;
