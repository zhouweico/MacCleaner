import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppStore, type SelectedItem } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useClean } from '@/hooks/useClean';
import { useRescanListener } from '@/hooks/useKeyboardShortcuts';
import type { ScanItem } from '@/types';
import CollapsibleFileSection from '@/components/CollapsibleFileSection';
import SelectionSummary from '@/components/SelectionSummary';
import AutoHideScroll from '@/components/AutoHideScroll';
import AiDrawer from '@/components/AiDrawer';

function CondaList() {
  const { scanResults, setScanning, setScanResults, selectedItem, setSelectedItem, isSelected, toggleSelection, searchTargetPath } = useAppStore();
  const result = scanResults['conda'];
  const lastAutoSelectPath = useRef('');
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  const handleScan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await scanModule('conda');
      setScanResults({ conda: result });
    } finally { setScanning(false); }
  }, [setScanning, setScanResults]);

  useEffect(() => {
    lastAutoSelectPath.current = '';
    handleScan();
  }, []);

  useRescanListener('conda', handleScan);

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
          <h2 className="text-sm font-semibold">🐍 Conda 环境</h2>
          <p className="text-xs text-macos-text-tertiary">{result.items.length} 项 · {formatBytes(result.totalSize)}</p>
        </div>
      </div>
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
                    onClick={(e) => e.stopPropagation()}
                    className="rounded shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg macos-icon-green flex items-center justify-center text-sm shrink-0">🐍</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-macos-text-primary">{item.name}</div>
                    <div className="text-xs text-macos-text-tertiary truncate">{item.path}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs ${item.safeToRemove ? 'text-green-400' : 'text-orange-400'}`}>
                      {item.safeToRemove ? '可安全清理' : '需确认'}
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
      </AutoHideScroll>
    </div>
  );
}

export function CondaDetail() {
  const { selectedItem, selectedPaths, scanResults, setScanning, clearSelection } = useAppStore();
  const result = scanResults['conda'];
  const { doSafeClean } = useClean();
  const [aiOpen, setAiOpen] = useState(false);

  // 切换选中项时关闭抽屉
  useEffect(() => { setAiOpen(false); }, [selectedItem?.path]);

  async function handleClean() {
    if (!result || selectedPaths.size === 0) return;
    setScanning(true);
    try { await doSafeClean('conda'); }
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
    const items = result!.items
      .filter(i => selectedPaths.has(i.path))
      .map(i => ({ name: i.name, path: i.path, size: i.size, children: (i as any).children }));
    return (
      <SelectionSummary
        moduleIcon="🐍"
        items={items}
        onClean={handleClean}
      />
    );
  }

  const item = selectedItem as unknown as ScanItem;

  return (
    <div className="relative flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg macos-icon-green flex items-center justify-center text-sm shrink-0">🐍</div>
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
      {aiOpen && (
        <>
          <button
            onClick={() => setAiOpen(false)}
            className="absolute right-4 top-3 z-50 flex h-8 w-8 items-center justify-center rounded-lg text-macos-text-tertiary hover:bg-white/5 transition-colors"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <AiDrawer dirPath={item.path} dirName={item.name} dirSize={item.size} />
        </>
      )}
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span><span className="font-bold">{selectedPaths.size}</span> <span className="text-macos-text-tertiary">项已选</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAiOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5 transition-colors" title="AI 分析">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
          <button onClick={handleClean} className="rounded-lg bg-macos-green px-4 py-2 text-sm font-bold hover:bg-macos-green-hover">清理</button>
        </div>
      </div>
    </div>
  );
}

export default CondaList;
