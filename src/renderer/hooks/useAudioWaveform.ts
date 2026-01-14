import { useState, useEffect, useCallback, useRef } from 'react';

interface WaveformData {
  peaks: number[]; // -1 ~ 1 범위의 피크 값들
  duration: number; // 초 단위
}

interface UseAudioWaveformOptions {
  samples?: number; // 웨이브폼 샘플 수 (기본값: 1000)
}

export function useAudioWaveform(
  source: string | null,
  options: UseAudioWaveformOptions = {}
) {
  const { samples = 1000 } = options;
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 오디오 버퍼에서 웨이브폼 데이터 추출
  const extractPeaks = useCallback(
    (audioBuffer: AudioBuffer): number[] => {
      const channelData = audioBuffer.getChannelData(0); // 첫 번째 채널 사용
      const blockSize = Math.floor(channelData.length / samples);
      const peaks: number[] = [];

      for (let i = 0; i < samples; i++) {
        const start = i * blockSize;
        const end = start + blockSize;

        let max = 0;
        let min = 0;

        for (let j = start; j < end && j < channelData.length; j++) {
          const value = channelData[j];
          if (value > max) max = value;
          if (value < min) min = value;
        }

        // 최대값과 최소값의 평균 절대값을 사용
        peaks.push((Math.abs(max) + Math.abs(min)) / 2);
      }

      return peaks;
    },
    [samples]
  );

  // 오디오 분석
  const analyzeAudio = useCallback(async () => {
    if (!source) {
      setWaveformData(null);
      return;
    }

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      // AudioContext 생성
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;

      // local-file:// URL을 fetch할 수 있도록 처리
      const response = await fetch(source, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('오디오 파일을 불러올 수 없습니다');
      }

      const arrayBuffer = await response.arrayBuffer();

      // 오디오 디코딩
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // 웨이브폼 피크 추출
      const peaks = extractPeaks(audioBuffer);

      setWaveformData({
        peaks,
        duration: audioBuffer.duration,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // 요청이 취소됨 - 무시
        return;
      }

      console.error('Audio waveform analysis error:', err);
      setError(err instanceof Error ? err.message : '웨이브폼 분석 실패');
      setWaveformData(null);
    } finally {
      setIsLoading(false);
    }
  }, [source, extractPeaks]);

  // source 변경 시 분석 실행
  useEffect(() => {
    analyzeAudio();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [analyzeAudio]);

  // 컴포넌트 언마운트 시 AudioContext 정리
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    waveformData,
    isLoading,
    error,
    refetch: analyzeAudio,
  };
}
