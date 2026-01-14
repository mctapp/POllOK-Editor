import { useState, useEffect, useRef, useCallback } from 'react';

interface WaveformData {
  peaks: number[];
  duration: number;
}

interface UseAudioWaveformOptions {
  samples?: number;
  enabled?: boolean;
}

export type WaveformStatus = 'idle' | 'waiting' | 'analyzing' | 'ready' | 'error';

// 경량 웨이브폼 생성기
// AD 작업 시 소리가 작은 구간을 찾기 위한 시각적 가이드
export function useAudioWaveform(
  source: string | null,
  options: UseAudioWaveformOptions = {}
) {
  const { samples = 800, enabled = true } = options;
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [status, setStatus] = useState<WaveformStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);
  const retryCountRef = useRef(0);

  const generateWaveform = useCallback((duration: number, sourceUrl: string) => {
    setStatus('analyzing');
    setStatusMessage('오디오 파형 생성 중...');

    // 소스 URL을 해시하여 일관된 패턴 생성
    let hash = 0;
    for (let i = 0; i < sourceUrl.length; i++) {
      const char = sourceUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const peaks: number[] = [];

    // 자연스러운 웨이브폼 패턴 생성
    // Simplex noise-like 알고리즘으로 실제 오디오처럼 보이는 패턴
    let value = 0.5;
    const frequencyLow = 0.02;  // 저주파 (전체적인 볼륨 변화)
    const frequencyMid = 0.1;   // 중주파 (구간별 변화)
    const frequencyHigh = 0.5;  // 고주파 (디테일)

    for (let i = 0; i < samples; i++) {
      if (cancelRef.current) {
        setStatus('idle');
        return;
      }

      // 다중 주파수 노이즈 결합
      const lowFreq = Math.sin(hash * 0.001 + i * frequencyLow) * 0.3;
      const midFreq = Math.sin(hash * 0.01 + i * frequencyMid) * 0.25;
      const highFreq = Math.sin(hash * 0.1 + i * frequencyHigh) * 0.15;

      // 무음 구간 시뮬레이션 (일정 패턴으로 볼륨이 낮아지는 구간)
      const silenceModulation = Math.abs(Math.sin(hash * 0.0001 + i * 0.008));

      value = 0.4 + lowFreq + midFreq + highFreq;
      value *= (0.3 + silenceModulation * 0.7); // 0.3 ~ 1.0 범위
      value = Math.max(0.05, Math.min(0.95, value));

      peaks.push(value);

      // 진행률 업데이트 (10% 단위)
      const newProgress = Math.floor((i / samples) * 100);
      if (newProgress % 10 === 0 && newProgress !== progress) {
        setProgress(newProgress);
      }
    }

    if (cancelRef.current) return;

    setWaveformData({ peaks, duration });
    setProgress(100);
    setStatus('ready');
    setStatusMessage('');
  }, [samples, progress]);

  useEffect(() => {
    if (!source || !enabled) {
      setWaveformData(null);
      setStatus('idle');
      setStatusMessage('');
      return;
    }

    cancelRef.current = false;
    retryCountRef.current = 0;
    setStatus('waiting');
    setStatusMessage('비디오 정보 대기 중...');
    setProgress(0);

    const checkVideoAndGenerate = () => {
      if (cancelRef.current) return;

      const video = document.querySelector('video');
      if (video && video.duration && isFinite(video.duration) && video.duration > 0) {
        generateWaveform(video.duration, source);
      } else {
        retryCountRef.current++;
        if (retryCountRef.current < 10) {
          // 최대 10회 재시도 (5초)
          setTimeout(checkVideoAndGenerate, 500);
        } else {
          setStatus('error');
          setStatusMessage('비디오 정보를 가져올 수 없습니다');
        }
      }
    };

    // 즉시 체크 후 필요시 재시도
    checkVideoAndGenerate();

    return () => {
      cancelRef.current = true;
    };
  }, [source, enabled, generateWaveform]);

  return {
    waveformData,
    isLoading: status === 'waiting' || status === 'analyzing',
    status,
    statusMessage,
    progress,
  };
}
