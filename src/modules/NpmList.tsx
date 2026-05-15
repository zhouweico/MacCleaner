import { useEffect, useRef } from 'react';
import { useAppStore, type SelectedItem } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useClean } from '@/hooks/useClean';
import type { ScanItem } from '@/types';
import CollapsibleFileSection from '@/components/CollapsibleFileSection';

function NpmList() {
  const { scanResults, setScanning, setScanResults, selectedItem, setSelectedItem, isSelected, toggleSelection, searchTargetPath } = useAppStore();
  const result = scanResults['npm'];
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
      setSelectedItem(item as unknown as SelectedItem);
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
      const result = await scanModule('npm');
      setScanResults({ npm: result });
    } finally { setScanning(false); }
  }

  function handleSelect(item: ScanItem) {
    setSelectedItem(item as unknown as SelectedItem);
  }

  if (!result) return <p className="p-4 text-macos-text-tertiary">加载中...</p>;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">📦 npm 缓存</h2>
          <p className="text-xs text-macos-text-tertiary">{result.items.length} 项 · {formatBytes(result.totalSize)}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
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
                    onClick={(e) => e.stopPropagation()}
                    className="rounded shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg macos-icon-red flex items-center justify-center text-sm shrink-0">📦</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-macos-text-primary">{item.name}</div>
                    <div className="text-xs text-macos-text-tertiary truncate">{item.description ?? item.path}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${item.safeToRemove ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {item.safeToRemove ? '可清理' : '需确认'}
                    </span>
                    <span className="text-xs text-macos-text-secondary">{formatBytes(item.size)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-4 text-macos-text-tertiary">没有可清理项</p>
        )}
      </div>
    </div>
  );
}

export function NpmDetail() {
  const { selectedItem, selectedPaths, setScanning, clearSelection } = useAppStore();
  const { doSafeClean } = useClean();

  async function handleClean() {
    if (selectedPaths.size === 0) return;
    setScanning(true);
    try { await doSafeClean('npm'); }
    finally { setScanning(false); clearSelection(); }
  }

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
          <p>已勾选的项目将批量清理</p>
        </div>
        <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span><span className="font-bold">{selectedPaths.size}</span> <span className="text-macos-text-tertiary">项已选</span></span>
          </div>
          <button onClick={handleClean} className="rounded-lg bg-macos-green px-4 py-2 text-sm font-bold hover:bg-macos-green-hover">清理</button>
        </div>
      </div>
    );
  }

  const item = selectedItem as unknown as ScanItem;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg macos-icon-red flex items-center justify-center text-xl shrink-0"></div>
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
        <CollapsibleFileSection
          title="文件列表"
          files={item.children?.map(c => ({ name: (c as unknown as ScanItem).name, path: (c as unknown as ScanItem).path, size: (c as unknown as ScanItem).size, isDir: (c as unknown as ScanItem).type === 'data' })) ?? []}
          defaultExpanded
        />
        {!item.children?.length && (
          <div className="space-y-2 text-sm">
            {item.description && (
              <div className="flex justify-between"><span className="text-macos-text-secondary">描述</span><span className="text-right">{item.description}</span></div>
            )}
            <div className="flex justify-between"><span className="text-macos-text-secondary">安全清理</span><span className={item.safeToRemove ? 'text-green-400' : 'text-orange-400'}>{item.safeToRemove ? '是' : '否'}</span></div>
          </div>
        )}
      </div>
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span><span className="font-bold">{selectedPaths.size}</span> <span className="text-macos-text-tertiary">项已选</span></span>
        </div>
        <button onClick={handleClean} className="rounded-lg bg-macos-green px-4 py-2 text-sm font-bold hover:bg-macos-green-hover">清理</button>
      </div>
    </div>
  );
}

export default NpmList;
