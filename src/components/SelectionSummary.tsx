import { useAppStore } from '@/store';
import { formatBytes } from '@/lib/format';
import { showItemInFolder } from '@/lib/ipc';
import { useState } from 'react';
import FinderIcon from '@/components/FinderIcon';
import AutoHideScroll from '@/components/AutoHideScroll';

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

export default function SelectionSummary({ moduleIcon, items, onClean, cleanLabel = '清理' }: Omit<SelectionSummaryProps, 'moduleName'>) {
  const { clearSelection } = useAppStore();
  const totalSize = items.reduce((s, i) => s + (i.size ?? 0), 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-macos-separator px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg macos-icon-green flex items-center justify-center text-sm shrink-0">{moduleIcon}</div>
          <div>
            <div className="text-sm font-bold">已选 {items.length} 项</div>
            <div className="text-xs text-macos-text-tertiary">{formatBytes(totalSize)}</div>
          </div>
        </div>
      </div>

      {/* Card list */}
      <AutoHideScroll className="flex-1 px-4 py-3">
        {items.map((item) => (
          <SelectionCard key={item.path} item={item} />
        ))}
      </AutoHideScroll>
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
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

function SelectionCard({ item }: { item: SelectionItem }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { isSelected } = useAppStore();
  const checked = isSelected(item.path);
  const children = item.children ?? [];
  const childSize = children.reduce((s, c) => s + c.size, 0);
  const hasChildren = children.length > 0;

  // 单文件：平铺行
  if (!hasChildren) {
    return (
      <div
        className={`flex items-center justify-between px-3 py-2.5 mb-1 rounded-lg hover:bg-macos-surface-hover ${checked ? 'bg-macos-surface-hover' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{item.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={() => showItemInFolder(item.path)}
            className="shrink-0 p-0 rounded hover:bg-macos-surface-hover"
            style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}
            title="在访达中打开"
          >
            <FinderIcon />
          </button>
          <span className="text-xs text-macos-text-tertiary">{formatBytes(item.size ?? 0)}</span>
        </div>
      </div>
    );
  }

  // 文件夹/多文件：可展开卡片
  return (
    <div
      className="border border-macos-separator rounded-lg mb-2 overflow-hidden bg-macos-surface/50"
    >
      <div
        className={`flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-macos-surface-hover ${checked ? 'bg-macos-surface-hover' : ''}`}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl text-macos-text-tertiary shrink-0">{expanded ? '▾' : '▸'}</span>
          <span className="text-sm font-medium truncate">{item.name}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <button
            onClick={(e) => { e.stopPropagation(); showItemInFolder(item.path); }}
            className="shrink-0 p-0 rounded hover:bg-macos-surface-hover"
            style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}
            title="在访达中打开"
          >
            <FinderIcon />
          </button>
          <span className="text-xs text-macos-text-tertiary">{children.length} 项 · {formatBytes(item.size ?? childSize)}</span>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-macos-separator">
          {children.map((c) => (
            <FileRow key={c.path} file={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({ file }: { file: { name: string; path: string; size: number; isDir?: boolean } }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs cursor-default hover:bg-macos-surface-hover/50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="text-macos-text-tertiary shrink-0">{file.isDir ? '📁' : '📄'}</span>
      <span className="text-macos-text-primary truncate flex-1 min-w-0">{file.path}</span>
      <button
        onClick={() => showItemInFolder(file.path)}
        className="shrink-0 p-0 rounded hover:bg-macos-surface-hover"
        style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}
        title="在访达中打开"
      >
        <FinderIcon className="w-3.5 h-3.5" />
      </button>
      <span className="text-macos-text-tertiary shrink-0 ml-2">{formatBytes(file.size)}</span>
    </div>
  );
}
