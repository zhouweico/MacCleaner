import { useAppStore } from '@/store';

interface ListDetailLayoutProps {
  list: React.ReactNode;
  detail: React.ReactNode;
  listWidth?: string;
}

function ListDetailLayout({ list, detail, listWidth = 'w-[35%]' }: ListDetailLayoutProps) {
  const { selectedItem } = useAppStore();

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
        <div className="flex-1 overflow-y-auto">
          {selectedItem ? detail : <EmptyDetail />}
        </div>
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
