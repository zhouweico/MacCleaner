import { useAppStore } from '@/store';
import { formatBytes } from '@/lib/format';

interface SelectionSummaryProps {
  moduleName: string;
  moduleIcon: string;
  items: SelectionItem[];
  onClean: () => void;
  cleanLabel?: string;
}

export interface SelectionItem {
  name: string;
  path: string;
  size?: number;
  children?: { name: string; path: string; size: number; isDir?: boolean }[];
}

export default function SelectionSummary({ moduleName, moduleIcon, items, onClean, cleanLabel = '清理' }: SelectionSummaryProps) {
  const { selectedPaths, clearSelection } = useAppStore();
  const totalSize = items.reduce((s, i) => s + (i.size ?? 0), 0);
  const totalItems = items.length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-macos-separator px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg macos-icon-green flex items-center justify-center text-sm shrink-0">{moduleIcon}</div>
          <div>
            <div className="text-sm font-bold">{moduleName}</div>
            <div className="text-xs text-macos-text-tertiary">{totalItems} 项 · {formatBytes(totalSize)}</div>
          </div>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="bg-macos-surface/50 rounded-xl overflow-hidden">
          {items.map((item) => (
            <SelectionItemRow key={item.path} item={item} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span><span className="font-bold">{selectedPaths.size}</span> <span className="text-macos-text-tertiary">项已选</span></span>
          <span><span className="font-bold">{formatBytes(totalSize)}</span> <span className="text-macos-text-tertiary">总计</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearSelection} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-macos-surface-hover">取消选择</button>
          <button onClick={onClean} className="rounded-lg bg-macos-green px-4 py-2 text-sm font-bold hover:bg-macos-green-hover">{cleanLabel}</button>
        </div>
      </div>
    </div>
  );
}

function SelectionItemRow({ item }: { item: SelectionItem }) {
  const { isSelected, toggleSelection } = useAppStore();
  const checked = isSelected(item.path);

  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 ${checked ? 'bg-macos-surface-hover' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => toggleSelection(item.path)}
        className="rounded shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate text-macos-text-primary">{item.name}</div>
        <div className="text-xs text-macos-text-tertiary truncate">{item.path}</div>
        {item.children && item.children.length > 0 && (
          <div className="mt-1.5 ml-1 space-y-0.5">
            {item.children.slice(0, 5).map((c) => (
              <div key={c.path} className="flex items-center gap-2 text-xs text-macos-text-secondary">
                <span className="text-macos-text-tertiary">└</span>
                <span className="truncate">{c.name}</span>
                <span className="shrink-0 ml-auto">{formatBytes(c.size)}</span>
              </div>
            ))}
            {item.children.length > 5 && (
              <div className="text-xs text-macos-text-tertiary">+{item.children.length - 5} 更多</div>
            )}
          </div>
        )}
      </div>
      {item.size != null && (
        <div className="shrink-0 text-xs text-macos-text-secondary">{formatBytes(item.size)}</div>
      )}
    </div>
  );
}
