import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useVideoStore, useProjectStore } from '../../stores';
import { PLAYBACK_RATES } from '../../../shared/constants';

export function VideoPanel() {
  const { project } = useProjectStore();
  const {
    source,
    isPlaying,
    currentFrame,
    duration,
    fps,
    playbackRate,
    volume,
    isMuted,
    togglePlay,
    seekFrames,
    seekSeconds,
    setPlaybackRate,
    setVolume,
    toggleMute,
  } = useVideoStore();

  const formatTimecode = (frame: number) => {
    const totalSeconds = frame / fps;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const frames = Math.floor(frame % fps);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames
      .toString()
      .padStart(2, '0')}`;
  };

  const handleLoadVideo = async () => {
    const path = await window.api.file.selectVideo();
    if (path) {
      useVideoStore.getState().setSource(path);
      // TODO: 영상 메타데이터 로드
    }
  };

  const progress = duration > 0 ? (currentFrame / duration) * 100 : 0;

  return (
    <div className="h-full bg-black flex flex-col">
      {/* 비디오 영역 */}
      <div className="flex-1 flex items-center justify-center relative">
        {source ? (
          <video
            src={`file://${source}`}
            className="max-w-full max-h-full"
            onClick={togglePlay}
          />
        ) : (
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-4">
              {project ? '영상 파일을 불러오세요' : '프로젝트를 생성하거나 열어주세요'}
            </p>
            {project && (
              <button onClick={handleLoadVideo} className="btn-primary text-sm">
                영상 불러오기
              </button>
            )}
          </div>
        )}
      </div>

      {/* 프로그레스 바 */}
      <div className="h-1 bg-dark-surface">
        <div
          className="h-full bg-primary-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 컨트롤 영역 */}
      <div className="h-24 bg-dark-surface border-t border-dark-border p-3">
        {/* 재생 컨트롤 */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {/* 10초 뒤로 */}
          <button
            onClick={() => seekSeconds(-10)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="10초 뒤로"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* 1프레임 뒤로 */}
          <button
            onClick={() => seekFrames(-1)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="1프레임 뒤로 (←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* 재생/일시정지 */}
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center transition-colors"
            title={isPlaying ? '일시정지 (Space)' : '재생 (Space)'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          {/* 1프레임 앞으로 */}
          <button
            onClick={() => seekFrames(1)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="1프레임 앞으로 (→)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* 10초 앞으로 */}
          <button
            onClick={() => seekSeconds(10)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="10초 앞으로"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* 하단 컨트롤 */}
        <div className="flex items-center justify-between">
          {/* 타임코드 */}
          <div className="font-timecode text-sm text-gray-300 w-32">
            {formatTimecode(currentFrame)}
          </div>

          {/* 재생 속도 */}
          <div className="flex items-center gap-1">
            {PLAYBACK_RATES.filter((r) => r >= 0.5).map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  playbackRate === rate
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* 볼륨 */}
          <div className="flex items-center gap-2 w-32 justify-end">
            <button
              onClick={toggleMute}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
