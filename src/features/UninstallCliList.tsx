import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore, type AppState, type SelectedItem } from '@/store';
import { uninstallCliTool } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useRescanListener } from '@/hooks/useKeyboardShortcuts';
import SelectionSummary from '@/components/SelectionSummary';
import AutoHideScroll from '@/components/AutoHideScroll';

type CliTool = AppState['cliTools'][number];

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

  const handleScan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await window.electronAPI.ipc.invoke('scan:cli-tools') as CliTool[];
      setCliTools(result);
    } finally {
      setScanning(false);
    }
  }, [setScanning, setCliTools]);

  useRescanListener('uninstall-cli', handleScan);

  function handleSelect(tool: (typeof cliTools)[number], i: number) {
    const key = getToolKey(tool, i);
    setSelectedItem({ ...tool, path: tool.path || key } as unknown as SelectedItem);
  }

  function getToolKey(tool: (typeof cliTools)[number], _i: number) {
    return tool.path || `${tool.source}:${tool.name}`;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">️ CLI 工具卸载</h2>
          <p className="text-xs text-macos-text-tertiary">{cliTools.length} 个工具</p>
        </div>
      </div>
      <AutoHideScroll className="flex-1 px-3 py-3">
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
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${selected ? 'bg-macos-surface-hover' : 'hover:bg-macos-surface-hover'} ${i > 0 ? 'border-t border-macos-separator' : ''}`}
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
                    <div className="text-xs text-macos-text-tertiary">{tool.source} v{tool.version}</div>
                  </div>
                  {tool.size && <div className="text-xs text-macos-text-secondary shrink-0">{formatBytes(tool.size)}</div>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-4 text-macos-text-tertiary">{isScanning ? '扫描中...' : '没有检测到 CLI 工具'}</p>
        )}
      </AutoHideScroll>
    </div>
  );
}

export function UninstallCliDetail() {
  const { selectedItem, selectedPaths, cliTools, setCliTools, clearSelection } = useAppStore();
  const [uninstalling, setUninstalling] = useState(false);

  async function handleUninstall() {
    setUninstalling(true);
    try {
      if (selectedPaths.size > 0) {
        const tools = cliTools.filter(t => selectedPaths.has(t.path || `${t.source}:${t.name}`)) as CliTool[];
        for (const tool of tools) {
          await uninstallCliTool(tool.name, tool.source);
        }
        clearSelection();
      } else if (selectedItem) {
        const tool = cliTools.find(t => t.path === selectedItem.path) ?? (selectedItem as unknown as CliTool);
        await uninstallCliTool(tool.name, tool.source);
      }
      const result = await window.electronAPI.ipc.invoke('scan:cli-tools');
      setCliTools(result as { name: string; source: string; version: string; path: string; size?: number }[]);
    } finally {
      setUninstalling(false);
    }
  }

  if (!selectedItem && selectedPaths.size === 0) {
    return (
      <div className="flex h-full items-center justify-center text-macos-text-tertiary">
        <p>选择一项以查看详情</p>
      </div>
    );
  }

  if (!selectedItem && selectedPaths.size > 0) {
    const items = cliTools.filter(t => selectedPaths.has(t.path || `${t.source}:${t.name}`)).map(t => ({
      name: `${t.name} (${t.source})`,
      path: t.path || `${t.source}:${t.name}`,
      size: t.size,
    }));

    return (
      <SelectionSummary
        moduleIcon="🛠️"
        items={items}
        onClean={handleUninstall}
        cleanLabel={uninstalling ? '卸载中...' : '卸载'}
      />
    );
  }

  const tool = cliTools.find(t => t.path === selectedItem!.path) ?? (selectedItem as unknown as { name: string; source: string; version: string; path: string; size?: number });
  const selectedCount = selectedPaths.size;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-macos-separator px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg macos-icon-indigo flex items-center justify-center text-sm shrink-0">️</div>
            <div>
              <div className="text-sm font-bold">{tool.name}</div>
              <div className="text-xs text-macos-text-tertiary">{tool.source} v{tool.version}</div>
            </div>
          </div>
          {tool.size && (
            <div className="text-right shrink-0">
              <div className="text-sm font-bold">{formatBytes(tool.size)}</div>
            </div>
          )}
        </div>
      </div>
      <AutoHideScroll className="flex-1 px-4 py-3">
        <div className="space-y-2 text-sm">
          {tool.path && (
            <div className="flex justify-between"><span className="text-macos-text-secondary">路径</span><span className="text-macos-text-tertiary text-xs break-all text-right ml-4">{tool.path}</span></div>
          )}
          <div className="flex justify-between"><span className="text-macos-text-secondary">版本</span><span>{tool.version}</span></div>
          <div className="flex justify-between"><span className="text-macos-text-secondary">来源</span><span>{tool.source}</span></div>
        </div>
      </AutoHideScroll>
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content-light flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span><span className="font-bold">{selectedCount}</span> <span className="text-macos-text-tertiary">项已选</span></span>
        </div>
        <button
          onClick={handleUninstall}
          disabled={uninstalling}
          className="rounded-lg bg-macos-red px-4 py-2 text-sm font-bold hover:bg-macos-red-hover disabled:opacity-50"
        >
          {uninstalling ? '卸载中...' : '卸载'}
        </button>
      </div>
    </div>
  );
}

export default UninstallCliList;
