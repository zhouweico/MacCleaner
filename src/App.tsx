import Sidebar from '@/components/Sidebar';
import ModuleView from '@/components/ModuleView';

function App() {
  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white">
      <Sidebar />
      <ModuleView />
    </div>
  );
}

export default App;
