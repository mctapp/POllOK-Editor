import { useRef, useCallback, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useVideoStore, useADStore, useCCStore, useProjectStore, useUIStore, useSettingsStore } from '../../stores';
import { useAudioWaveform } from '../../hooks';
import { Waveform, WaveformLoading, WaveformEmpty, WaveformError } from '../Waveform';

export function TimelinePanel() {
  const { project } = useProjectStore();
  const { source, currentFrame, duration, fps, seekToFrame } = useVideoStore();
  const { descriptions, updateDescription, selectDescription } = useADStore();
  const { captions, updateCaption, selectCaption } = useCCStore();
  const { timelineZoom, zoomIn, zoomOut } = useUIStore();
  const { waveform: waveformSettings, timeline: timelineSettings } = useSettingsStore();

  // 오디오 웨이브폼 분석 (설정에서 샘플 수 가져옴)
  const { waveformData, isLoading: isWaveformLoading, status: waveformStatus, statusMessage, progress: waveformProgress } = useAudioWaveform(source, {
    samples: waveformSettings.samples,
  });

  // 트랙 컨테이너 너비 추적
  const [trackWidth, setTrackWidth] = useState(0);

  const timelineRef = useRef<HTMLDivElement>(null);
  const trackContainerRef = useRef<HTMLDivElement>(null);
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

  // 프레임을 백분율 위치로 변환
  const getPosition = (frame: number) => {
    if (duration === 0) return 0;
    return (frame / duration) * 100;
  };

  // 타임라인 트랙 클릭 핸들러
  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (duration === 0 || dragging) return;

      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      const frame = Math.round(percent * duration);

      seekToFrame(frame);
    },
    [duration, dragging, seekToFrame]
  );

  const handleZoomIn = () => zoomIn();
  const handleZoomOut = () => zoomOut();

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

    // 선택 및 비디오 위치 동기화
    if (type === 'ad') {
      selectDescription(id);
    } else {
      selectCaption(id);
    }
    seekToFrame(tcIn);
  };

  // 카드 클릭 (드래그 없이)
  const handleCardClick = (
    e: React.MouseEvent,
    type: 'ad' | 'cc',
    id: string,
    tcIn: number
  ) => {
    e.stopPropagation();

    if (type === 'ad') {
      selectDescription(id);
    } else {
      selectCaption(id);
    }
    seekToFrame(tcIn);
  };

  // 드래그 중
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !trackContainerRef.current) return;

      const rect = trackContainerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragging.startX;
      const totalWidth = rect.width;
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
    [dragging, duration, fps, updateDescription, updateCaption]
  );

  // 드래그 종료
  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // 전역 드래그 이벤트 리스너
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // 트랙 컨테이너 너비 추적
  useEffect(() => {
    const container = trackContainerRef.current;
    if (!container) return;

    const updateWidth = () => {
      setTrackWidth(container.offsetWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  if (!project) {
    return (
      <div className="h-full bg-dark-surface flex items-center justify-center">
        <span className="text-gray-600 text-sm">프로젝트를 열면 타임라인이 표시됩니다</span>
      </div>
    );
  }

  // 줌 적용된 트랙 너비 (픽셀)
  const trackWidthPercent = 100 * timelineZoom;

  return (
    <div className="h-full bg-dark-surface flex flex-col">
      {/* 타임라인 헤더 */}
      <div className="h-6 border-b border-dark-border flex items-center px-3 justify-between flex-shrink-0">
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
            <span className="text-xs text-gray-500 w-10 text-center">{Math.round(timelineZoom * 100)}%</span>
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

      {/* 타임라인 콘텐츠 - 가로 스크롤 가능 */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
      >
        <div className="h-full flex" style={{ minWidth: `${trackWidthPercent}%` }}>
          {/* 라벨 영역 (고정) */}
          <div className="w-16 flex-shrink-0 bg-dark-bg border-r border-dark-border sticky left-0 z-20">
            <div className="h-1/3 flex items-center justify-center border-b border-dark-border">
              <span className="text-xs text-brand-brown font-medium">AD</span>
            </div>
            <div className="h-1/3 flex items-center justify-center border-b border-dark-border">
              <span className="text-xs text-accent-green font-medium">CC</span>
            </div>
            <div className="h-1/3 flex items-center justify-center">
              <span className="text-xs text-gray-500">Audio</span>
            </div>
          </div>

          {/* 트랙 영역 */}
          <div
            ref={trackContainerRef}
            className="flex-1 relative min-w-0"
            onClick={handleTrackClick}
          >
            {/* AD 트랙 */}
            <div
              className="border-b border-dark-border relative"
              style={{ height: `${timelineSettings.adTrackHeightRatio * 100}%` }}
            >
              {descriptions.map((desc) => (
                <div
                  key={desc.id}
                  className="absolute top-1 bottom-1 bg-brand-brown/60 border border-brand-brown rounded cursor-move hover:bg-brand-brown/80 transition-colors group"
                  style={{
                    left: `${getPosition(desc.tcIn)}%`,
                    width: `${Math.max(0.5, getPosition(desc.tcOut - desc.tcIn))}%`,
                    minWidth: '8px',
                  }}
                  onMouseDown={(e) => handleDragStart(e, 'ad', desc.id, 'move', desc.tcIn, desc.tcOut)}
                  onClick={(e) => handleCardClick(e, 'ad', desc.id, desc.tcIn)}
                  title={desc.text || '화면해설'}
                >
                  {/* 왼쪽 리사이즈 핸들 */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-accent-yellow/50"
                    onMouseDown={(e) => handleDragStart(e, 'ad', desc.id, 'resize-start', desc.tcIn, desc.tcOut)}
                  />
                  {/* 오른쪽 리사이즈 핸들 */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-accent-yellow/50"
                    onMouseDown={(e) => handleDragStart(e, 'ad', desc.id, 'resize-end', desc.tcIn, desc.tcOut)}
                  />
                </div>
              ))}
            </div>

            {/* CC 트랙 */}
            <div
              className="border-b border-dark-border relative"
              style={{ height: `${timelineSettings.ccTrackHeightRatio * 100}%` }}
            >
              {captions.map((caption) => (
                <div
                  key={caption.id}
                  className="absolute top-1 bottom-1 bg-accent-green/60 border border-accent-green rounded cursor-move hover:bg-accent-green/80 transition-colors group"
                  style={{
                    left: `${getPosition(caption.tcIn)}%`,
                    width: `${Math.max(0.5, getPosition(caption.tcOut - caption.tcIn))}%`,
                    minWidth: '8px',
                  }}
                  onMouseDown={(e) => handleDragStart(e, 'cc', caption.id, 'move', caption.tcIn, caption.tcOut)}
                  onClick={(e) => handleCardClick(e, 'cc', caption.id, caption.tcIn)}
                  title={caption.text || '자막'}
                >
                  {/* 왼쪽 리사이즈 핸들 */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-accent-yellow/50"
                    onMouseDown={(e) => handleDragStart(e, 'cc', caption.id, 'resize-start', caption.tcIn, caption.tcOut)}
                  />
                  {/* 오른쪽 리사이즈 핸들 */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-accent-yellow/50"
                    onMouseDown={(e) => handleDragStart(e, 'cc', caption.id, 'resize-end', caption.tcIn, caption.tcOut)}
                  />
                </div>
              ))}
            </div>

            {/* 오디오 파형 영역 */}
            <div
              className="relative overflow-hidden"
              style={{ height: `${timelineSettings.audioTrackHeightRatio * 100}%` }}
            >
              {!source ? (
                <WaveformEmpty message="영상을 불러오면 오디오 파형이 표시됩니다" />
              ) : waveformStatus === 'waiting' || waveformStatus === 'analyzing' ? (
                <WaveformLoading message={statusMessage} progress={waveformProgress} />
              ) : waveformStatus === 'error' ? (
                <WaveformError message={statusMessage} />
              ) : waveformData && waveformData.peaks.length > 0 ? (
                <Waveform
                  peaks={waveformData.peaks}
                  color="#4a5568"
                  progressColor="#d4a574"
                  progress={duration > 0 ? currentFrame / duration : 0}
                />
              ) : (
                <WaveformEmpty />
              )}
            </div>

            {/* 재생 위치 인디케이터 */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent-yellow z-10 pointer-events-none"
              style={{ left: `${getPosition(currentFrame)}%` }}
            >
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent-yellow rotate-45" />
            </div>
          </div>
        </div>
      </div>

      {/* 타임 룰러 */}
      <div className="h-5 border-t border-dark-border bg-dark-bg flex items-center overflow-hidden flex-shrink-0">
        <div className="w-16 border-r border-dark-border flex-shrink-0" />
        <div
          className="flex justify-between px-2 text-xs text-gray-600 font-timecode"
          style={{ width: `${trackWidthPercent}%`, minWidth: 'calc(100% - 64px)' }}
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
