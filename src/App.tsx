import Sidebar from '@/components/Sidebar';
import LayoutWrapper from '@/components/LayoutWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAppStore } from '@/store';
import { scanAll, scanApps, scanResidual, scanCliToolsList } from '@/lib/ipc';
import { useEffect } from 'react';

function App() {
  const { setCurrentModule } = useAppStore();

  // Expose navigation for main process shortcuts (Cmd+, → settings)
  useEffect(() => {
    (window as any).__navigateToModule = (moduleId: string) => {
      setCurrentModule(moduleId);
    };
    return () => { delete (window as any).__navigateToModule; };
  }, [setCurrentModule]);

  useKeyboardShortcuts();

  // Listen for navigation from panel
  useEffect(() => {
    const unsubNav = window.electronAPI.ipc.on('navigate:module', (moduleId: unknown) => {
      const { setCurrentModule } = useAppStore.getState();
      setCurrentModule(moduleId as string);
    });

    // Listen for refresh from panel
    const unsubRefresh = window.electronAPI.ipc.on('events:refresh', async () => {
      const { setScanResults, setApps, setResiduals, setCliTools } = useAppStore.getState();
      try {
        const [results, apps, residuals, cliTools] = await Promise.all([
          scanAll(),
          scanApps(),
          scanResidual(),
          scanCliToolsList(),
        ]);
        setScanResults(results);
        setApps(apps);
        setResiduals(residuals);
        setCliTools(cliTools as { name: string; source: string; version: string; path: string; size?: number }[]);
      } catch {
        // ignore errors — user can manually rescan
      }
    });

    return () => {
      unsubNav();
      unsubRefresh();
    };
  }, []);

  return (
    <div className="flex h-screen w-screen bg-macos-bg text-macos-text-primary">
      {/* 顶部拖动条 */}
      <div className="window-drag-region fixed top-0 left-0 right-0 h-10 z-50" />
      <Sidebar />
      <ErrorBoundary>
        <LayoutWrapper />
      </ErrorBoundary>
    </div>
  );
}

export default App;
