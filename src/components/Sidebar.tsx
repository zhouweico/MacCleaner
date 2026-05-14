import { useAppStore, navItems } from '@/store';
import { useState } from 'react';

const groupLabels: Record<string, string> = {
  clean: '清理',
  uninstall: '卸载',
  settings: '',
};

// 图标 Emoji 到背景色的映射
const iconBgMap: Record<string, string> = {
  '🍺': 'bg-macos-icon-orange',
  '': 'bg-macos-icon-blue',
  '📦': 'bg-macos-icon-red',
  '🐍': 'bg-macos-icon-green',
  '🗂️': 'bg-macos-icon-teal',
  '🛠️': 'bg-macos-icon-purple',
  '📥': 'bg-macos-icon-indigo',
  '📱': 'bg-macos-icon-blue',
  '🗑️': 'bg-macos-icon-red',
  '⚙️': 'bg-macos-icon-teal',
  '📊': 'bg-macos-icon-blue',
};

function Sidebar() {
  const { currentModule, setCurrentModule } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = searchQuery
    ? navItems.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : navItems;

  const groups = Object.entries(
    filteredItems.reduce<Record<string, typeof navItems>>((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {}),
  );

  return (
    <div className="flex h-full w-[220px] min-w-[220px] flex-col bg-macos-sidebar border-r border-macos-separator">
      {/* 搜索栏 */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-macos-surface rounded-md">
          <svg className="w-3.5 h-3.5 text-macos-text-tertiary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="搜索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm text-macos-text-primary placeholder-macos-text-tertiary outline-none w-full"
          />
        </div>
      </div>

      {/* 菜单列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {groups.map(([group, items], idx) => (
          <div key={group} className={idx > 0 ? 'mt-3 pt-3 border-t border-macos-separator' : ''}>
            {groupLabels[group] && (
              <div className="mb-1 px-2 text-xs font-medium text-macos-text-tertiary">{groupLabels[group]}</div>
            )}
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentModule(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  currentModule === item.id
                    ? 'bg-macos-sidebar-active text-white font-medium'
                    : 'text-macos-text-primary hover:bg-macos-surface-hover'
                }`}
              >
                {/* 图标背景 */}
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${iconBgMap[item.icon] ?? 'bg-macos-accent/30'}`}>
                  <span className="text-xs">{item.icon}</span>
                </div>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
