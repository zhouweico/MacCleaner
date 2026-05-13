import { useEffect } from 'react';
import { useAppStore, type SelectedItem } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useClean } from '@/hooks/useClean';
import type { ScanItem } from '@/types';

function NpmList() {
  const { scanResults, setScanning, setScanResults, selectedItem, setSelectedItem, toggleSelection } = useAppStore();
  const { doSafeClean } = useClean();
  const result = scanResults['npm'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try {
      const result = await scanModule('npm');
      setScanResults({ npm: result });
    } finally { setScanning(false); }
  }

  async function handleClean() {
    setScanning(true);
    try { await doSafeClean('npm'); }
    finally { setScanning(false); }
  }

  function handleSelect(item: ScanItem) {
    setSelectedItem(item as unknown as SelectedItem);
  }

  if (!result) return <p className="p-4 text-macos-text-tertiary">加载中...</p>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-macos-separator px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">📦 npm / Node.js</h2>
          <p className="text-xs text-macos-text-tertiary">{result.items.length} 项 · {formatBytes(result.totalSize)}</p>
        </div>
        <button onClick={handleClean} className="rounded bg-macos-green px-2.5 py-1.5 text-xs font-medium hover:bg-macos-green">清理 npm 缓存</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {result.items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-macos-separator ${selectedItem?.path === item.path ? 'bg-macos-accent/20' : 'hover:bg-macos-surface-hover'}`}
            onClick={() => handleSelect(item)}
          >
            <input
              type="checkbox"
              checked={isSelected(item.path)}
              onChange={() => toggleSelection(item.path)}
              onClick={(e) => e.stopPropagation()}
              className="rounded shrink-0"
            />
            <div className="w-8 h-8 rounded bg-macos-surface flex items-center justify-center text-sm shrink-0">📦</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{item.name}</div>
              <div className="text-xs text-macos-text-tertiary truncate">{item.description ?? item.path}</div>
            </div>
            <div className="flex flex-col items-end shrink-0 ml-2">
              <span className="text-sm font-medium">{formatBytes(item.size)}</span>
              <span className={`text-xs ${item.safeToRemove ? 'text-green-400' : 'text-orange-400'}`}>
                {item.safeToRemove ? '可安全清理' : '需确认'}
              </span>
            </div>
          </div>
        ))}
        {result.items.length === 0 && <p className="p-4 text-macos-text-tertiary">没有可清理项</p>}
      </div>
    </div>
  );
}

export function NpmDetail() {
  const { selectedItem } = useAppStore();
  if (!selectedItem) return <p className="text-macos-text-tertiary">选择一项以查看详情</p>;
  const item = selectedItem as unknown as ScanItem;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-macos-surface flex items-center justify-center text-xl shrink-0">📦</div>
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
          {item.description && (
            <div className="flex justify-between"><span className="text-macos-text-secondary">描述</span><span className="text-right">{item.description}</span></div>
          )}
          <div className="flex justify-between"><span className="text-macos-text-secondary">安全清理</span><span className={item.safeToRemove ? 'text-green-400' : 'text-orange-400'}>{item.safeToRemove ? '是' : '否'}</span></div>
        </div>
      </div>
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content flex justify-end">
        <button onClick={() => {}} className="rounded-lg bg-macos-green px-4 py-2 text-sm font-bold hover:bg-macos-green">
          清理 npm 缓存
        </button>
      </div>
    </div>
  );
}

export default NpmList;
