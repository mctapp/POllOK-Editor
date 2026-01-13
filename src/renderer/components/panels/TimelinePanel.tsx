import { useVideoStore, useADStore, useCCStore, useProjectStore } from '../../stores';

export function TimelinePanel() {
  const { project } = useProjectStore();
  const { currentFrame, duration, fps, setCurrentFrame } = useVideoStore();
  const descriptions = useADStore((state) => state.descriptions);
  const captions = useCCStore((state) => state.captions);

  const formatTime = (frame: number) => {
    const totalSeconds = frame / fps;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPositionPercent = (frame: number) => {
    if (duration === 0) return 0;
    return (frame / duration) * 100;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const frame = Math.round(percent * duration);
    setCurrentFrame(Math.max(0, Math.min(duration, frame)));
  };

  if (!project) {
    return (
      <div className="h-full bg-dark-surface flex items-center justify-center">
        <span className="text-gray-600 text-sm">프로젝트를 열면 타임라인이 표시됩니다</span>
      </div>
    );
  }

  return (
    <div className="h-full bg-dark-surface flex flex-col">
      {/* 타임라인 헤더 */}
      <div className="h-6 border-b border-dark-border flex items-center px-3 justify-between">
        <span className="text-xs text-gray-500">Timeline</span>
        <span className="text-xs text-gray-500 font-timecode">
          {formatTime(currentFrame)} / {formatTime(duration)}
        </span>
      </div>

      {/* 타임라인 콘텐츠 */}
      <div className="flex-1 relative overflow-hidden" onClick={handleTimelineClick}>
        {/* AD 트랙 */}
        <div className="h-1/3 border-b border-dark-border relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-dark-bg flex items-center justify-center border-r border-dark-border z-10">
            <span className="text-xs text-gray-500">AD</span>
          </div>
          <div className="ml-16 h-full relative">
            {descriptions.map((desc) => (
              <div
                key={desc.id}
                className="absolute top-1 bottom-1 bg-blue-600/60 border border-blue-500 rounded cursor-pointer hover:bg-blue-600/80 transition-colors"
                style={{
                  left: `${getPositionPercent(desc.tcIn)}%`,
                  width: `${getPositionPercent(desc.tcOut - desc.tcIn)}%`,
                  minWidth: '4px',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentFrame(desc.tcIn);
                }}
                title={desc.text || '화면해설'}
              />
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
                className="absolute top-1 bottom-1 bg-green-600/60 border border-green-500 rounded cursor-pointer hover:bg-green-600/80 transition-colors"
                style={{
                  left: `${getPositionPercent(caption.tcIn)}%`,
                  width: `${getPositionPercent(caption.tcOut - caption.tcIn)}%`,
                  minWidth: '4px',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentFrame(caption.tcIn);
                }}
                title={caption.text || '자막'}
              />
            ))}
          </div>
        </div>

        {/* 파형 영역 (플레이스홀더) */}
        <div className="h-1/3 relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-dark-bg flex items-center justify-center border-r border-dark-border z-10">
            <span className="text-xs text-gray-500">Audio</span>
          </div>
          <div className="ml-16 h-full flex items-center justify-center">
            <span className="text-xs text-gray-600">영상을 불러오면 파형이 표시됩니다</span>
          </div>
        </div>

        {/* 재생 위치 인디케이터 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
          style={{ left: `calc(64px + ${getPositionPercent(currentFrame)}% * (100% - 64px) / 100%)` }}
        >
          <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
        </div>
      </div>

      {/* 타임 룰러 */}
      <div className="h-5 border-t border-dark-border bg-dark-bg flex items-center">
        <div className="w-16 border-r border-dark-border" />
        <div className="flex-1 flex justify-between px-2 text-xs text-gray-600 font-timecode">
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
