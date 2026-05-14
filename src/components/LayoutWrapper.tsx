import { useRef, useLayoutEffect } from 'react';
import { useAppStore } from '@/store';
import ListDetailLayout from './ListDetailLayout';
import SettingsView from './SettingsView';
import Dashboard from '@/modules/Dashboard';
import UninstallAppsList, { UninstallAppsDetail } from '@/features/UninstallAppsList';
import UninstallCliList, { UninstallCliDetail } from '@/features/UninstallCliList';
import ResidualCleanerList, { ResidualCleanerDetail } from '@/features/ResidualCleanerList';
import DownloadsList, { DownloadsDetail } from '@/modules/DownloadsList';
import BrewList, { BrewDetail } from '@/modules/BrewList';
import DockerList, { DockerDetail } from '@/modules/DockerList';
import NpmList, { NpmDetail } from '@/modules/NpmList';
import CondaList, { CondaDetail } from '@/modules/CondaList';
import SystemCacheList, { SystemCacheDetail } from '@/modules/SystemCacheList';
import CliToolsList, { CliToolsDetail } from '@/modules/CliToolsList';

function LayoutWrapper() {
  const { currentModule, setSelectedItem } = useAppStore();
  const prevModule = useRef(currentModule);

  useLayoutEffect(() => {
    if (currentModule !== prevModule.current) {
      setSelectedItem(null);
      prevModule.current = currentModule;
    }
  });

  if (currentModule === 'dashboard') {
    return (
      <div className="flex-1 overflow-auto bg-macos-content-light p-6">
        <Dashboard />
      </div>
    );
  }

  if (currentModule === 'settings') {
    return (
      <div className="flex-1 overflow-auto bg-macos-content-light p-6">
        <SettingsView />
      </div>
    );
  }

  const layouts: Record<string, { list: React.ReactNode; detail: React.ReactNode; listWidth?: string }> = {
    brew: { list: <BrewList />, detail: <BrewDetail /> },
    docker: { list: <DockerList />, detail: <DockerDetail /> },
    npm: { list: <NpmList />, detail: <NpmDetail /> },
    conda: { list: <CondaList />, detail: <CondaDetail /> },
    'system-cache': { list: <SystemCacheList />, detail: <SystemCacheDetail /> },
    'cli-tools': { list: <CliToolsList />, detail: <CliToolsDetail /> },
    downloads: { list: <DownloadsList />, detail: <DownloadsDetail /> },
    'uninstall-apps': { list: <UninstallAppsList />, detail: <UninstallAppsDetail /> },
    'uninstall-cli': { list: <UninstallCliList />, detail: <UninstallCliDetail /> },
    'residual-clean': { list: <ResidualCleanerList />, detail: <ResidualCleanerDetail /> },
  };

  const layout = layouts[currentModule];
  if (!layout) return null;

  return <ListDetailLayout list={layout.list} detail={layout.detail} listWidth={layout.listWidth ?? 'w-[35%]'} />;
}

export default LayoutWrapper;
