import { useEffect, useState, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useAppStore, type SelectedItem } from '@/store';
import { scanApps, scanAppAssociated, uninstallApp, showItemInFolder, getFinderIcon } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useRescanListener } from '@/hooks/useKeyboardShortcuts';
import type { AppInfo, AssociatedFile } from '@/types';
import SelectionSummary from '@/components/SelectionSummary';

// Cache finder icon globally
let finderIconCache: string | null = null;

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

function FileRow({ file, checkedFiles, onToggleFile, iconSrc }: {
  file: AssociatedFile;
  checkedFiles: Set<string>;
  onToggleFile: (path: string, checked: boolean) => void;
  iconSrc: string | null;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-xs cursor-default"
      style={{ backgroundColor: hovered ? '#3d3d3d' : undefined }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <input
        type="checkbox"
        checked={checkedFiles.has(file.path)}
        onChange={(e) => onToggleFile(file.path, e.target.checked)}
        className="rounded shrink-0"
      />
      <span className="text-macos-text-tertiary shrink-0">{file.type === 'binary' ? '⚙️' : file.type === 'cache' ? '🗂️' : '📁'}</span>
      <span className="text-macos-text-primary truncate flex-1 min-w-0">{file.path}</span>
      <button
        onClick={() => showItemInFolder(file.path)}
        className="shrink-0 p-0 rounded hover:bg-macos-surface-hover"
        style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}
        title="在访达中打开"
      >
        {iconSrc ? (
          <img src={iconSrc} alt="Finder" className="w-3.5 h-3.5" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-macos-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        )}
      </button>
      <span className="text-macos-text-tertiary shrink-0 ml-2">{formatBytes(file.size)}</span>
    </div>
  );
}

function CollapsibleSection({ title, files, checkedFiles, onToggleFile, defaultExpanded = false }: {
  title: string;
  files: AssociatedFile[];
  checkedFiles: Set<string>;
  onToggleFile: (path: string, checked: boolean) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [finderIcon, setFinderIcon] = useState<string | null>(finderIconCache);
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const checkedCount = files.filter(f => checkedFiles.has(f.path)).length;

  useEffect(() => {
    if (!finderIconCache) {
      getFinderIcon().then((icon) => {
        finderIconCache = icon;
        setFinderIcon(icon);
      });
    }
  }, []);

  const iconSrc = finderIcon || finderIconCache;

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
            <FileRow key={i} file={f} checkedFiles={checkedFiles} onToggleFile={onToggleFile} iconSrc={iconSrc} />
          ))}
        </div>
      )}
    </div>
  );
}

function UninstallAppsList() {
  const { apps, setApps, setScanning, setSelectedItem, clearSelection, selectedItem, isSelected, toggleSelection, searchTargetPath } = useAppStore();
  const [scanning, setScanningState] = useState(false);
  const lastAutoSelectPath = useRef('');
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  const handleScan = useCallback(async () => {
    setScanningState(true);
    setScanning(true);
    setSelectedItem(null);
    clearSelection();
    try {
      const result = await scanApps();
      setApps(result);
    } catch (e) {
      console.error('[scan:apps] failed:', e);
      setApps([]);
    } finally {
      setScanningState(false);
      setScanning(false);
    }
  }, [setScanning, setSelectedItem, clearSelection, setApps]);

  useEffect(() => {
    lastAutoSelectPath.current = '';
    if (apps.length === 0) handleScan();
  }, []);

  useRescanListener('uninstall-apps', handleScan);

  // Auto-select from search navigation + scroll into view
  useEffect(() => {
    if (!searchTargetPath || searchTargetPath === lastAutoSelectPath.current) return;
    const app = apps.find(a => a.path === searchTargetPath);
    if (app) {
      setSelectedItem({ ...app, path: app.path } as unknown as SelectedItem);
      lastAutoSelectPath.current = searchTargetPath;
      requestAnimationFrame(() => {
        const el = rowRefs.current.get(app.path);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [searchTargetPath, apps]);

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
      <div className="border-b border-macos-separator px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">📱 应用程序</h2>
          <p className="text-xs text-macos-text-tertiary">{totalApps} 个应用 · {formatBytes(totalSize)}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {apps.length > 0 ? (
          <div className="bg-macos-surface/50 rounded-xl overflow-hidden">
            {apps.map((app, i) => {
              const selected = isSelected(app.path) || selectedItem?.path === app.path;
              return (
                <button
                  key={i}
                  ref={(el) => {
                    if (el) rowRefs.current.set(app.path, el);
                    else rowRefs.current.delete(app.path);
                  }}
                  onClick={() => handleSelectApp(app)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${selected ? 'bg-macos-surface-hover' : 'hover:bg-macos-surface-hover'} ${i > 0 ? 'border-t border-macos-separator' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected(app.path)}
                    onChange={() => toggleSelection(app.path)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg bg-macos-surface flex items-center justify-center overflow-hidden shrink-0">
                    {app.iconData ? (
                      <img src={app.iconData} alt={app.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <span className="text-sm">📱</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-macos-text-primary">{app.name}</div>
                    <div className="text-xs text-macos-text-tertiary">{formatDate((app as any).modifiedAt)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-macos-text-secondary">{formatBytes(app.size)}</div>
                    <div className="text-xs text-macos-text-tertiary">{app.associatedFiles.length} 权限</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-macos-text-tertiary">{scanning ? '扫描中...' : '没有检测到 APP'}</p>
        )}
      </div>
    </div>
  );
}

export function UninstallAppsDetail() {
  const { selectedItem, selectedPaths, apps, setApps, setSelectedItem, clearSelection, setScanning } = useAppStore();
  const [keepUserData, setKeepUserData] = useState(true);
  const [checkedFiles, setCheckedFiles] = useState<Set<string>>(new Set());

  // 无选中状态
  if (!selectedItem && selectedPaths.size === 0) {
    return (
      <div className="flex h-full items-center justify-center text-macos-text-tertiary">
        <p>选择一项以查看详情</p>
      </div>
    );
  }

  // 批量选中
  if (!selectedItem && selectedPaths.size > 0) {
    async function handleBatchUninstall() {
      setScanning(true);
      try {
        const appPaths = Array.from(selectedPaths);
        for (const appPath of appPaths) {
          const app = apps.find(a => a.path === appPath);
          if (app) {
            const allPaths = [app.path, ...app.associatedFiles.map(f => f.path)];
            await uninstallApp(app.path, allPaths, true);
          }
        }
        clearSelection();
        const result = await scanApps();
        setApps(result);
      } finally {
        setScanning(false);
      }
    }

    const items = apps.filter(a => selectedPaths.has(a.path)).map(a => ({
      name: a.name,
      path: a.path,
      size: a.size + a.associatedFiles.reduce((s, f) => s + f.size, 0),
      children: a.associatedFiles.map(f => ({ name: f.path.split('/').pop() ?? f.path, path: f.path, size: f.size })),
    }));

    return (
      <SelectionSummary
        moduleName="应用程序"
        moduleIcon="📱"
        items={items}
        onClean={handleBatchUninstall}
        cleanLabel="卸载"
      />
    );
  }

  // 单项详情
  const app = selectedItem as unknown as AppInfo;

  return (
    <AppDetailContent app={app} keepUserData={keepUserData} setKeepUserData={setKeepUserData}
      checkedFiles={checkedFiles} setCheckedFiles={setCheckedFiles}
      setSelectedItem={setSelectedItem} scanApps={() => scanApps().then(setApps)} />
  );
}

function AppDetailContent({ app, keepUserData, setKeepUserData, checkedFiles, setCheckedFiles, setSelectedItem, scanApps }: {
  app: AppInfo;
  keepUserData: boolean;
  setKeepUserData: (v: boolean) => void;
  checkedFiles: Set<string>;
  setCheckedFiles: Dispatch<SetStateAction<Set<string>>>;
  setSelectedItem: (item: SelectedItem | null) => void;
  scanApps: () => void;
}) {
  const fileGroups = groupFilesByType(app.associatedFiles);
  const totalSize = app.size + app.associatedFiles.reduce((s, f) => s + f.size, 0);
  const selectedCount = checkedFiles.size;
  const selectedSize = Array.from(checkedFiles)
    .map(p => app.associatedFiles.find(f => f.path === p)?.size ?? 0)
    .reduce((s, v) => s + v, 0);

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

  async function handleUninstall() {
    const paths = Array.from(checkedFiles);
    await uninstallApp(app.path, paths, keepUserData);
    setSelectedItem(null);
    setCheckedFiles(new Set());
    scanApps();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-macos-separator px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-macos-surface flex items-center justify-center overflow-hidden shrink-0">
              {app.iconData ? (
                <img src={app.iconData} alt={app.name} className="w-8 h-8 object-contain" />
              ) : (
                <span className="text-sm">📱</span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold">{app.name}</h2>
              <p className="text-xs text-macos-text-tertiary">{app.path}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold">{formatBytes(totalSize)}</div>
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
        <CollapsibleSection
          title="可执行文件"
          files={[{ path: app.path, type: 'binary' as any, size: app.size }]}
          checkedFiles={checkedFiles}
          onToggleFile={toggleFile}
          defaultExpanded
        />

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
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span><span className="font-bold">{formatBytes(selectedSize)}</span> <span className="text-macos-text-tertiary">所选</span></span>
          <span><span className="font-bold">{selectedCount}</span> <span className="text-macos-text-tertiary">项已选</span></span>
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
            className="rounded-lg bg-macos-red px-4 py-2 text-sm font-bold hover:bg-macos-red-hover disabled:opacity-50"
          >
            卸载
          </button>
        </div>
      </div>
    </div>
  );
}

export default UninstallAppsList;
