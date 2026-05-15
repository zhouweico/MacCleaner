import { useAppStore } from '@/store';
import AutoHideScroll from '@/components/AutoHideScroll';

interface ListDetailLayoutProps {
  list: React.ReactNode;
  detail: React.ReactNode;
  listWidth?: string;
}

function ListDetailLayout({ list, detail, listWidth = 'w-[35%]' }: ListDetailLayoutProps) {
  const { selectedItem, selectedPaths } = useAppStore();
  const hasSelection = selectedItem || selectedPaths.size > 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 中间栏 */}
      <div className={`${listWidth} flex-shrink-0 overflow-hidden bg-macos-content`}>
        {/* 列表区域 */}
        <div className="h-full overflow-hidden">
          {list}
        </div>
      </div>
      {/* 右边栏 */}
      <div className="flex-1 flex flex-col overflow-hidden bg-macos-content-light">
        <AutoHideScroll className="flex-1">
          {hasSelection ? detail : <EmptyDetail />}
        </AutoHideScroll>
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
