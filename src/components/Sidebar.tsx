import { useAppStore, navItems } from '@/store';

const groupLabels: Record<string, string> = {
  clean: '🧹 清理模块',
  uninstall: '🗑️ 卸载管理',
  settings: '',
};

function Sidebar() {
  const { currentModule, setCurrentModule } = useAppStore();

  const groups = Object.entries(
    navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {}),
  );

  return (
    <div className="flex h-full w-[15%] min-w-[140px] flex-col border-r border-gray-700 bg-gray-850 p-3">
      {groups.map(([group, items]) => (
        <div key={group} className={group !== 'clean' ? 'mt-4 border-t border-gray-700 pt-3' : ''}>
          {groupLabels[group] && (
            <div className="mb-1 px-2 text-xs uppercase text-gray-500">{groupLabels[group]}</div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentModule(item.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                currentModule === item.id
                  ? 'bg-purple-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default Sidebar;
