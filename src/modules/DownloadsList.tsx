import { useEffect, useState, useRef } from 'react';
import { useAppStore, type SelectedItem } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import type { ScanItem } from '@/types';
import CollapsibleFileSection from '@/components/CollapsibleFileSection';

async function moveToTrash(paths: string[]) {
  for (const p of paths) {
    try {
      await window.electronAPI.ipc.invoke('clean:move-to-trash', p);
    } catch {}
  }
}

type SortKey = 'name' | 'size' | 'date';
type SortOrder = 'asc' | 'desc';

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function DownloadsList() {
  const { scanResults, setScanning, setScanResults, selectedItem, selectItem, isSelected, clearSelection, toggleSelection, searchTargetPath } = useAppStore();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const result = scanResults['downloads'];
  const lastAutoSelectPath = useRef('');
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    lastAutoSelectPath.current = '';
    handleScan();
  }, []);

  // Auto-select from search navigation + scroll into view
  useEffect(() => {
    if (!searchTargetPath || searchTargetPath === lastAutoSelectPath.current || !result) return;
    const item = result.items.find(i => i.path === searchTargetPath);
    if (item) {
      selectItem(item.path, item as unknown as SelectedItem);
      lastAutoSelectPath.current = searchTargetPath;
      requestAnimationFrame(() => {
        const el = rowRefs.current.get(item.path);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [searchTargetPath, result]);

  async function handleScan() {
    setScanning(true);
    try {
      const result = await scanModule('downloads');
      setScanResults({ downloads: result });
    } finally { setScanning(false); }
  }

  function handleSelect(item: ScanItem) {
    selectItem(item.path, item as unknown as SelectedItem);
  }

  function handleCheck(item: ScanItem) {
    toggleSelection(item.path);
    if (item.children && item.children.length > 0) {
      item.children.forEach(c => toggleSelection(c.path));
    }
  }

  function selectAll() {
    if (!result) return;
    const allPaths = new Set<string>();
    for (const item of result.items) {
      allPaths.add(item.path);
      item.children?.forEach(c => allPaths.add(c.path));
    }
    clearSelection();
    allPaths.forEach(p => toggleSelection(p));
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  }

  const sortedItems = result
    ? [...result.items].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
        else if (sortKey === 'size') cmp = a.size - b.size;
        else if (sortKey === 'date') cmp = (a.modifiedAt ?? 0) - (b.modifiedAt ?? 0);
        return sortOrder === 'asc' ? cmp : -cmp;
      })
    : [];

  if (!result) return <p className="p-4 text-macos-text-tertiary">加载中...</p>;

  const selectedCount = result.items.filter(i => isSelected(i.path)).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-macos-separator px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">📥 下载</h2>
          <p className="text-xs text-macos-text-tertiary">{result.items.length} 项 · {formatBytes(result.totalSize)}</p>
        </div>
        <div className="flex gap-1.5">
          {result.items.length > 0 && (
            <button onClick={selectAll} className="rounded bg-macos-surface px-2 py-1 text-xs font-medium hover:bg-macos-surface-hover">全选</button>
          )}
          <button onClick={handleScan} className="rounded bg-macos-accent px-2 py-1 text-xs font-medium hover:bg-macos-accent-hover">重新扫描</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {sortedItems.length > 0 ? (
          <div className="bg-macos-surface/50 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-3 px-3 py-2 border-b border-macos-separator text-xs text-macos-text-tertiary">
              <div className="w-4">
                <input
                  type="checkbox"
                  checked={selectedCount > 0 && sortedItems.every(i => isSelected(i.path))}
                  onChange={() => (selectedCount > 0 ? clearSelection() : selectAll())}
                  className="rounded"
                />
              </div>
              <div className="flex-1 cursor-pointer hover:text-macos-text-primary" onClick={() => handleSort('name')}>
                名称 {sortKey === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </div>
              <div className="w-[56px] text-right cursor-pointer hover:text-macos-text-primary" onClick={() => handleSort('size')}>
                大小 {sortKey === 'size' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </div>
              <div className="w-[72px] text-right cursor-pointer hover:text-macos-text-primary" onClick={() => handleSort('date')}>
                日期 {sortKey === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </div>
            </div>
            {/* Rows */}
            {sortedItems.map((item, idx) => {
              const hasChildren = item.children && item.children.length > 0;
              const selected = selectedItem?.path === item.path || isSelected(item.path);
              return (
                <div
                  key={item.path}
                  ref={(el) => {
                    if (el) rowRefs.current.set(item.path, el);
                    else rowRefs.current.delete(item.path);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${selected ? 'bg-macos-selection' : 'hover:bg-macos-surface-hover'} ${idx > 0 ? 'border-t border-macos-separator' : ''}`}
                  onClick={() => handleSelect(item)}
                >
                  <div className="w-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected(item.path)}
                      onChange={() => handleCheck(item)}
                      className="rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-macos-text-primary">{item.name}</div>
                    {hasChildren && <div className="text-xs text-macos-text-tertiary">{item.children!.length} 项</div>}
                  </div>
                  <div className="w-[56px] text-right text-xs text-macos-text-secondary">{formatBytes(item.size)}</div>
                  <div className="w-[72px] text-right text-xs text-macos-text-tertiary">{item.modifiedAt ? formatDate(item.modifiedAt) : '-'}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-4 text-macos-text-tertiary">Downloads 目录为空</p>
        )}
      </div>
    </div>
  );
}

export function DownloadsDetail() {
  const { selectedItem, selectedPaths, setScanning, clearSelection, setScanResults, setSelectedItem } = useAppStore();

  async function handleClean() {
    if (selectedPaths.size > 0) {
      const paths = Array.from(selectedPaths);
      await moveToTrash(paths);
      clearSelection();
    } else if (selectedItem) {
      const item = selectedItem as unknown as ScanItem;
      await moveToTrash([item.path]);
      setSelectedItem(null);
    }
    const result = await scanModule('downloads');
    setScanResults({ downloads: result });
    setScanning(false);
  }

  const selectedCount = selectedPaths.size;

  if (!selectedItem && selectedPaths.size === 0) {
    return (
      <div className="flex h-full items-center justify-center text-macos-text-tertiary">
        <p>选择一项以查看详情</p>
      </div>
    );
  }

  if (!selectedItem && selectedPaths.size > 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-macos-separator px-4 py-4">
          <div className="text-lg font-bold">已选 {selectedPaths.size} 项</div>
        </div>
        <div className="flex-1 flex items-center justify-center text-macos-text-tertiary">
          <p>已勾选的文件将批量移至废纸篓</p>
        </div>
        <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span><span className="font-bold">{selectedPaths.size}</span> <span className="text-macos-text-tertiary">项已选</span></span>
          </div>
          <button onClick={handleClean} className="rounded-lg bg-macos-red px-4 py-2 text-sm font-bold hover:bg-macos-red-hover">移至废纸篓</button>
        </div>
      </div>
    );
  }

  const item = selectedItem as unknown as ScanItem;

  // 无子项：显示单文件详情
  if (!item.children || item.children.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-macos-separator px-4 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg macos-icon-indigo flex items-center justify-center text-xl shrink-0">📥</div>
              <div>
                <h2 className="text-lg font-bold">{item.name}</h2>
                <p className="text-xs text-macos-text-tertiary">{item.path}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-bold">{formatBytes(item.size)}</div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-2 text-sm">
            {item.modifiedAt && (
              <div className="flex justify-between"><span className="text-macos-text-secondary">修改时间</span><span>{formatDate(item.modifiedAt)}</span></div>
            )}
          </div>
        </div>
        <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span><span className="font-bold">{selectedCount}</span> <span className="text-macos-text-tertiary">项已选</span></span>
          </div>
          <button onClick={handleClean} className="rounded-lg bg-macos-red px-4 py-2 text-sm font-bold hover:bg-macos-red-hover">
            移至废纸篓
          </button>
        </div>
      </div>
    );
  }

  // 有子项：使用 CollapsibleFileSection 显示文件列表
  const childTotal = item.children.reduce((s, c) => s + (c as unknown as ScanItem).size, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg macos-icon-indigo flex items-center justify-center text-xl shrink-0">📥</div>
            <div>
              <h2 className="text-lg font-bold">{item.name}</h2>
              <p className="text-xs text-macos-text-tertiary">{item.path}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold">{formatBytes(childTotal)}</div>
            <p className="text-xs text-macos-text-tertiary">{item.children.length} 项</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <CollapsibleFileSection
          title="文件列表"
          files={item.children.map(c => ({
            name: (c as unknown as ScanItem).name,
            path: (c as unknown as ScanItem).path,
            size: (c as unknown as ScanItem).size,
            isDir: (c as unknown as ScanItem).type === 'data',
          }))}
          defaultExpanded
        />
      </div>
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span><span className="font-bold">{selectedCount}</span> <span className="text-macos-text-tertiary">项已选</span></span>
        </div>
        <button onClick={handleClean} className="rounded-lg bg-macos-red px-4 py-2 text-sm font-bold hover:bg-macos-red-hover">
          移至废纸篓
        </button>
      </div>
    </div>
  );
}

export default DownloadsList;
