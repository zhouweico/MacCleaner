import { useEffect, useState } from 'react';
import { useAppStore, type SelectedItem } from '@/store';
import { uninstallCliTool } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';

interface CliTool {
  name: string;
  source: 'brew' | 'npm' | 'pip';
  version: string;
  path: string;
  size?: number;
}

const sourceColors: Record<string, string> = {
  brew: 'bg-orange-500/20 text-orange-400',
  npm: 'bg-red-500/20 text-red-400',
  pip: 'bg-blue-500/20 text-blue-400',
};

function UninstallCliList() {
  const { selectedItem, setSelectedItem, toggleSelection, isSelected } = useAppStore();
  const [tools, setTools] = useState<CliTool[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try {
      const result = await window.electronAPI.ipc.invoke('scan:cli-tools') as CliTool[];
      setTools(result);
    } finally {
      setScanning(false);
    }
  }

  function handleSelect(tool: CliTool) {
    setSelectedItem(tool as unknown as SelectedItem);
  }

  function getToolKey(tool: CliTool, i: number) {
    return tool.path || `${tool.source}-${tool.name}-${i}`;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-macos-separator px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">🖥️ CLI 工具卸载</h2>
          <p className="text-xs text-macos-text-tertiary">{tools.length} 个工具</p>
        </div>
        <button onClick={handleScan} disabled={scanning} className="rounded bg-macos-accent px-2.5 py-1.5 text-xs font-medium hover:bg-macos-accent-hover disabled:opacity-50">
          {scanning ? '扫描中...' : '重新扫描'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tools.map((tool, i) => {
          const toolKey = getToolKey(tool, i);
          return (
          <div
            key={toolKey}
            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-macos-separator ${selectedItem?.path === (tool.path || `${tool.source}-${tool.name}-${i}`) ? 'bg-macos-accent/20' : 'hover:bg-macos-surface-hover'}`}
            onClick={() => handleSelect(tool)}
          >
            <input
              type="checkbox"
              checked={isSelected(toolKey)}
              onChange={() => toggleSelection(toolKey)}
              onClick={(e) => e.stopPropagation()}
              className="rounded shrink-0"
            />
            <div className="w-8 h-8 rounded bg-macos-surface flex items-center justify-center text-sm shrink-0">🖥️</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{tool.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`rounded px-1.5 py-0.5 text-xs ${sourceColors[tool.source]}`}>{tool.source}</span>
                <span className="text-xs text-macos-text-tertiary">v{tool.version}</span>
              </div>
            </div>
            {tool.size && <div className="text-sm font-medium shrink-0 ml-2">{formatBytes(tool.size)}</div>}
          </div>
        );
        })}
        {tools.length === 0 && <p className="p-4 text-macos-text-tertiary">{scanning ? '扫描中...' : '没有检测到 CLI 工具'}</p>}
      </div>
    </div>
  );
}

export function UninstallCliDetail() {
  const { selectedItem } = useAppStore();
  const [uninstalling, setUninstalling] = useState(false);

  if (!selectedItem) return <p className="text-macos-text-tertiary">选择一项以查看详情</p>;

  const tool = selectedItem as unknown as CliTool;

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
            <div className="w-10 h-10 rounded-lg bg-macos-surface flex items-center justify-center text-xl shrink-0">🖥️</div>
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
      <div className="border-t border-macos-separator px-4 py-3 bg-macos-content flex justify-end">
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
