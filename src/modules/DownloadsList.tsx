import { useEffect, useState } from 'react';
import { useAppStore, type SelectedItem } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import type { ScanItem } from '@/types';

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

function getFileIcon(name: string, type?: string): string {
  if (type === 'data') return '📁';
  const ext = name.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    dmg: '📦', zip: '📦', tar: '📦', gz: '📦',
    pdf: '📄', doc: '📄', docx: '📄',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', mp4: '🎬', mov: '🎬',
  };
  return types[ext ?? ''] ?? '📄';
}

function DownloadsList() {
  const { scanResults, setScanning, setScanResults, selectedItem, selectedPaths, selectItem, isSelected, clearSelection, toggleSelection } = useAppStore();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const result = scanResults['downloads'];

  useEffect(() => { handleScan(); }, []);

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

  function deselectAll() {
    clearSelection();
  }

  async function handleClean() {
    if (selectedPaths.size === 0) return;
    const paths = Array.from(selectedPaths);
    await moveToTrash(paths);
    clearSelection();
    await handleScan();
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
  const selectedSize = sortedItems.filter(i => isSelected(i.path)).reduce((s, i) => s + i.size, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-macos-separator px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">📥 Downloads</h2>
          <p className="text-xs text-macos-text-tertiary">{result.items.length} 项 · {formatBytes(result.totalSize)}</p>
        </div>
        <div className="flex gap-1.5">
          {selectedCount > 0 ? (
            <>
              <button onClick={deselectAll} className="rounded bg-macos-surface px-2 py-1 text-xs font-medium hover:bg-macos-surface-hover">取消选择</button>
              <button onClick={handleClean} className="rounded bg-macos-green px-2 py-1 text-xs font-medium hover:bg-macos-green">移至废纸篓 ({selectedPaths.size})</button>
            </>
          ) : (
            <>
              {result.items.length > 0 && (
                <button onClick={selectAll} className="rounded bg-macos-surface px-2 py-1 text-xs font-medium hover:bg-macos-surface-hover">全选</button>
              )}
              <button onClick={handleScan} className="rounded bg-macos-accent px-2 py-1 text-xs font-medium hover:bg-macos-accent-hover">重新扫描</button>
            </>
          )}
        </div>
      </div>

      <table className="w-full table-fixed text-xs">
        <thead>
          <tr className="border-b border-macos-separator text-macos-text-tertiary">
            <th className="w-8 p-2">
              <input
                type="checkbox"
                checked={selectedCount > 0 && sortedItems.every(i => isSelected(i.path))}
                onChange={() => (selectedCount > 0 ? deselectAll() : selectAll())}
                className="rounded"
              />
            </th>
            <th className="w-10 pb-2 text-left font-medium">类型</th>
            <th className="pb-2 text-left font-medium cursor-pointer hover:text-macos-text-primary" onClick={() => handleSort('name')}>
              名称 {sortKey === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th className="w-20 pb-2 text-right font-medium cursor-pointer hover:text-macos-text-primary" onClick={() => handleSort('size')}>
              大小 {sortKey === 'size' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th className="w-28 pb-2 text-right font-medium cursor-pointer hover:text-macos-text-primary" onClick={() => handleSort('date')}>
              日期 {sortKey === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            return (
              <tr
                key={item.path}
                className={`cursor-pointer border-b border-macos-separator ${(selectedItem?.path === item.path || isSelected(item.path)) ? 'bg-macos-accent/20' : 'hover:bg-macos-surface-hover'}`}
                onClick={() => handleSelect(item)}
              >
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected(item.path)}
                    onChange={() => handleCheck(item)}
                    className="rounded"
                  />
                </td>
                <td className="p-2 text-center text-sm">{getFileIcon(item.name, item.type)}</td>
                <td className="p-2 truncate">
                  <div className="font-medium truncate">{item.name}</div>
                  {hasChildren && <div className="text-xs text-macos-text-tertiary">{item.children!.length} 项</div>}
                </td>
                <td className="p-2 text-right font-medium">{formatBytes(item.size)}</td>
                <td className="p-2 text-right text-macos-text-tertiary">{item.modifiedAt ? formatDate(item.modifiedAt) : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {result.items.length === 0 && <p className="p-4 text-macos-text-tertiary">Downloads 目录为空</p>}

      {/* Bottom bar */}
      {selectedCount > 0 && (
        <div className="border-t border-macos-separator px-4 py-2.5 bg-macos-content flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span><span className="font-bold">{formatBytes(selectedSize)}</span> <span className="text-macos-text-tertiary">所选</span></span>
            <span><span className="font-bold">{selectedPaths.size}</span> <span className="text-macos-text-tertiary">个项目所选</span></span>
          </div>
          <button onClick={handleClean} className="rounded-lg bg-macos-green px-4 py-1.5 text-xs font-bold hover:bg-macos-green">
            移至废纸篓
          </button>
        </div>
      )}
    </div>
  );
}

export function DownloadsDetail() {
  const { selectedItem } = useAppStore();

  if (!selectedItem) return <p className="text-macos-text-tertiary">选择一项以查看详情</p>;

  const item = selectedItem as unknown as ScanItem;
  if (!item.children || item.children.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-macos-surface flex items-center justify-center text-xl">{getFileIcon(item.name, item.type)}</div>
          <div>
            <h2 className="text-lg font-bold">{item.name}</h2>
            <p className="text-xs text-macos-text-tertiary">{item.path}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-macos-text-secondary">大小</span><span className="font-bold">{formatBytes(item.size)}</span></div>
          {item.modifiedAt && <div className="flex justify-between"><span className="text-macos-text-secondary">修改时间</span><span>{formatDate(item.modifiedAt)}</span></div>}
        </div>
      </div>
    );
  }

  const childTotal = item.children.reduce((s, c) => s + (c as unknown as ScanItem).size, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-macos-surface flex items-center justify-center text-xl">📁</div>
          <div>
            <h2 className="text-lg font-bold">{item.name}</h2>
            <p className="text-xs text-macos-text-tertiary">{item.path}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-macos-text-tertiary">
          <span>{item.children.length} 项</span>
          <span>{formatBytes(childTotal)}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full table-fixed text-xs">
          <thead>
            <tr className="border-b border-macos-separator text-macos-text-tertiary">
              <th className="pb-2 text-left pl-4 font-medium">名称</th>
              <th className="w-24 pb-2 text-right font-medium">大小</th>
              <th className="w-28 pb-2 text-right font-medium">日期</th>
            </tr>
          </thead>
          <tbody>
            {item.children.map((child, i) => {
              const c = child as unknown as ScanItem;
              return (
                <tr key={i} className="border-b border-macos-separator hover:bg-macos-surface-hover">
                  <td className="p-2 pl-4 truncate">
                    <span className="mr-2">{getFileIcon(c.name, c.type)}</span>
                    <span className="truncate">{c.name}</span>
                  </td>
                  <td className="p-2 text-right text-macos-text-secondary">{formatBytes(c.size)}</td>
                  <td className="p-2 text-right text-macos-text-tertiary">{c.modifiedAt ? formatDate(c.modifiedAt) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DownloadsList;
