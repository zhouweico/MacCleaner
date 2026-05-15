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

interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDir?: boolean;
}

function FileRow({ file, showCheckbox, checkedFiles, onToggleFile, iconSrc }: {
  file: FileEntry;
  showCheckbox: boolean;
  checkedFiles: Set<string>;
  onToggleFile?: (path: string, checked: boolean) => void;
  iconSrc: string | null;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-xs cursor-default"
      style={{ backgroundColor: hovered ? '#3d3d3d' : undefined }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showCheckbox && onToggleFile && (
        <input
          type="checkbox"
          checked={checkedFiles.has(file.path)}
          onChange={(e) => onToggleFile(file.path, e.target.checked)}
          className="rounded shrink-0"
        />
      )}
      <span className="text-macos-text-tertiary shrink-0">{file.isDir ? '📁' : '📄'}</span>
      <span className="text-macos-text-primary truncate flex-1 min-w-0">{file.path}</span>
      <button
        onClick={() => showItemInFolder(file.path)}
        className="shrink-0 p-0 rounded hover:bg-macos-surface-hover"
        style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}
        title="在访达中打开"
      >
        {iconSrc ? (
          <img src={iconSrc} alt="Finder" className="w-3.5 h-3.5" />
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M180.544 196.992l389.44 0c0 0 63.488 1.984 64.64 57.728 1.152 56.384-64.64 56.512-64.64 56.512L360.576 311.232c0 0-49.6-7.552-69.44 44.48C283.456 375.872 217.664 559.488 192.064 640c-7.232 22.72 10.048 28.864 24.128 29.248 14.72 0.512 27.968 0.256 40.192 0 16.384-0.128 30.272-6.4 37.888-29.248 16.384-49.728 69.696-182.4 76.608-199.872C388.736 395.008 412.16 399.616 438.016 399.616c47.168 0 491.712 0 491.712 0 61.12 0 84.032 33.024 66.304 83.968L921.6 849.344C902.592 908.032 845.44 960 784.32 960L182.656 960C118.912 960 64 905.6 64 844.48l0-534.4C64 249.024 119.488 196.992 180.544 196.992z" fill="currentColor" />
          </svg>
        )}
      </button>
      <span className="text-macos-text-tertiary shrink-0 ml-2">{formatBytes(file.size)}</span>
    </div>
  );
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
          <span className="text-xl text-macos-text-tertiary">{expanded ? '▾' : '▸'}</span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <span className="text-xs text-macos-text-tertiary">{files.length} 项 · {formatBytes(totalSize)}</span>
      </div>
      {expanded && (
        <div className="border-t border-macos-separator">
          {files.map((f, i) => (
            <FileRow key={i} file={f} showCheckbox={showCheckbox} checkedFiles={checkedFiles} onToggleFile={onToggleFile} iconSrc={iconSrc} />
          ))}
        </div>
      )}
    </div>
  );
}
