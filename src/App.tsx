import Sidebar from '@/components/Sidebar';
import LayoutWrapper from '@/components/LayoutWrapper';

function App() {
  return (
    <div className="app-container flex h-screen w-screen bg-macos-bg text-macos-text-primary">
      <Sidebar />
      <LayoutWrapper />
    </div>
  );
}

export default App;
