import { useAppStore, navItems, buildSearchResults, groupSearchResults } from '@/store';
import { useState, useRef, useEffect, useMemo } from 'react';
import { formatBytes } from '@/lib/format';

const groupLabels: Record<string, string> = {
  clean: '清理',
  uninstall: '卸载',
  settings: '',
};

// 图标 Emoji 到背景色的映射
const iconBgMap: Record<string, string> = {
  '\u{1F37A}': 'bg-macos-icon-orange',
  '\u{1F433}': 'bg-macos-icon-blue',
  '\u{1F4E6}': 'bg-macos-icon-red',
  '\u{1F40D}': 'bg-macos-icon-green',
  '\u{1F6E0}\u{FE0F}': 'bg-macos-icon-purple',
  '\u{1F4E5}': 'bg-macos-icon-indigo',
  '\u{1F4F1}': 'bg-macos-icon-blue',
  '\u{1F5D1}\u{FE0F}': 'bg-macos-icon-red',
  '\u{2699}\u{FE0F}': 'bg-macos-icon-teal',
  '\u{1F3E0}': 'bg-macos-icon-blue',
  '\u{1F5C2}\u{FE0F}': 'bg-macos-icon-teal',
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
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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

  // 按 group 分组导航项
  const groupedNavItems = useMemo(() => {
    const acc: Record<string, { group: string; label?: string; items: typeof navItems }> = {};
    for (const item of navItems) {
      if (!acc[item.group]) acc[item.group] = { group: item.group, label: groupLabels[item.group], items: [] };
      acc[item.group].items.push(item);
    }
    return acc;
  }, []);

  // 过滤导航项
  const hasSearch = menuSearchQuery.trim().length > 0;
  const filteredGroups = useMemo(() => {
    if (!hasSearch) return groupedNavItems;
    const q = menuSearchQuery.toLowerCase();
    const filtered: Record<string, { group: string; label?: string; items: typeof navItems }> = {};
    for (const [groupKey, group] of Object.entries(groupedNavItems)) {
      const matched = group.items.filter(item =>
        item.label.toLowerCase().includes(q)
      );
      if (matched.length > 0) {
        filtered[groupKey] = { ...group, items: matched };
      }
    }
    return filtered;
  }, [menuSearchQuery, groupedNavItems]);

  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col">
      {/* 侧边栏圆角框 */}
      <div className="flex flex-col h-full mx-2 my-2 bg-macos-sidebar rounded-xl overflow-hidden">
      {/* Window controls spacer */}
      <div className="h-2 shrink-0" />

      {/* Search */}
      <div className="px-3 pt-12 pb-3 shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-macos-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索"
            value={menuSearchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-sm bg-macos-sidebar-hover/60 rounded-lg outline-none focus:ring-1 focus:ring-macos-accent text-macos-text-primary placeholder:text-macos-text-tertiary"
          />
          {menuSearchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-macos-text-tertiary flex items-center justify-center hover:bg-macos-text-secondary"
            >
              <svg className="w-2.5 h-2.5 text-macos-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Menu / Search Results */}
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
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
                      ? 'bg-macos-accent text-white font-medium'
                      : 'text-macos-text-primary hover:bg-macos-surface-hover'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-xs shrink-0 ${iconBgMap[group.moduleIcon] ?? 'bg-macos-surface'}`}>
                    <span>{group.moduleIcon}</span>
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
          (() => {
            const order = ['clean', 'uninstall', 'settings'];
            return order
              .filter(g => filteredGroups[g])
              .map(groupKey => {
                const group = filteredGroups[groupKey];
                return (
                  <div key={group.group} className="mb-3">
                    {group.label && (
                      <div className="px-2 py-1 text-xs font-semibold text-macos-text-secondary">{group.label}</div>
                    )}
                    {group.items.map(child => {
                      const active = currentModule === child.id;
                      const iconColor = iconBgMap[child.icon] ?? 'bg-macos-surface';
                      return (
                        <div
                          key={child.id}
                          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${active ? 'bg-macos-accent text-white font-medium' : 'text-macos-text-primary hover:bg-macos-surface-hover'}`}
                          onClick={() => {
                            setCurrentModule(child.id);
                            setSearchTargetPath('');
                            clearSearch();
                          }}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center text-xs shrink-0 ${active ? 'bg-white/20' : iconColor}`}>
                            {child.icon || child.label.charAt(0)}
                          </div>
                          <span className="truncate">{child.label}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              });
          })()
        )}
      </nav>
      </div>
    </div>
  );
}

export default Sidebar;
