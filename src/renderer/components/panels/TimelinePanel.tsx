import { useState, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useVideoStore, useADStore, useCCStore, useProjectStore } from '../../stores';

export function TimelinePanel() {
  const { project } = useProjectStore();
  const { currentFrame, duration, fps, setCurrentFrame } = useVideoStore();
  const { descriptions, updateDescription, selectDescription } = useADStore();
  const { captions, updateCaption, selectCaption } = useCCStore();

  const [zoom, setZoom] = useState(1); // 1 = 100%, 2 = 200%, etc.
  const [scrollLeft, setScrollLeft] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    type: 'ad' | 'cc';
    id: string;
    mode: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    originalTcIn: number;
    originalTcOut: number;
  } | null>(null);

  const formatTime = (frame: number) => {
    const totalSeconds = frame / fps;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPositionPercent = (frame: number) => {
    if (duration === 0) return 0;
    return (frame / duration) * 100 * zoom;
  };

  const syncVideoPosition = useCallback(
    (frame: number) => {
      setCurrentFrame(frame);
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = frame / fps;
      }
    },
    [fps, setCurrentFrame]
  );

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0 || dragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const totalWidth = rect.width * zoom;
    const percent = x / totalWidth;
    const frame = Math.round(percent * duration);
    syncVideoPosition(Math.max(0, Math.min(duration, frame)));
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z * 1.5, 10));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z / 1.5, 0.5));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  // 드래그 시작
  const handleDragStart = (
    e: React.MouseEvent,
    type: 'ad' | 'cc',
    id: string,
    mode: 'move' | 'resize-start' | 'resize-end',
    tcIn: number,
    tcOut: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging({
      type,
      id,
      mode,
      startX: e.clientX,
      originalTcIn: tcIn,
      originalTcOut: tcOut,
    });

    if (type === 'ad') {
      selectDescription(id);
    } else {
      selectCaption(id);
    }
  };

  // 드래그 중
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragging.startX;
      const totalWidth = (rect.width - 64) * zoom; // 64px = 라벨 영역
      const deltaFrames = Math.round((deltaX / totalWidth) * duration);

      if (dragging.type === 'ad') {
        if (dragging.mode === 'move') {
          const newTcIn = Math.max(0, dragging.originalTcIn + deltaFrames);
          const newTcOut = newTcIn + (dragging.originalTcOut - dragging.originalTcIn);
          if (newTcOut <= duration) {
            updateDescription(dragging.id, { tcIn: newTcIn, tcOut: newTcOut });
          }
        } else if (dragging.mode === 'resize-start') {
          const newTcIn = Math.max(0, Math.min(dragging.originalTcOut - fps, dragging.originalTcIn + deltaFrames));
          updateDescription(dragging.id, { tcIn: newTcIn });
        } else if (dragging.mode === 'resize-end') {
          const newTcOut = Math.min(duration, Math.max(dragging.originalTcIn + fps, dragging.originalTcOut + deltaFrames));
          updateDescription(dragging.id, { tcOut: newTcOut });
        }
      } else {
        if (dragging.mode === 'move') {
          const newTcIn = Math.max(0, dragging.originalTcIn + deltaFrames);
          const newTcOut = newTcIn + (dragging.originalTcOut - dragging.originalTcIn);
          if (newTcOut <= duration) {
            updateCaption(dragging.id, { tcIn: newTcIn, tcOut: newTcOut });
          }
        } else if (dragging.mode === 'resize-start') {
          const newTcIn = Math.max(0, Math.min(dragging.originalTcOut - fps, dragging.originalTcIn + deltaFrames));
          updateCaption(dragging.id, { tcIn: newTcIn });
        } else if (dragging.mode === 'resize-end') {
          const newTcOut = Math.min(duration, Math.max(dragging.originalTcIn + fps, dragging.originalTcOut + deltaFrames));
          updateCaption(dragging.id, { tcOut: newTcOut });
        }
      }
    },
    [dragging, duration, fps, zoom, updateDescription, updateCaption]
  );

  // 드래그 종료
  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // 전역 이벤트 리스너
  useState(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  });

  // 드래그 이벤트 리스너
  if (dragging) {
    window.onmousemove = handleMouseMove;
    window.onmouseup = handleMouseUp;
  } else {
    window.onmousemove = null;
    window.onmouseup = null;
  }

  if (!project) {
    return (
      <div className="h-full bg-dark-surface flex items-center justify-center">
        <span className="text-gray-600 text-sm">프로젝트를 열면 타임라인이 표시됩니다</span>
      </div>
    );
  }

  const timelineWidth = `${100 * zoom}%`;

  return (
    <div className="h-full bg-dark-surface flex flex-col">
      {/* 타임라인 헤더 */}
      <div className="h-6 border-b border-dark-border flex items-center px-3 justify-between">
        <span className="text-xs text-gray-500">Timeline</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-timecode">
            {formatTime(currentFrame)} / {formatTime(duration)}
          </span>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={handleZoomOut}
              className="p-1 text-gray-500 hover:text-white transition-colors"
              title="축소"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 text-gray-500 hover:text-white transition-colors"
              title="확대"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 타임라인 콘텐츠 */}
      <div
        ref={timelineRef}
        className="flex-1 relative overflow-x-auto overflow-y-hidden"
        onScroll={handleScroll}
        onClick={handleTimelineClick}
      >
        <div style={{ width: timelineWidth, minWidth: '100%' }} className="h-full relative">
          {/* AD 트랙 */}
          <div className="h-1/3 border-b border-dark-border relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-dark-bg flex items-center justify-center border-r border-dark-border z-10 sticky">
              <span className="text-xs text-gray-500">AD</span>
            </div>
            <div className="ml-16 h-full relative">
              {descriptions.map((desc) => (
                <div
                  key={desc.id}
                  className="absolute top-1 bottom-1 bg-blue-600/60 border border-blue-500 rounded cursor-move hover:bg-blue-600/80 transition-colors group"
                  style={{
                    left: `${getPositionPercent(desc.tcIn) / zoom}%`,
                    width: `${getPositionPercent(desc.tcOut - desc.tcIn) / zoom}%`,
                    minWidth: '8px',
                  }}
                  onMouseDown={(e) => handleDragStart(e, 'ad', desc.id, 'move', desc.tcIn, desc.tcOut)}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectDescription(desc.id);
                    syncVideoPosition(desc.tcIn);
                  }}
                  title={desc.text || '화면해설'}
                >
                  {/* 왼쪽 리사이즈 핸들 */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-blue-400/50"
                    onMouseDown={(e) => handleDragStart(e, 'ad', desc.id, 'resize-start', desc.tcIn, desc.tcOut)}
                  />
                  {/* 오른쪽 리사이즈 핸들 */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-blue-400/50"
                    onMouseDown={(e) => handleDragStart(e, 'ad', desc.id, 'resize-end', desc.tcIn, desc.tcOut)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* CC 트랙 */}
          <div className="h-1/3 border-b border-dark-border relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-dark-bg flex items-center justify-center border-r border-dark-border z-10">
              <span className="text-xs text-gray-500">CC</span>
            </div>
            <div className="ml-16 h-full relative">
              {captions.map((caption) => (
                <div
                  key={caption.id}
                  className="absolute top-1 bottom-1 bg-green-600/60 border border-green-500 rounded cursor-move hover:bg-green-600/80 transition-colors group"
                  style={{
                    left: `${getPositionPercent(caption.tcIn) / zoom}%`,
                    width: `${getPositionPercent(caption.tcOut - caption.tcIn) / zoom}%`,
                    minWidth: '8px',
                  }}
                  onMouseDown={(e) => handleDragStart(e, 'cc', caption.id, 'move', caption.tcIn, caption.tcOut)}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectCaption(caption.id);
                    syncVideoPosition(caption.tcIn);
                  }}
                  title={caption.text || '자막'}
                >
                  {/* 왼쪽 리사이즈 핸들 */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-green-400/50"
                    onMouseDown={(e) => handleDragStart(e, 'cc', caption.id, 'resize-start', caption.tcIn, caption.tcOut)}
                  />
                  {/* 오른쪽 리사이즈 핸들 */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-green-400/50"
                    onMouseDown={(e) => handleDragStart(e, 'cc', caption.id, 'resize-end', caption.tcIn, caption.tcOut)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 파형 영역 (플레이스홀더) */}
          <div className="h-1/3 relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-dark-bg flex items-center justify-center border-r border-dark-border z-10">
              <span className="text-xs text-gray-500">Audio</span>
            </div>
            <div className="ml-16 h-full flex items-center justify-center">
              <span className="text-xs text-gray-600">오디오 파형 (추후 구현)</span>
            </div>
          </div>

          {/* 재생 위치 인디케이터 */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
            style={{ left: `calc(64px + ${getPositionPercent(currentFrame) / zoom}%)` }}
          >
            <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
          </div>
        </div>
      </div>

      {/* 타임 룰러 */}
      <div className="h-5 border-t border-dark-border bg-dark-bg flex items-center overflow-hidden">
        <div className="w-16 border-r border-dark-border flex-shrink-0" />
        <div
          className="flex justify-between px-2 text-xs text-gray-600 font-timecode"
          style={{ width: timelineWidth, minWidth: 'calc(100% - 64px)' }}
        >
          <span>{formatTime(0)}</span>
          <span>{formatTime(Math.floor(duration / 4))}</span>
          <span>{formatTime(Math.floor(duration / 2))}</span>
          <span>{formatTime(Math.floor((duration * 3) / 4))}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
