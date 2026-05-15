import { useEffect, useRef, useCallback } from 'react';
import { useAppStore, type SelectedItem } from '@/store';
import { scanModule, advancedClean } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useRescanListener } from '@/hooks/useKeyboardShortcuts';
import type { ScanItem, CleanAction } from '@/types';
import CollapsibleFileSection from '@/components/CollapsibleFileSection';
import SelectionSummary from '@/components/SelectionSummary';
import AutoHideScroll from '@/components/AutoHideScroll';

function SystemCacheList() {
  const { scanResults, setScanning, setScanResults, selectedItem, setSelectedItem, isSelected, toggleSelection, searchTargetPath } = useAppStore();
  const result = scanResults['system-cache'];
  const lastAutoSelectPath = useRef('');
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  const handleScan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await scanModule('system-cache');
      setScanResults({ 'system-cache': result });
    } finally { setScanning(false); }
  }, [setScanning, setScanResults]);

  useEffect(() => {
    lastAutoSelectPath.current = '';
    handleScan();
  }, []);

  useRescanListener('system-cache', handleScan);

  // Auto-select from search navigation + scroll into view
  useEffect(() => {
    if (!searchTargetPath || searchTargetPath === lastAutoSelectPath.current || !result) return;
    const item = result.items.find(i => i.path === searchTargetPath);
    if (item) {
      setSelectedItem(item as unknown as SelectedItem);
      lastAutoSelectPath.current = searchTargetPath;
      requestAnimationFrame(() => {
        const el = rowRefs.current.get(item.path);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [searchTargetPath, result]);

  function handleSelect(item: ScanItem) {
    setSelectedItem(item as unknown as SelectedItem);
  }

  if (!result) return <p className="p-4 text-macos-text-tertiary">加载中...</p>;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">🗂️ 系统缓存</h2>
          <p className="text-xs text-macos-text-tertiary">{result.items.length} 项 · {formatBytes(result.totalSize)}</p>
        </div>
      </div>
      <p className="px-4 py-2 text-xs text-macos-text-tertiary">缓存删除后应用会自动重建，不影响数据</p>
      <AutoHideScroll className="flex-1 px-3 py-3">
        {result.items.length > 0 ? (
          <div className="bg-macos-surface/50 rounded-xl overflow-hidden">
            {result.items.map((item, i) => {
              const selected = selectedItem?.path === item.path || isSelected(item.path);
              return (
                <div
                  key={i}
                  ref={(el) => {
                    if (el) rowRefs.current.set(item.path, el);
                    else rowRefs.current.delete(item.path);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${selected ? 'bg-macos-surface-hover' : 'hover:bg-macos-surface-hover'} ${i > 0 ? 'border-t border-macos-separator' : ''}`}
                  onClick={() => handleSelect(item)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected(item.path)}
                    onChange={() => toggleSelection(item.path)}
                    onClick={e => e.stopPropagation()}
                    className="rounded shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg macos-icon-teal flex items-center justify-center text-sm shrink-0">🗂️</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-macos-text-primary">{item.name}</div>
                    <div className="text-xs text-macos-text-tertiary truncate">{item.path}</div>
                  </div>
                  <span className="text-xs text-macos-text-secondary shrink-0">{formatBytes(item.size)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-4 text-macos-text-tertiary">没有可清理缓存</p>
        )}
      </AutoHideScroll>
    </div>
  );
}

export function SystemCacheDetail() {
  const { selectedItem, selectedPaths, scanResults, setScanning, clearSelection } = useAppStore();
  const result = scanResults['system-cache'];

  async function handleClean() {
    if (!result || selectedPaths.size === 0) return;
    const actions: CleanAction[] = result.items
      .filter(i => selectedPaths.has(i.path))
      .map(i => ({ path: i.path, size: i.size, description: i.name }));
    setScanning(true);
    try {
      await advancedClean('system-cache', actions);
      clearSelection();
    } finally { setScanning(false); }
  }

  if (!selectedItem && selectedPaths.size === 0) {
    return (
      <div className="flex h-full items-center justify-center text-macos-text-tertiary">
        <p>选择一项以查看详情</p>
      </div>
    );
  }

  if (!selectedItem && selectedPaths.size > 0) {
    const items = result!.items
      .filter(i => selectedPaths.has(i.path))
      .map(i => ({ name: i.name, path: i.path, size: i.size, children: (i as any).children }));
    return (
      <SelectionSummary
        moduleIcon="🗂️"
        items={items}
        onClean={handleClean}
      />
    );
  }

  const item = selectedItem as unknown as ScanItem;
  const selectedCount = selectedPaths.size;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg macos-icon-teal flex items-center justify-center text-sm shrink-0">🗂️</div>
            <div>
              <h2 className="text-sm font-bold">{item.name}</h2>
              <p className="text-xs text-macos-text-tertiary">{item.path}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold">{formatBytes(item.size)}</div>
          </div>
        </div>
      </div>
      <AutoHideScroll className="flex-1 px-4 py-3">
        <CollapsibleFileSection
          title="文件列表"
          files={item.children?.map(c => ({ name: (c as unknown as ScanItem).name, path: (c as unknown as ScanItem).path, size: (c as unknown as ScanItem).size, isDir: (c as unknown as ScanItem).type === 'data' })) ?? []}
          defaultExpanded
        />
        {!item.children?.length && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-macos-text-secondary">安全清理</span><span className={item.safeToRemove ? 'text-green-400' : 'text-orange-400'}>{item.safeToRemove ? '是' : '否'}</span></div>
          </div>
        )}
      </AutoHideScroll>
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span><span className="font-bold">{selectedCount}</span> <span className="text-macos-text-tertiary">项已选</span></span>
        </div>
        <button onClick={handleClean} className="rounded-lg bg-macos-green px-4 py-2 text-sm font-bold hover:bg-macos-green-hover">
          清理
        </button>
      </div>
    </div>
  );
}

export default SystemCacheList;
