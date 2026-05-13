import Sidebar from '@/components/Sidebar';
import LayoutWrapper from '@/components/LayoutWrapper';

function App() {
  return (
    <div className="flex h-screen w-screen bg-macos-sidebar">
      <Sidebar />
      <LayoutWrapper />
    </div>
  );
}

export default App;
