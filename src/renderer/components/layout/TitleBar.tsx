import { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
import { useProjectStore } from '../../stores';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const { project, isDirty } = useProjectStore();
  const isMac = window.api.platform === 'darwin';

  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await window.api.window.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();

    const unsubscribe = window.api.on('window:maximized-changed', (maximized: unknown) => {
      setIsMaximized(maximized as boolean);
    });

    return unsubscribe;
  }, []);

  const title = project
    ? `${isDirty ? '● ' : ''}${project.title} - AccessON`
    : 'AccessON';

  return (
    <div className="h-8 bg-dark-surface flex items-center justify-between select-none border-b border-dark-border">
      {/* 드래그 영역 */}
      <div
        className={`flex-1 h-full app-drag-region flex items-center ${
          isMac ? 'pl-20' : 'px-3'
        }`}
      >
        <span className="text-xs text-gray-400 truncate">{title}</span>
      </div>

      {/* 윈도우 컨트롤 (Windows/Linux) */}
      {!isMac && (
        <div className="flex h-full app-no-drag">
          <button
            onClick={() => window.api.window.minimize()}
            className="w-12 h-full flex items-center justify-center hover:bg-gray-600 transition-colors"
            title="최소화"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.api.window.maximize()}
            className="w-12 h-full flex items-center justify-center hover:bg-gray-600 transition-colors"
            title={isMaximized ? '이전 크기로' : '최대화'}
          >
            {isMaximized ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => window.api.window.close()}
            className="w-12 h-full flex items-center justify-center hover:bg-red-600 transition-colors"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
