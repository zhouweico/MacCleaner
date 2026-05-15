import { useAppStore, navItems } from '@/store';
import { useState, useRef, useEffect, useMemo } from 'react';

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

function Sidebar() {
  const { currentModule, setCurrentModule, clearSearch, setSearchTargetPath } = useAppStore();
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
            onChange={e => setMenuSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-sm bg-macos-sidebar-hover/60 rounded-lg outline-none focus:ring-1 focus:ring-macos-accent text-macos-text-primary placeholder:text-macos-text-tertiary"
          />
          {menuSearchQuery && (
            <button
              onClick={() => { setMenuSearchQuery(''); inputRef.current?.focus(); }}
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
        {Object.keys(filteredGroups).length === 0 && hasSearch ? (
          <p className="px-3 py-2 text-xs text-macos-text-tertiary">未找到匹配结果</p>
        ) : (
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
