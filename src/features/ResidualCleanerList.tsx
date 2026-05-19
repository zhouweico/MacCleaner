import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore, type SelectedItem } from '@/store';
import { scanResidual, advancedClean } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useRescanListener } from '@/hooks/useKeyboardShortcuts';
import type { AppInfo, CleanAction } from '@/types';
import SelectionSummary from '@/components/SelectionSummary';
import AutoHideScroll from '@/components/AutoHideScroll';
import AiDrawer from '@/components/AiDrawer';

function ResidualCleanerList() {
  const { residuals, setResiduals, selectedItem, setSelectedItem, isSelected, clearSelection, toggleSelection, searchTargetPath } = useAppStore();
  const lastAutoSelectPath = useRef('');
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  const handleScan = useCallback(async () => {
    try {
      const result = await scanResidual();
      setResiduals(result);
    } finally {
      clearSelection();
    }
  }, [setResiduals, clearSelection]);

  useEffect(() => {
    lastAutoSelectPath.current = '';
    if (residuals.length === 0) handleScan();
  }, []);

  useRescanListener('residual-clean', handleScan);

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

  function handleSelect(res: AppInfo, i: number) {
    const key = res.path || `${res.name}-${i}`;
    setSelectedItem({ ...res, path: key } as unknown as SelectedItem);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">🗑️ 残留文件</h2>
          <p className="text-xs text-macos-text-tertiary">{residuals.length} 项</p>
        </div>
      </div>
      <p className="px-4 py-2 text-xs text-macos-text-tertiary">以下文件属于已卸载 APP 的残留</p>
      <AutoHideScroll className="flex-1 px-3 py-3">
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
      </AutoHideScroll>
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
    const items = residuals.filter(r => selectedPaths.has(r.path)).map(r => ({
      name: r.name,
      path: r.path,
      size: r.associatedFiles.reduce((s, f) => s + f.size, 0),
      children: r.associatedFiles.map(f => ({ name: f.path.split('/').pop() ?? f.path, path: f.path, size: f.size })),
    }));

    return (
      <SelectionSummary
        moduleIcon="🗑️"
        items={items}
        onClean={handleClean}
      />
    );
  }

  const residual = residuals.find(r => r.path === selectedItem?.path) as AppInfo | undefined;
  if (!residual) return <p className="text-macos-text-tertiary">选择一项以查看详情</p>;

  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className="relative flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg macos-icon-red flex items-center justify-center text-sm shrink-0">🗑️</div>
            <div>
              <h2 className="text-sm font-bold">{residual.name}</h2>
              <p className="text-xs text-macos-text-tertiary">{residual.path}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold">{formatBytes(residual.size)}</div>
            <p className="text-xs text-macos-text-tertiary">{residual.associatedFiles.length} 个文件</p>
          </div>
        </div>
      </div>
      <AutoHideScroll className="flex-1 px-4 py-3">
        <div className="space-y-1 text-xs">
          {residual.associatedFiles.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-macos-separator">
              <span className="truncate text-macos-text-secondary">{f.path}</span>
              <span className="ml-2 shrink-0 text-macos-text-tertiary">{formatBytes(f.size)}</span>
            </div>
          ))}
        </div>
      </AutoHideScroll>
      {aiOpen && residual.path && <AiDrawer dirPath={residual.path} dirName={residual.name} dirSize={residual.size} onClose={() => setAiOpen(false)} />}
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span><span className="font-bold">{selectedPaths.size}</span> <span className="text-macos-text-tertiary">项已选</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAiOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-macos-surface-hover transition-colors" title="AI 分析">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
          <button onClick={handleClean} className="rounded-lg bg-macos-green px-4 py-2 text-sm font-bold hover:bg-macos-green-hover">
            清理
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResidualCleanerList;
