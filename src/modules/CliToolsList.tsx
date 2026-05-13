import { useEffect } from 'react';
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

function CliToolsList() {
  const { scanResults, setScanning, setScanResults, selectedPaths, setSelectedItem, clearSelection, isSelected, toggleSelection } = useAppStore();
  const result = scanResults['cli-tools'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try {
      const result = await scanModule('cli-tools');
      setScanResults({ 'cli-tools': result });
    } finally { setScanning(false); }
  }

  async function handleClean() {
    if (selectedPaths.size === 0) return;
    const paths = Array.from(selectedPaths);
    await moveToTrash(paths);
    clearSelection();
    await handleScan();
  }

  function selectAll() {
    if (!result) return;
    clearSelection();
    result.items.forEach(item => toggleSelection(item.path));
  }

  function deselectAll() {
    clearSelection();
  }

  if (!result) return <p className="p-4 text-gray-500">加载中...</p>;

  const selectedCount = result.items.filter(i => isSelected(i.path)).length;
  const selectedSize = result.items.filter(i => isSelected(i.path)).reduce((s, i) => s + i.size, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">🛠️ CLI 工具</h2>
          <p className="text-xs text-gray-500">{result.items.length} 项 · {formatBytes(result.totalSize)}</p>
        </div>
        <div className="flex gap-1.5">
          {selectedCount > 0 ? (
            <>
              <button onClick={deselectAll} className="rounded bg-gray-600 px-2 py-1 text-xs font-medium hover:bg-gray-500">取消选择</button>
              <button onClick={handleClean} className="rounded bg-red-600 px-2 py-1 text-xs font-medium hover:bg-red-700">移至废纸篓 ({selectedPaths.size})</button>
            </>
          ) : (
            <>
              {result.items.length > 0 && (
                <button onClick={selectAll} className="rounded bg-gray-600 px-2 py-1 text-xs font-medium hover:bg-gray-500">全选</button>
              )}
              <button onClick={handleScan} className="rounded bg-blue-600 px-2 py-1 text-xs font-medium hover:bg-blue-700">重新扫描</button>
            </>
          )}
        </div>
      </div>
      <p className="px-4 py-2 text-xs text-gray-500">选中工具将移至废纸篓（非永久删除）</p>
      <div className="flex-1 overflow-y-auto">
        {result.items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-800/50 ${isSelected(item.path) ? 'bg-blue-600/10' : 'hover:bg-gray-800/50'}`}
            onClick={() => setSelectedItem(item as unknown as SelectedItem)}
          >
            <input
              type="checkbox"
              checked={isSelected(item.path)}
              onChange={() => toggleSelection(item.path)}
              onClick={e => e.stopPropagation()}
              className="rounded shrink-0"
            />
            <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-sm shrink-0">🛠️</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{item.name}</div>
              <div className="text-xs text-gray-500 truncate">{item.path}</div>
            </div>
            <div className="text-sm font-medium shrink-0 ml-2">{formatBytes(item.size)}</div>
          </div>
        ))}
        {result.items.length === 0 && <p className="p-4 text-gray-500">没有检测到 CLI 工具数据</p>}
      </div>

      {selectedCount > 0 && (
        <div className="border-t border-gray-700 px-4 py-2.5 bg-gray-850 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span><span className="font-bold">{formatBytes(selectedSize)}</span> <span className="text-gray-500">所选</span></span>
            <span><span className="font-bold">{selectedPaths.size}</span> <span className="text-gray-500">个项目所选</span></span>
          </div>
          <button onClick={handleClean} className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold hover:bg-red-700">
            移至废纸篓
          </button>
        </div>
      )}
    </div>
  );
}

export function CliToolsDetail() {
  const { selectedItem } = useAppStore();
  if (!selectedItem) return <p className="text-gray-500">选择一项以查看详情</p>;
  const item = selectedItem as unknown as ScanItem;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-700 px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-xl shrink-0">🛠️</div>
            <div>
              <h2 className="text-lg font-bold">{item.name}</h2>
              <p className="text-xs text-gray-500">{item.path}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold">{formatBytes(item.size)}</div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">安全清理</span><span className={item.safeToRemove ? 'text-green-400' : 'text-orange-400'}>{item.safeToRemove ? '是' : '否'}</span></div>
        </div>
      </div>
      <div className="border-t border-gray-700 px-4 py-3 bg-gray-850 flex justify-end">
        <button onClick={() => {}} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-700">
          移至废纸篓
        </button>
      </div>
    </div>
  );
}

export default CliToolsList;
