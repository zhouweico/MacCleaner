import { useEffect, useRef } from 'react';
import { useAppStore, type SelectedItem } from '@/store';
import { scanResidual, advancedClean } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import type { AppInfo, CleanAction } from '@/types';

function ResidualCleanerList() {
  const { residuals, setResiduals, selectedItem, setSelectedItem, isSelected, clearSelection, toggleSelection, searchTargetPath } = useAppStore();
  const lastAutoSelectPath = useRef('');
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    lastAutoSelectPath.current = '';
    if (residuals.length === 0) handleScan();
  }, []);

  // Auto-select from search navigation + scroll into view
  useEffect(() => {
    if (!searchTargetPath || searchTargetPath === lastAutoSelectPath.current) return;
    const idx = residuals.findIndex(r => r.path === searchTargetPath);
    const res = idx !== -1 ? residuals[idx] : null;
    if (res) {
      const key = res.path || `${res.name}-${idx}`;
      setSelectedItem({ ...res, path: key } as unknown as SelectedItem);
      lastAutoSelectPath.current = searchTargetPath;
      // Scroll to selected row
      requestAnimationFrame(() => {
        const el = rowRefs.current.get(key);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [searchTargetPath, residuals]);

  async function handleScan() {
    try {
      const result = await scanResidual();
      setResiduals(result);
    } finally {
      clearSelection();
    }
  }

  function handleSelect(res: AppInfo, i: number) {
    const key = res.path || `${res.name}-${i}`;
    setSelectedItem({ ...res, path: key } as unknown as SelectedItem);
  }

  function selectAll() {
    clearSelection();
    residuals.forEach(r => toggleSelection(r.path));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-macos-separator px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">🗑️ 残留文件</h2>
          <p className="text-xs text-macos-text-tertiary">{residuals.length} 项</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={selectAll} className="rounded bg-macos-surface px-2 py-1 text-xs font-medium hover:bg-macos-surface-hover">全选</button>
        </div>
      </div>
      <p className="px-4 py-2 text-xs text-macos-text-tertiary">以下文件属于已卸载 APP 的残留</p>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {residuals.length > 0 ? (
          <div className="bg-macos-surface/50 rounded-xl overflow-hidden">
            {residuals.map((res, i) => {
              const resKey = res.path || `${res.name}-${i}`;
              const selected = selectedItem?.path === resKey || isSelected(resKey);
              return (
                <div
                  key={resKey}
                  ref={(el) => {
                    if (el) rowRefs.current.set(resKey, el);
                    else rowRefs.current.delete(resKey);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${selected ? 'bg-macos-surface-hover' : 'hover:bg-macos-surface-hover'} ${i > 0 ? 'border-t border-macos-separator' : ''}`}
                  onClick={() => handleSelect(res, i)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected(resKey)}
                    onChange={() => toggleSelection(resKey)}
                    onClick={e => e.stopPropagation()}
                    className="rounded shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg macos-icon-red flex items-center justify-center text-sm shrink-0">🗑️</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-macos-text-primary">{res.name}</div>
                    <div className="text-xs text-macos-text-tertiary truncate">{res.path}</div>
                  </div>
                  <div className="text-xs text-macos-text-secondary shrink-0">{formatBytes(res.size)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-4 text-macos-text-tertiary">没有检测到残留文件</p>
        )}
      </div>
    </div>
  );
}

export function ResidualCleanerDetail() {
  const { selectedItem, residuals, selectedPaths, setScanning, clearSelection } = useAppStore();

  async function handleClean() {
    if (selectedPaths.size === 0) return;
    const actions: CleanAction[] = residuals
      .filter(r => selectedPaths.has(r.path))
      .flatMap(r => r.associatedFiles.map(f => ({ path: f.path, size: f.size, description: f.path })));
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
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-macos-separator px-4 py-4">
          <div className="text-lg font-bold">已选 {selectedPaths.size} 项</div>
        </div>
        <div className="flex-1 flex items-center justify-center text-macos-text-tertiary">
          <p>已勾选的残留文件将批量清理</p>
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

  const residual = residuals.find(r => r.path === selectedItem?.path) as AppInfo | undefined;
  if (!residual) return <p className="text-macos-text-tertiary">选择一项以查看详情</p>;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg macos-icon-red flex items-center justify-center text-xl shrink-0">🗑️</div>
            <div>
              <h2 className="text-lg font-bold">{residual.name}</h2>
              <p className="text-xs text-macos-text-tertiary">{residual.path}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold">{formatBytes(residual.size)}</div>
            <p className="text-xs text-macos-text-tertiary">{residual.associatedFiles.length} 个文件</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-1 text-xs">
          {residual.associatedFiles.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-macos-separator">
              <span className="truncate text-macos-text-secondary">{f.path}</span>
              <span className="ml-2 shrink-0 text-macos-text-tertiary">{formatBytes(f.size)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span><span className="font-bold">{selectedPaths.size}</span> <span className="text-macos-text-tertiary">项已选</span></span>
        </div>
        <button onClick={handleClean} className="rounded-lg bg-macos-green px-4 py-2 text-sm font-bold hover:bg-macos-green-hover">
          清理
        </button>
      </div>
    </div>
  );
}

export default ResidualCleanerList;
