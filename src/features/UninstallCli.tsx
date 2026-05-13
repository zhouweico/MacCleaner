import { useEffect, useState } from 'react';
import { uninstallCliTool } from '@/lib/ipc';

interface CliTool {
  name: string;
  source: 'brew' | 'npm' | 'pip';
  version: string;
  path: string;
}

function UninstallCli() {
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

  async function handleUninstall(tool: CliTool) {
    await uninstallCliTool(tool.name, tool.source);
    await handleScan();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📦 CLI 工具卸载</h1>
        <button onClick={handleScan} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
          重新扫描
        </button>
      </div>

      <div className="rounded-lg bg-gray-800 p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="pb-2 text-left">工具</th>
              <th className="pb-2 text-left">来源</th>
              <th className="pb-2 text-left">版本</th>
              <th className="pb-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool, i) => (
              <tr key={i} className="border-b border-gray-800">
                <td className="py-2">{tool.name}</td>
                <td className="py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${
                    tool.source === 'brew' ? 'bg-orange-500/20 text-orange-400' :
                    tool.source === 'npm' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{tool.source}</span>
                </td>
                <td className="py-2 text-gray-400">{tool.version}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleUninstall(tool)}
                    className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30"
                  >
                    卸载
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tools.length === 0 && <p className="text-gray-500">{scanning ? '扫描中...' : '没有检测到 CLI 工具'}</p>}
      </div>
    </div>
  );
}

export default UninstallCli;
