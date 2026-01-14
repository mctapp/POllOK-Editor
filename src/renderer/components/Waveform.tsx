import { useMemo, useRef, useEffect } from 'react';

interface WaveformProps {
  peaks: number[];
  width: number;
  height: number;
  color?: string;
  backgroundColor?: string;
  progress?: number; // 0 ~ 1 (현재 재생 위치)
  progressColor?: string;
}

export function Waveform({
  peaks,
  width,
  height,
  color = '#4a5568',
  backgroundColor = 'transparent',
  progress = 0,
  progressColor = '#d4a574',
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 캔버스에 웨이브폼 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 고해상도 디스플레이 지원
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 배경 지우기
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const barWidth = width / peaks.length;
    const centerY = height / 2;
    const maxBarHeight = height * 0.9; // 90% 높이 사용

    // 웨이브폼 그리기
    peaks.forEach((peak, index) => {
      const x = index * barWidth;
      const barHeight = Math.max(1, peak * maxBarHeight);
      const isBeforeProgress = index / peaks.length <= progress;

      ctx.fillStyle = isBeforeProgress ? progressColor : color;

      // 중앙에서 위아래로 그리기
      ctx.fillRect(
        x,
        centerY - barHeight / 2,
        Math.max(1, barWidth - 0.5),
        barHeight
      );
    });
  }, [peaks, width, height, color, backgroundColor, progress, progressColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
}

// 로딩 상태 컴포넌트
interface WaveformLoadingProps {
  width?: number;
  height: number;
  message?: string;
  progress?: number;
}

export function WaveformLoading({ height, message, progress }: WaveformLoadingProps) {
  return (
    <div
      style={{ height }}
      className="w-full flex items-center justify-center bg-dark-surface/30"
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-3 bg-gray-600 animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-5 bg-gray-600 animate-pulse" style={{ animationDelay: '100ms' }} />
          <div className="w-1 h-4 bg-gray-600 animate-pulse" style={{ animationDelay: '200ms' }} />
          <div className="w-1 h-6 bg-gray-600 animate-pulse" style={{ animationDelay: '300ms' }} />
          <div className="w-1 h-3 bg-gray-600 animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
        <span className="text-xs text-gray-500">
          {message || '오디오 파형 생성 중...'}
          {progress !== undefined && progress > 0 && progress < 100 && ` (${progress}%)`}
        </span>
      </div>
    </div>
  );
}

// 에러 상태 컴포넌트
interface WaveformErrorProps {
  width?: number;
  height: number;
  message?: string;
}

export function WaveformError({ height, message }: WaveformErrorProps) {
  return (
    <div
      style={{ height }}
      className="w-full flex items-center justify-center bg-dark-surface/30"
    >
      <span className="text-xs text-gray-500">{message || '웨이브폼을 불러올 수 없습니다'}</span>
    </div>
  );
}

// 빈 상태 컴포넌트
interface WaveformEmptyProps {
  width?: number;
  height: number;
  message?: string;
}

export function WaveformEmpty({ height, message }: WaveformEmptyProps) {
  return (
    <div
      style={{ height }}
      className="w-full flex items-center justify-center bg-dark-surface/20"
    >
      <span className="text-xs text-gray-600">{message || '영상을 불러오면 오디오 파형이 표시됩니다'}</span>
    </div>
  );
}
