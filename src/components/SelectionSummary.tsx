import { useAppStore } from '@/store';
import { formatBytes } from '@/lib/format';
import { showItemInFolder } from '@/lib/ipc';
import { useState } from 'react';

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
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {items.map((item) => (
          <SelectionCard key={item.path} item={item} />
        ))}
      </div>

      {/* Footer */}
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
            <svg className="w-4 h-4" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M180.544 196.992l389.44 0c0 0 63.488 1.984 64.64 57.728 1.152 56.384-64.64 56.512-64.64 56.512L360.576 311.232c0 0-49.6-7.552-69.44 44.48C283.456 375.872 217.664 559.488 192.064 640c-7.232 22.72 10.048 28.864 24.128 29.248 14.72 0.512 27.968 0.256 40.192 0 16.384-0.128 30.272-6.4 37.888-29.248 16.384-49.728 69.696-182.4 76.608-199.872C388.736 395.008 412.16 399.616 438.016 399.616c47.168 0 491.712 0 491.712 0 61.12 0 84.032 33.024 66.304 83.968L921.6 849.344C902.592 908.032 845.44 960 784.32 960L182.656 960C118.912 960 64 905.6 64 844.48l0-534.4C64 249.024 119.488 196.992 180.544 196.992z" fill="currentColor" />
            </svg>
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-macos-surface-hover ${checked ? 'bg-macos-surface-hover' : ''}`}
        onClick={() => setExpanded(!expanded)}
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
            <svg className="w-4 h-4" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M180.544 196.992l389.44 0c0 0 63.488 1.984 64.64 57.728 1.152 56.384-64.64 56.512-64.64 56.512L360.576 311.232c0 0-49.6-7.552-69.44 44.48C283.456 375.872 217.664 559.488 192.064 640c-7.232 22.72 10.048 28.864 24.128 29.248 14.72 0.512 27.968 0.256 40.192 0 16.384-0.128 30.272-6.4 37.888-29.248 16.384-49.728 69.696-182.4 76.608-199.872C388.736 395.008 412.16 399.616 438.016 399.616c47.168 0 491.712 0 491.712 0 61.12 0 84.032 33.024 66.304 83.968L921.6 849.344C902.592 908.032 845.44 960 784.32 960L182.656 960C118.912 960 64 905.6 64 844.48l0-534.4C64 249.024 119.488 196.992 180.544 196.992z" fill="currentColor" />
            </svg>
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
    <div
      className="flex items-center gap-2 px-4 py-2 text-xs cursor-default"
      style={{ backgroundColor: hovered ? '#3d3d3d' : undefined }}
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
        <span className="text-sm text-macos-text-tertiary">↗</span>
      </button>
      <span className="text-macos-text-tertiary shrink-0 ml-2">{formatBytes(file.size)}</span>
    </div>
  );
}
