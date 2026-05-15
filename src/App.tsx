import Sidebar from '@/components/Sidebar';
import LayoutWrapper from '@/components/LayoutWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function App() {
  useKeyboardShortcuts();

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
