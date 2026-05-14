import { useEffect, useRef, useState } from 'react';
import { useAppStore, type AppState, type SelectedItem } from '@/store';
import { uninstallCliTool } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';

type CliTool = AppState['cliTools'][number];

const sourceColors: Record<string, string> = {
  brew: 'bg-orange-500/20 text-orange-400',
  npm: 'bg-red-500/20 text-red-400',
  pip: 'bg-blue-500/20 text-blue-400',
};

function UninstallCliList() {
  const { cliTools, setCliTools, selectedItem, setSelectedItem, toggleSelection, isSelected, isScanning, setScanning, searchTargetPath } = useAppStore();
  const lastAutoSelectPath = useRef('');
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    lastAutoSelectPath.current = '';
    if (cliTools.length === 0) handleScan();
  }, []);

  // Auto-select from search navigation + scroll into view
  useEffect(() => {
    if (!searchTargetPath || searchTargetPath === lastAutoSelectPath.current) return;
    // Match by path if non-empty, else by source:name composite key
    const tool = cliTools.find(t => {
      const key = t.path || `${t.source}:${t.name}`;
      return key === searchTargetPath || t.path === searchTargetPath;
    });
    if (tool) {
      const key = getToolKey(tool, cliTools.indexOf(tool));
      setSelectedItem({ ...tool, path: tool.path || key } as unknown as SelectedItem);
      lastAutoSelectPath.current = searchTargetPath;
      requestAnimationFrame(() => {
        const el = rowRefs.current.get(key);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [searchTargetPath, cliTools]);

  async function handleScan() {
    setScanning(true);
    try {
      const result = await window.electronAPI.ipc.invoke('scan:cli-tools') as CliTool[];
      setCliTools(result);
    } finally {
      setScanning(false);
    }
  }

  function handleSelect(tool: (typeof cliTools)[number], i: number) {
    const key = getToolKey(tool, i);
    setSelectedItem({ ...tool, path: tool.path || key } as unknown as SelectedItem);
  }

  function getToolKey(tool: (typeof cliTools)[number], _i: number) {
    return tool.path || `${tool.source}:${tool.name}`;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-macos-separator px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">️ CLI 工具卸载</h2>
          <p className="text-xs text-macos-text-tertiary">{cliTools.length} 个工具</p>
        </div>
        <button onClick={handleScan} disabled={isScanning} className="rounded bg-macos-accent px-2.5 py-1.5 text-xs font-medium hover:bg-macos-accent-hover disabled:opacity-50">
          {isScanning ? '扫描中...' : '重新扫描'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {cliTools.length > 0 ? (
          <div className="bg-macos-surface/50 rounded-xl overflow-hidden">
            {cliTools.map((tool, i) => {
              const toolKey = getToolKey(tool, i);
              const selected = selectedItem?.path === toolKey || isSelected(toolKey);
              return (
                <div
                  key={toolKey}
                  ref={(el) => {
                    if (el) rowRefs.current.set(toolKey, el);
                    else rowRefs.current.delete(toolKey);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${selected ? 'bg-macos-accent/15' : 'hover:bg-macos-surface-hover'} ${i > 0 ? 'border-t border-macos-separator' : ''}`}
                  onClick={() => handleSelect(tool, i)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected(toolKey)}
                    onChange={() => toggleSelection(toolKey)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg macos-icon-indigo flex items-center justify-center text-sm shrink-0">🖥️</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-macos-text-primary">{tool.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${sourceColors[tool.source]}`}>{tool.source}</span>
                      <span className="text-xs text-macos-text-tertiary">v{tool.version}</span>
                    </div>
                  </div>
                  {tool.size && <div className="text-xs text-macos-text-secondary shrink-0">{formatBytes(tool.size)}</div>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-4 text-macos-text-tertiary">{isScanning ? '扫描中...' : '没有检测到 CLI 工具'}</p>
        )}
      </div>
    </div>
  );
}

export function UninstallCliDetail() {
  const { selectedItem, cliTools } = useAppStore();
  const [uninstalling, setUninstalling] = useState(false);

  if (!selectedItem) return <p className="text-macos-text-tertiary">选择一项以查看详情</p>;

  const tool = cliTools.find(t => t.path === selectedItem.path) ?? (selectedItem as unknown as { name: string; source: string; version: string; path: string; size?: number });

  async function handleUninstall() {
    setUninstalling(true);
    try {
      await uninstallCliTool(tool.name, tool.source);
    } finally {
      setUninstalling(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg macos-icon-indigo flex items-center justify-center text-xl shrink-0">🖥️</div>
            <div>
              <h2 className="text-lg font-bold">{tool.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`rounded px-1.5 py-0.5 text-xs ${sourceColors[tool.source]}`}>{tool.source}</span>
                <span className="text-xs text-macos-text-tertiary">v{tool.version}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-2 text-sm">
          {tool.path && (
            <div className="flex justify-between"><span className="text-macos-text-secondary">路径</span><span className="text-macos-text-tertiary text-xs break-all text-right ml-4">{tool.path}</span></div>
          )}
          <div className="flex justify-between"><span className="text-macos-text-secondary">版本</span><span>{tool.version}</span></div>
          <div className="flex justify-between"><span className="text-macos-text-secondary">来源</span><span>{tool.source}</span></div>
        </div>
      </div>
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex justify-end">
        <button
          onClick={handleUninstall}
          disabled={uninstalling}
          className="rounded-lg bg-macos-red px-4 py-2 text-sm font-bold hover:bg-macos-red disabled:opacity-50"
        >
          {uninstalling ? '卸载中...' : `卸载 ${tool.name}`}
        </button>
      </div>
    </div>
  );
}

export default UninstallCliList;
