import { useRef, useEffect, useState, type ReactNode, type CSSProperties, type ElementType } from 'react';

interface AutoHideScrollProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 滚动停止后隐藏延迟（ms），默认 800 */
  hideDelay?: number;
  /** 渲染的元素标签，默认 div */
  as?: ElementType;
}

const TIMEOUT_KEY = '__ah_scroll_timeout';

export default function AutoHideScroll({
  children,
  className = '',
  style,
  hideDelay = 800,
  as: Component = 'div',
}: AutoHideScrollProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      setVisible(true);
      clearTimeout((el as any)[TIMEOUT_KEY]);
      (el as any)[TIMEOUT_KEY] = setTimeout(() => {
        setVisible(false);
      }, hideDelay);
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout((el as any)[TIMEOUT_KEY]);
    };
  }, [hideDelay]);

  return (
    <Component
      ref={ref}
      className={`autohide-scrollbar ${className} ${visible ? 'scrollbar-visible' : ''}`}
      style={style}
    >
      {children}
    </Component>
  );
}
