import Sidebar from '@/components/Sidebar';
import LayoutWrapper from '@/components/LayoutWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <div className="app-container flex h-screen w-screen bg-macos-bg text-macos-text-primary">
      <Sidebar />
      <ErrorBoundary>
        <LayoutWrapper />
      </ErrorBoundary>
    </div>
  );
}

export default App;
