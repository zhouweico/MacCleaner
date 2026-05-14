import { useState } from 'react';
import { formatBytes } from '@/lib/format';

interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDir?: boolean;
}

interface CollapsibleFileSectionProps {
  title: string;
  files: FileEntry[];
  defaultExpanded?: boolean;
  showCheckbox?: boolean;
  checkedFiles?: Set<string>;
  onToggleFile?: (path: string, checked: boolean) => void;
}

export default function CollapsibleFileSection({
  title,
  files,
  defaultExpanded = false,
  showCheckbox = false,
  checkedFiles = new Set(),
  onToggleFile,
}: CollapsibleFileSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const checkedCount = showCheckbox ? files.filter(f => checkedFiles.has(f.path)).length : 0;

  if (files.length === 0) return null;

  return (
    <div className="border border-macos-separator rounded-lg mb-2 overflow-hidden bg-macos-surface/50">
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-macos-surface-hover"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {showCheckbox && (
            <input
              type="checkbox"
              checked={checkedCount === files.length && files.length > 0}
              onChange={(e) => {
                e.stopPropagation();
                const checked = e.target.checked;
                files.forEach(f => onToggleFile?.(f.path, checked));
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded shrink-0"
            />
          )}
          <span className="text-xs text-macos-text-tertiary">{expanded ? '▾' : '▸'}</span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <span className="text-xs text-macos-text-tertiary">{files.length} 项 · {formatBytes(totalSize)}</span>
      </div>
      {expanded && (
        <div className="border-t border-macos-separator">
          {files.map((f, i) => (
            <label key={i} className="flex items-center gap-2 px-4 py-2 hover:bg-macos-surface-hover/30 text-xs cursor-pointer">
              {showCheckbox && onToggleFile && (
                <input
                  type="checkbox"
                  checked={checkedFiles.has(f.path)}
                  onChange={(e) => onToggleFile(f.path, e.target.checked)}
                  className="rounded shrink-0"
                />
              )}
              <span className="text-macos-text-tertiary shrink-0">{f.isDir ? '📁' : '📄'}</span>
              <span className="text-macos-text-primary truncate flex-1 min-w-0">{f.path}</span>
              <span className="text-macos-text-tertiary shrink-0 ml-2">{formatBytes(f.size)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
