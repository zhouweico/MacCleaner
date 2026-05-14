import { useAppStore } from '@/store';

interface ListDetailLayoutProps {
  list: React.ReactNode;
  detail: React.ReactNode;
  bottomBar?: React.ReactNode;
  listWidth?: string;
}

function ListDetailLayout({ list, detail, bottomBar, listWidth = 'w-[35%]' }: ListDetailLayoutProps) {
  const { selectedItem } = useAppStore();

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 中间栏 */}
      <div className={`${listWidth} flex-shrink-0 overflow-hidden`}>
        {/* 顶部选项卡风格区域 */}
        <div className="h-10 bg-macos-header-bg flex items-center px-4 border-b border-macos-separator">
          <div className="flex items-center gap-2">
            <button className="text-macos-text-tertiary hover:text-macos-text-primary transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button className="text-macos-text-tertiary hover:text-macos-text-primary transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
        {/* 列表区域 */}
        <div className="h-[calc(100%-2.5rem)] overflow-hidden bg-macos-content">
          {list}
        </div>
      </div>
      {/* 右边栏 */}
      <div className="flex-1 flex flex-col overflow-hidden bg-macos-content-light">
        <div className="flex-1 overflow-y-auto">
          {selectedItem ? detail : <EmptyDetail />}
        </div>
        {bottomBar && selectedItem && bottomBar}
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="flex h-full items-center justify-center text-macos-text-tertiary">
      <p>选择一项以查看详情</p>
    </div>
  );
}

export default ListDetailLayout;
