import { useState, useEffect, useRef, useCallback } from 'react';
import {
  WaveformAnalyzerFactory,
  type WaveformAnalyzer,
  type WaveformData,
  type AnalyzerStatus,
  type AnalyzerType,
} from '../lib/waveform';
import type { WaveformCache } from '../../shared/types';

export type { WaveformData, AnalyzerStatus, AnalyzerType };

// 기존 WaveformStatus와 호환성 유지
export type WaveformStatus = 'idle' | 'waiting' | 'analyzing' | 'ready' | 'error';

interface UseAudioWaveformOptions {
  /** 샘플 수 (웨이브폼 해상도) */
  samples?: number;
  /** 활성화 여부 */
  enabled?: boolean;
  /** 분석기 타입 */
  analyzerType?: AnalyzerType;
  /** 캐시된 웨이브폼 데이터 */
  cachedData?: WaveformCache | null;
  /** 비디오 경로 (캐시 유효성 검사용) */
  videoPath?: string | null;
  /** 웨이브폼 캐시 저장 콜백 */
  onCacheUpdate?: (cache: WaveformCache) => void;
}

/**
 * 오디오 웨이브폼 분석 훅
 *
 * 비디오 소스에서 오디오 웨이브폼을 추출합니다.
 * 분석기 타입을 변경하여 다양한 분석 방식을 사용할 수 있습니다.
 * 캐시된 데이터가 유효하면 분석을 건너뜁니다.
 *
 * @example
 * ```tsx
 * const { waveformData, status, statusMessage } = useAudioWaveform(videoSource, {
 *   samples: 1000,
 *   analyzerType: 'highspeed', // 'placeholder' | 'highspeed'
 *   cachedData: project.waveformCache,
 *   videoPath: project.video?.path,
 *   onCacheUpdate: (cache) => setWaveformCache(cache),
 * });
 * ```
 */
export function useAudioWaveform(source: string | null, options: UseAudioWaveformOptions = {}) {
  const {
    samples = 800,
    enabled = true,
    analyzerType = 'highspeed',
    cachedData,
    videoPath,
    onCacheUpdate,
  } = options;

  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [status, setStatus] = useState<WaveformStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const analyzerRef = useRef<WaveformAnalyzer | null>(null);
  const usedCacheRef = useRef(false);

  // 캐시 유효성 검사
  const isCacheValid = useCallback(() => {
    if (!cachedData || !videoPath) return false;
    // 비디오 경로와 샘플 수가 일치해야 캐시 유효
    return cachedData.videoPath === videoPath && cachedData.samples === samples;
  }, [cachedData, videoPath, samples]);

  // 상태 변환 (AnalyzerStatus -> WaveformStatus)
  const mapStatus = useCallback((analyzerStatus: AnalyzerStatus): WaveformStatus => {
    switch (analyzerStatus) {
      case 'idle':
        return 'idle';
      case 'initializing':
        return 'waiting';
      case 'analyzing':
        return 'analyzing';
      case 'complete':
        return 'ready';
      case 'error':
      case 'cancelled':
        return 'error';
      default:
        return 'idle';
    }
  }, []);

  // 분석 실행
  const analyze = useCallback(async () => {
    if (!source || !enabled) {
      setWaveformData(null);
      setStatus('idle');
      setStatusMessage('');
      return;
    }

    // 캐시가 유효하면 분석 건너뛰기
    if (isCacheValid() && cachedData && !usedCacheRef.current) {
      usedCacheRef.current = true;
      setWaveformData({
        peaks: cachedData.peaks,
        duration: cachedData.duration,
      });
      setStatus('ready');
      setStatusMessage('');
      setProgress(100);
      return;
    }

    // 이전 분석기 정리
    if (analyzerRef.current) {
      analyzerRef.current.cancel();
      analyzerRef.current.dispose();
    }

    // 새 분석기 생성
    const analyzer = WaveformAnalyzerFactory.create({ type: analyzerType });
    analyzerRef.current = analyzer;

    setStatus('waiting');
    setStatusMessage('분석 준비 중...');
    setProgress(0);

    const result = await analyzer.analyze(source, {
      samples,
      onProgress: (prog, msg) => {
        setProgress(prog);
        setStatusMessage(msg);
      },
      onStatusChange: (newStatus) => {
        setStatus(mapStatus(newStatus));
      },
    });

    if (result.success && result.data) {
      setWaveformData(result.data);
      setStatus('ready');
      setStatusMessage('');

      // 캐시 업데이트
      if (onCacheUpdate && videoPath) {
        onCacheUpdate({
          peaks: result.data.peaks,
          duration: result.data.duration,
          samples,
          videoPath,
          analyzedAt: new Date().toISOString(),
        });
      }
    } else if (result.error !== '취소됨') {
      setStatus('error');
      setStatusMessage(result.error || '분석 실패');
    }
  }, [
    source,
    enabled,
    samples,
    analyzerType,
    mapStatus,
    isCacheValid,
    cachedData,
    videoPath,
    onCacheUpdate,
  ]);

  // source 또는 옵션 변경 시 분석 실행
  useEffect(() => {
    usedCacheRef.current = false;
    analyze();

    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.cancel();
        analyzerRef.current.dispose();
        analyzerRef.current = null;
      }
    };
  }, [analyze]);

  return {
    waveformData,
    isLoading: status === 'waiting' || status === 'analyzing',
    status,
    statusMessage,
    progress,
  };
}
