import { useAppStore } from '@/store';
import Dashboard from '@/modules/Dashboard';
import BrewModule from '@/modules/BrewModule';
import DockerModule from '@/modules/DockerModule';
import NpmModule from '@/modules/NpmModule';
import CondaModule from '@/modules/CondaModule';
import SystemCacheModule from '@/modules/SystemCacheModule';
import CliToolsModule from '@/modules/CliToolsModule';
import DownloadsModule from '@/modules/DownloadsModule';

function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex h-full items-center justify-center text-gray-500">
      <p>{name} 模块开发中...</p>
    </div>
  );
}

function ModuleView() {
  const { currentModule } = useAppStore();

  const moduleMap: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    brew: <BrewModule />,
    docker: <DockerModule />,
    npm: <NpmModule />,
    conda: <CondaModule />,
    'system-cache': <SystemCacheModule />,
    'cli-tools': <CliToolsModule />,
    downloads: <DownloadsModule />,
    'uninstall-apps': <Placeholder name="已安装 APP" />,
    'uninstall-cli': <Placeholder name="CLI 工具卸载" />,
    'residual-clean': <Placeholder name="APP 残留清理" />,
    settings: <Placeholder name="设置" />,
  };

  return <div className="flex-1 overflow-auto bg-gray-900 p-6">{moduleMap[currentModule]}</div>;
}

export default ModuleView;
