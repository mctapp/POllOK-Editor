import { useState, useEffect, useRef } from 'react';

interface WaveformData {
  peaks: number[];
  duration: number;
}

interface UseAudioWaveformOptions {
  samples?: number;
  enabled?: boolean;
}

// 간단한 웨이브폼 생성 (실제 오디오 분석 대신 더미 데이터 또는 비활성화)
// 실제 오디오 분석은 메모리 문제로 인해 큰 파일에서 크래시를 일으킴
// 향후 Web Worker + 청크 처리로 개선 필요
export function useAudioWaveform(
  source: string | null,
  options: UseAudioWaveformOptions = {}
) {
  const { samples = 800, enabled = true } = options;
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!source || !enabled) {
      setWaveformData(null);
      setIsLoading(false);
      return;
    }

    cancelRef.current = false;
    setIsLoading(true);
    setError(null);

    // 비디오 요소에서 duration 가져오기
    const video = document.querySelector('video');
    if (!video || !video.duration || !isFinite(video.duration)) {
      // 비디오가 아직 로드되지 않았으면 잠시 대기 후 재시도
      const timer = setTimeout(() => {
        if (cancelRef.current) return;

        const v = document.querySelector('video');
        if (v && v.duration && isFinite(v.duration)) {
          generatePlaceholderWaveform(v.duration);
        } else {
          setIsLoading(false);
          setError('비디오 정보를 가져올 수 없습니다');
        }
      }, 1000);

      return () => {
        cancelRef.current = true;
        clearTimeout(timer);
      };
    }

    generatePlaceholderWaveform(video.duration);

    function generatePlaceholderWaveform(duration: number) {
      // 실제 오디오 분석 대신 플레이스홀더 웨이브폼 생성
      // 랜덤 시드 기반으로 일관된 패턴 생성
      const peaks: number[] = [];

      // 소스 URL을 해시하여 일관된 패턴 생성
      let hash = 0;
      for (let i = 0; i < (source?.length || 0); i++) {
        const char = source!.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }

      // Perlin-like noise로 자연스러운 웨이브폼 생성
      let value = 0.5;
      for (let i = 0; i < samples; i++) {
        if (cancelRef.current) {
          setIsLoading(false);
          return;
        }

        // 자연스러운 변화 (랜덤 워크)
        const random = Math.sin(hash + i * 0.1) * 0.5 + 0.5;
        value += (random - 0.5) * 0.3;
        value = Math.max(0.1, Math.min(0.9, value));

        // 약간의 고주파 노이즈 추가
        const noise = Math.sin(i * 0.5 + hash) * 0.15;
        peaks.push(Math.max(0.05, Math.min(1, value + noise)));

        // 진행률 업데이트
        if (i % Math.floor(samples / 10) === 0) {
          setProgress(Math.floor((i / samples) * 100));
        }
      }

      if (cancelRef.current) return;

      setWaveformData({ peaks, duration });
      setProgress(100);
      setIsLoading(false);
    }

    return () => {
      cancelRef.current = true;
    };
  }, [source, samples, enabled]);

  return {
    waveformData,
    isLoading,
    error,
    progress,
    refetch: () => {
      // source가 변경되어야 다시 분석됨
    },
    cancel: () => {
      cancelRef.current = true;
    },
  };
}
