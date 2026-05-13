import { useEffect } from 'react';
import { useAppStore, type SelectedItem } from '@/store';
import { scanResidual, advancedClean } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import type { AppInfo, CleanAction } from '@/types';

function ResidualCleanerList() {
  const { residuals, setResiduals, selectedPaths, setSelectedItem, clearSelection, isSelected, toggleSelection } = useAppStore();

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    try {
      const result = await scanResidual();
      setResiduals(result);
    } finally {
      clearSelection();
    }
  }

  async function handleClean() {
    const actions: CleanAction[] = residuals
      .filter(r => selectedPaths.has(r.path))
      .flatMap(r => r.associatedFiles.map(f => ({ path: f.path, size: f.size, description: f.path })));

    if (actions.length === 0) return;

    await advancedClean('system-cache', actions);
    await handleScan();
  }

  function handleSelect(res: AppInfo) {
    setSelectedItem(res as unknown as SelectedItem);
  }

  function selectAll() {
    clearSelection();
    residuals.forEach(r => toggleSelection(r.path));
  }

  function deselectAll() {
    clearSelection();
  }

  const selectedCount = residuals.filter(r => isSelected(r.path)).length;
  const selectedSize = residuals.filter(r => isSelected(r.path)).reduce((s, r) => s + r.size, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">🗑️ APP 残留清理</h2>
          <p className="text-xs text-gray-500">{residuals.length} 项</p>
        </div>
        <div className="flex gap-1.5">
          {selectedCount > 0 ? (
            <>
              <button onClick={deselectAll} className="rounded bg-gray-600 px-2 py-1 text-xs font-medium hover:bg-gray-500">取消选择</button>
              <button onClick={handleClean} className="rounded bg-green-600 px-2 py-1 text-xs font-medium hover:bg-green-700">清理 ({selectedPaths.size})</button>
            </>
          ) : (
            <button onClick={selectAll} className="rounded bg-gray-600 px-2 py-1 text-xs font-medium hover:bg-gray-500">全选</button>
          )}
        </div>
      </div>
      <p className="px-4 py-2 text-xs text-gray-500">以下文件属于已卸载 APP 的残留</p>
      <div className="flex-1 overflow-y-auto">
        {residuals.map((res, i) => {
          const resKey = res.path || `${res.name}-${i}`;
          return (
          <div
            key={resKey}
            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-800/50 ${isSelected(resKey) ? 'bg-blue-600/10' : 'hover:bg-gray-800/50'}`}
            onClick={() => handleSelect(res)}
          >
            <input
              type="checkbox"
              checked={isSelected(resKey)}
              onChange={() => toggleSelection(resKey)}
              onClick={e => e.stopPropagation()}
              className="rounded shrink-0"
            />
            <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-sm shrink-0">🗑️</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{res.name}</div>
              <div className="text-xs text-gray-500 truncate">{res.path}</div>
            </div>
            <div className="text-sm font-medium shrink-0 ml-2">{formatBytes(res.size)}</div>
          </div>
        );
        })}
        {residuals.length === 0 && <p className="p-4 text-gray-500">没有检测到残留文件</p>}
      </div>

      {selectedCount > 0 && (
        <div className="border-t border-gray-700 px-4 py-2.5 bg-gray-850 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span><span className="font-bold">{formatBytes(selectedSize)}</span> <span className="text-gray-500">所选</span></span>
            <span><span className="font-bold">{selectedPaths.size}</span> <span className="text-gray-500">个项目所选</span></span>
          </div>
          <button onClick={handleClean} className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-bold hover:bg-green-700">
            清理
          </button>
        </div>
      )}
    </div>
  );
}

export function ResidualCleanerDetail() {
  const { selectedItem, residuals } = useAppStore();
  if (!selectedItem) return <p className="text-gray-500">选择一项以查看详情</p>;

  const residual = residuals.find(r => r.path === selectedItem.path) as AppInfo | undefined;
  if (!residual) return <p className="text-gray-500">选择一项以查看详情</p>;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-700 px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-xl shrink-0">🗑️</div>
            <div>
              <h2 className="text-lg font-bold">{residual.name}</h2>
              <p className="text-xs text-gray-500">{residual.path}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold">{formatBytes(residual.size)}</div>
            <p className="text-xs text-gray-500">{residual.associatedFiles.length} 个文件</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-1 text-xs">
          {residual.associatedFiles.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800/50">
              <span className="truncate text-gray-400">{f.path}</span>
              <span className="ml-2 shrink-0 text-gray-500">{formatBytes(f.size)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-gray-700 px-4 py-3 bg-gray-850 flex justify-end">
        <button onClick={() => {}} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold hover:bg-green-700">
          清理残留
        </button>
      </div>
    </div>
  );
}

export default ResidualCleanerList;
