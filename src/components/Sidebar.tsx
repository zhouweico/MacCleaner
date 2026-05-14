import { useAppStore, navItems, buildSearchResults, groupSearchResults } from '@/store';
import { useState, useRef, useEffect } from 'react';
import { formatBytes } from '@/lib/format';

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
  '': 'bg-macos-icon-teal',
  '🛠️': 'bg-macos-icon-purple',
  '📥': 'bg-macos-icon-indigo',
  '📱': 'bg-macos-icon-blue',
  '️': 'bg-macos-icon-red',
  '⚙️': 'bg-macos-icon-teal',
  '': 'bg-macos-icon-blue',
  '🏠': 'bg-macos-icon-blue',
  '🗂️': 'bg-macos-icon-teal',
  '🗑️': 'bg-macos-icon-red',
};

/** 高亮匹配关键词 */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function Sidebar() {
  const { currentModule, setCurrentModule, searchQuery, setSearchQuery, clearSearch, setSearchTargetPath } = useAppStore();
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 搜索框焦点: Cmd+F / Ctrl+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler as unknown as EventListener);
    return () => window.removeEventListener('keydown', handler as unknown as EventListener);
  }, []);

  // Escape 清空搜索
  useEffect(() => {
    if (!searchQuery) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSearch();
        setMenuSearchQuery('');
      }
    };
    window.addEventListener('keydown', handler as unknown as EventListener);
    return () => window.removeEventListener('keydown', handler as unknown as EventListener);
  }, [searchQuery, clearSearch]);

  // 同步内部状态到 store（用于搜索计算）
  const handleSearchChange = (value: string) => {
    setMenuSearchQuery(value);
    setSearchQuery(value);
  };

  const handleClear = () => {
    setMenuSearchQuery('');
    clearSearch();
    inputRef.current?.focus();
  };

  // 导航到模块
  const navigateTo = (moduleId: string, targetPath?: string) => {
    setCurrentModule(moduleId);
    if (targetPath) setSearchTargetPath(targetPath);
  };

  const isSearching = searchQuery.length > 0;
  const searchGroups = isSearching ? groupSearchResults(buildSearchResults()) : [];

  // 正常菜单: 按搜索词过滤
  const filteredItems = menuSearchQuery && !isSearching
    ? navItems.filter(item => item.label.toLowerCase().includes(menuSearchQuery.toLowerCase()))
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
        <div className="relative flex items-center gap-1.5 px-2 py-1.5 bg-macos-surface rounded-md">
          <svg className="w-3.5 h-3.5 text-macos-text-tertiary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索"
            value={menuSearchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="bg-transparent text-sm text-macos-text-primary placeholder-macos-text-tertiary outline-none w-full pr-5"
          />
          {menuSearchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-2 w-4 h-4 flex items-center justify-center rounded-full bg-macos-text-tertiary/30 hover:bg-macos-text-tertiary/50 transition-colors"
            >
              <svg className="w-2.5 h-2.5 text-macos-text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 菜单列表 / 搜索结果 */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isSearching ? (
          // 搜索结果视图
          searchGroups.length > 0 ? (
            searchGroups.map((group) => (
              <div key={group.moduleId} className="mb-1">
                {/* 模块分组头 */}
                <button
                  onClick={() => navigateTo(group.moduleId)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                    currentModule === group.moduleId
                      ? 'bg-macos-sidebar-active text-white font-medium'
                      : 'text-macos-text-primary hover:bg-macos-surface-hover'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${iconBgMap[group.moduleIcon] ?? 'bg-macos-accent/30'}`}>
                    <span className="text-xs">{group.moduleIcon}</span>
                  </div>
                  <span className="truncate font-medium">
                    <HighlightText text={group.moduleName} query={searchQuery} />
                  </span>
                </button>
                {/* 匹配的子项 */}
                {group.items.filter(item => item.itemType !== 'module').map((item, i) => (
                  <button
                    key={`${item.moduleId}-${item.itemName}-${i}`}
                    onClick={() => navigateTo(item.moduleId, item.itemPath)}
                    className="flex w-full items-center gap-2 pl-10 pr-2 py-1 text-xs text-macos-text-secondary hover:bg-macos-surface-hover hover:text-macos-text-primary transition-colors rounded-md"
                  >
                    <span className="truncate">
                      <HighlightText text={item.itemName} query={searchQuery} />
                    </span>
                    {item.itemSize !== undefined && (
                      <span className="ml-auto shrink-0 text-macos-text-tertiary">
                        {formatBytes(item.itemSize)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          ) : (
            <p className="px-2 py-4 text-xs text-macos-text-tertiary text-center">无匹配结果</p>
          )
        ) : (
          // 正常菜单视图
          groups.map(([group, items], idx) => (
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
          ))
        )}
      </div>
    </div>
  );
}

export default Sidebar;
