import { HardDrive } from 'lucide-react';
import { useProjectStore, useADStore, useCCStore, useVideoStore } from '../../stores';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function StatusBar() {
  const { project, isDirty, lastSaved } = useProjectStore();
  const descriptions = useADStore((state) => state.descriptions);
  const captions = useCCStore((state) => state.captions);
  const { fps, currentFrame } = useVideoStore();

  const formatLastSaved = () => {
    if (!lastSaved) return '저장된 적 없음';
    return formatDistanceToNow(lastSaved, { addSuffix: true, locale: ko });
  };

  const formatTimecode = (frame: number) => {
    const totalSeconds = frame / fps;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const frames = frame % fps;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="h-6 bg-dark-surface border-t border-dark-border flex items-center justify-between px-3 text-xs text-gray-400 select-none">
      {/* 왼쪽: 상태 */}
      <div className="flex items-center gap-4">
        <span className={isDirty ? 'text-yellow-400' : 'text-green-400'}>
          {!project ? 'Ready' : isDirty ? '변경됨' : '저장됨'}
        </span>
        {project && (
          <>
            <span className="text-gray-600">|</span>
            <span>{formatLastSaved()}</span>
          </>
        )}
      </div>

      {/* 가운데: 현재 위치 + 통계 */}
      <div className="flex items-center gap-4">
        <span className="font-timecode">{formatTimecode(currentFrame)}</span>
        <span className="text-gray-600">|</span>
        <span>AD: {descriptions.length}개</span>
        <span>CC: {captions.length}개</span>
      </div>

      {/* 오른쪽: FPS + 연결 상태 */}
      <div className="flex items-center gap-4">
        <span>{fps} fps</span>
        <span className="text-gray-600">|</span>
        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5" />
          <span>오프라인</span>
        </div>
      </div>
    </div>
  );
}
