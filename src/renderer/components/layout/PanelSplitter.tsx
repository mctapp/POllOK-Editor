import { useCallback, useState, useEffect } from 'react';

interface PanelSplitterProps {
  direction: 'vertical' | 'horizontal';
  onResize: (delta: number) => void;
}

export function PanelSplitter({ direction, onResize }: PanelSplitterProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    let lastPos = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'vertical' ? e.clientX : e.clientY;
      if (lastPos !== 0) {
        const delta = currentPos - lastPos;
        onResize(delta);
      }
      lastPos = currentPos;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      lastPos = 0;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 드래그 중 커서 스타일 변경
    document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, direction, onResize]);

  return (
    <div
      className={`
        ${direction === 'vertical' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
        bg-dark-border hover:bg-primary-500 transition-colors flex-shrink-0
        ${isDragging ? 'bg-primary-500' : ''}
      `}
      onMouseDown={handleMouseDown}
    />
  );
}
