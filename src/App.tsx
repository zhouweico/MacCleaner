import Sidebar from '@/components/Sidebar';
import LayoutWrapper from '@/components/LayoutWrapper';

function App() {
  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white">
      <Sidebar />
      <LayoutWrapper />
    </div>
  );
}

export default App;
