import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { useVideoStore, useProjectStore } from '../../stores';
import { PLAYBACK_RATES } from '../../../shared/constants';

export function VideoPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  const { project, setVideo } = useProjectStore();
  const {
    source,
    isPlaying,
    currentFrame,
    duration,
    fps,
    playbackRate,
    volume,
    isMuted,
    inPoint,
    outPoint,
    setSource,
    setDuration,
    setFps,
    setResolution,
    setCurrentFrame,
    setIsPlaying,
    togglePlay,
    setPlaybackRate,
    setVolume,
    toggleMute,
    setInPoint,
    setOutPoint,
  } = useVideoStore();

  // 타임코드 포맷
  const formatTimecode = useCallback(
    (frame: number) => {
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
    },
    [fps]
  );

  // 영상 로드
  const handleLoadVideo = async () => {
    const path = await window.api.file.selectVideo();
    if (path) {
      setVideoError(null); // 에러 상태 초기화
      const fileUrl = window.api.utils.getFileUrl(path);
      setSource(fileUrl);

      // 프로젝트에 영상 정보 저장 (메타데이터는 loadedmetadata에서 설정)
      if (project) {
        const filename = path.split('/').pop() || path.split('\\').pop() || 'video';
        setVideo({
          path,
          filename,
          hash: '',
          duration: 0,
          durationFrames: 0,
          fps: 24,
          width: 0,
          height: 0,
          resolution: '',
        });
      }
    }
  };

  // 비디오 에러 처리
  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const error = video.error;
    let message = '영상을 재생할 수 없습니다.';

    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          message = '영상 로드가 중단되었습니다.';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          message = '네트워크 오류로 영상을 로드할 수 없습니다.';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          message = '영상 디코딩 오류가 발생했습니다.';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          message =
            '지원하지 않는 영상 형식입니다.\n\nMP4 (H.264) 또는 WebM 형식으로 변환 후 다시 시도해 주세요.\n\nFFmpeg 변환 예시:\nffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4';
          break;
      }
    }

    setVideoError(message);
    setSource(null);
    setIsPlaying(false);
  }, [setSource, setIsPlaying]);

  // 메타데이터 로드
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const videoDuration = video.duration;
    const detectedFps = 24; // 기본값, 실제로는 영상에서 감지 필요
    const durationFrames = Math.floor(videoDuration * detectedFps);

    setDuration(durationFrames);
    setFps(detectedFps);
    setResolution(video.videoWidth, video.videoHeight);

    // 프로젝트 영상 정보 업데이트
    if (project?.video) {
      setVideo({
        ...project.video,
        duration: videoDuration,
        durationFrames,
        fps: detectedFps,
        width: video.videoWidth,
        height: video.videoHeight,
        resolution: `${video.videoWidth}x${video.videoHeight}`,
      });
    }
  }, [project?.video, setDuration, setFps, setResolution, setVideo]);

  // 재생 시간 업데이트
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const currentTime = video.currentTime;
    const frame = Math.floor(currentTime * fps);
    setCurrentFrame(frame);

    // Out 포인트 체크 (구간 반복)
    if (outPoint !== null && frame >= outPoint) {
      if (inPoint !== null) {
        video.currentTime = inPoint / fps;
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  }, [fps, inPoint, outPoint, setCurrentFrame, setIsPlaying]);

  // 재생/일시정지 동기화
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, source, setIsPlaying]);

  // 재생 속도 동기화
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  // 볼륨 동기화
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // 프레임 탐색
  const seekToFrame = useCallback(
    (frame: number) => {
      const video = videoRef.current;
      if (!video) return;

      const clampedFrame = Math.max(0, Math.min(duration, frame));
      video.currentTime = clampedFrame / fps;
      setCurrentFrame(clampedFrame);
    },
    [duration, fps, setCurrentFrame]
  );

  // 프레임 이동
  const handleSeekFrames = useCallback(
    (delta: number) => {
      seekToFrame(currentFrame + delta);
    },
    [currentFrame, seekToFrame]
  );

  // 초 이동
  const handleSeekSeconds = useCallback(
    (seconds: number) => {
      const frames = Math.round(seconds * fps);
      handleSeekFrames(frames);
    },
    [fps, handleSeekFrames]
  );

  // 프로그레스 바 위치 계산
  const getFrameFromProgressEvent = useCallback(
    (clientX: number) => {
      const rect = progressRef.current?.getBoundingClientRect();
      if (!rect || duration === 0) return null;
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const percent = x / rect.width;
      return Math.round(percent * duration);
    },
    [duration]
  );

  // 프로그레스 바 클릭/드래그 시작
  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const frame = getFrameFromProgressEvent(e.clientX);
      if (frame !== null) {
        seekToFrame(frame);
        setIsDraggingProgress(true);
      }
    },
    [getFrameFromProgressEvent, seekToFrame]
  );

  // 프로그레스 바 드래그 중
  useEffect(() => {
    if (!isDraggingProgress) return;

    const handleMouseMove = (e: MouseEvent) => {
      const frame = getFrameFromProgressEvent(e.clientX);
      if (frame !== null) {
        seekToFrame(frame);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingProgress(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingProgress, getFrameFromProgressEvent, seekToFrame]);

  // 비디오 클릭 시 재생/일시정지
  const handleVideoClick = useCallback(() => {
    togglePlay();
  }, [togglePlay]);

  // 재생 종료
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    if (inPoint !== null) {
      seekToFrame(inPoint);
    }
  }, [inPoint, seekToFrame, setIsPlaying]);

  const progress = duration > 0 ? (currentFrame / duration) * 100 : 0;
  const inPointPercent = inPoint !== null && duration > 0 ? (inPoint / duration) * 100 : null;
  const outPointPercent = outPoint !== null && duration > 0 ? (outPoint / duration) * 100 : null;

  return (
    <div className="h-full bg-black flex flex-col">
      {/* 비디오 영역 */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black">
        {source ? (
          <video
            ref={videoRef}
            src={source}
            className="max-w-full max-h-full object-contain"
            onClick={handleVideoClick}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={handleVideoError}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="text-center max-w-md px-4">
            {videoError ? (
              <>
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-yellow-400 text-sm mb-2 font-medium">영상 로드 실패</p>
                <p className="text-gray-400 text-xs mb-4 whitespace-pre-line">{videoError}</p>
                <button onClick={handleLoadVideo} className="btn-primary text-sm">
                  다른 영상 선택
                </button>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 text-sm mb-2">
                  {project ? '영상 파일을 불러오세요' : '프로젝트를 생성하거나 열어주세요'}
                </p>
                <p className="text-gray-600 text-xs mb-4">
                  지원 형식: MP4 (H.264), WebM
                </p>
                {project && (
                  <button onClick={handleLoadVideo} className="btn-primary text-sm">
                    영상 불러오기
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 프로그레스 바 */}
      <div
        ref={progressRef}
        className="h-2 bg-dark-surface cursor-pointer relative select-none"
        onMouseDown={handleProgressMouseDown}
      >
        {/* In/Out 포인트 영역 표시 */}
        {inPointPercent !== null && outPointPercent !== null && (
          <div
            className="absolute top-0 bottom-0 bg-primary-900/50"
            style={{
              left: `${inPointPercent}%`,
              width: `${outPointPercent - inPointPercent}%`,
            }}
          />
        )}

        {/* 진행 바 */}
        <div
          className="h-full bg-primary-500 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />

        {/* In 포인트 마커 */}
        {inPointPercent !== null && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-yellow-500"
            style={{ left: `${inPointPercent}%` }}
          />
        )}

        {/* Out 포인트 마커 */}
        {outPointPercent !== null && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-yellow-500"
            style={{ left: `${outPointPercent}%` }}
          />
        )}
      </div>

      {/* 컨트롤 영역 */}
      <div className="h-24 bg-dark-surface border-t border-dark-border p-3">
        {/* 재생 컨트롤 */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {/* 10초 뒤로 */}
          <button
            onClick={() => handleSeekSeconds(-10)}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="10초 뒤로"
            disabled={!source}
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* 1프레임 뒤로 */}
          <button
            onClick={() => handleSeekFrames(-1)}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="1프레임 뒤로 (←)"
            disabled={!source}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* 재생/일시정지 */}
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:hover:bg-primary-600"
            title={isPlaying ? '일시정지 (Space)' : '재생 (Space)'}
            disabled={!source}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          {/* 1프레임 앞으로 */}
          <button
            onClick={() => handleSeekFrames(1)}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="1프레임 앞으로 (→)"
            disabled={!source}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* 10초 앞으로 */}
          <button
            onClick={() => handleSeekSeconds(10)}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="10초 앞으로"
            disabled={!source}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* 하단 컨트롤 */}
        <div className="flex items-center justify-between">
          {/* 타임코드 */}
          <div className="font-timecode text-sm text-gray-300 w-36">
            <span>{formatTimecode(currentFrame)}</span>
            <span className="text-gray-600 mx-1">/</span>
            <span className="text-gray-500">{formatTimecode(duration)}</span>
          </div>

          {/* 재생 속도 + In/Out */}
          <div className="flex items-center gap-3">
            {/* In/Out 버튼 */}
            <div className="flex items-center gap-1">
              <button
                onClick={setInPoint}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  inPoint !== null
                    ? 'bg-yellow-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
                title="In 포인트 설정 (I)"
                disabled={!source}
              >
                I
              </button>
              <button
                onClick={setOutPoint}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  outPoint !== null
                    ? 'bg-yellow-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
                title="Out 포인트 설정 (O)"
                disabled={!source}
              >
                O
              </button>
            </div>

            <div className="w-px h-4 bg-gray-600" />

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
                  disabled={!source}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* 볼륨 */}
          <div className="flex items-center gap-2 w-32 justify-end">
            <button
              onClick={toggleMute}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={!source}
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
              disabled={!source}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
