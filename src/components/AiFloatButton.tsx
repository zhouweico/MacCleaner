interface AiFloatButtonProps {
  onClick: () => void;
}

export default function AiFloatButton({ onClick }: AiFloatButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/80 text-lg shadow-lg backdrop-blur-sm hover:bg-purple-500 transition-colors"
      title="AI 分析"
    >
      🤖
    </button>
  );
}
