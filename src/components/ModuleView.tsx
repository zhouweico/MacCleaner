import { useAppStore } from '@/store';
import Dashboard from '@/modules/Dashboard';

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
    brew: <Placeholder name="Brew 缓存" />,
    docker: <Placeholder name="Docker 清理" />,
    npm: <Placeholder name="npm/Node" />,
    conda: <Placeholder name="Conda/Python" />,
    'system-cache': <Placeholder name="系统缓存" />,
    'cli-tools': <Placeholder name="CLI 工具" />,
    downloads: <Placeholder name="Downloads" />,
    'uninstall-apps': <Placeholder name="已安装 APP" />,
    'uninstall-cli': <Placeholder name="CLI 工具卸载" />,
    'residual-clean': <Placeholder name="APP 残留清理" />,
    settings: <Placeholder name="设置" />,
  };

  return <div className="flex-1 overflow-auto bg-gray-900 p-6">{moduleMap[currentModule]}</div>;
}

export default ModuleView;
