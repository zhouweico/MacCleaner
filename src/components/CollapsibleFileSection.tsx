import { useEffect, useState } from 'react';
import { formatBytes } from '@/lib/format';
import { showItemInFolder, getFinderIcon } from '@/lib/ipc';

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

// Cache finder icon globally
let finderIconCache: string | null = null;

export default function CollapsibleFileSection({
  title,
  files,
  defaultExpanded = false,
  showCheckbox = false,
  checkedFiles = new Set(),
  onToggleFile,
}: CollapsibleFileSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [finderIcon, setFinderIcon] = useState<string | null>(finderIconCache);
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const checkedCount = showCheckbox ? files.filter(f => checkedFiles.has(f.path)).length : 0;

  useEffect(() => {
    if (!finderIconCache) {
      getFinderIcon().then((icon) => {
        finderIconCache = icon;
        setFinderIcon(icon);
      });
    }
  }, []);

  if (files.length === 0) return null;

  async function handleOpenFinder(path: string) {
    await showItemInFolder(path);
  }

  const iconSrc = finderIcon || finderIconCache;

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
            <div key={i} className="flex items-center gap-2 px-4 py-2 hover:bg-macos-surface-hover/30 text-xs group">
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
              <button
                onClick={() => handleOpenFinder(f.path)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0 rounded hover:bg-macos-surface-hover"
                title="在访达中打开"
              >
                {iconSrc ? (
                  <img src={iconSrc} alt="Finder" className="w-3.5 h-3.5" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-macos-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" />
                  </svg>
                )}
              </button>
              <span className="text-macos-text-tertiary shrink-0 ml-2">{formatBytes(f.size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
