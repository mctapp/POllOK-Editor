import { BaseAnalyzer } from './BaseAnalyzer';
import type { AnalyzerOptions, AnalyzerResult } from '../types';

/**
 * 고속 재생 웨이브폼 분석기
 *
 * 비디오를 고속으로 재생하면서 Web Audio API의 AnalyserNode로
 * 실시간 오디오 볼륨을 샘플링합니다.
 *
 * 장점:
 * - 실제 오디오 볼륨 반영
 * - 메모리 효율적 (스트리밍 방식)
 * - 무음 구간 정확히 식별
 *
 * 단점:
 * - 분석에 시간 소요 (영상 길이 / 재생속도)
 * - 26분 영상 기준 약 1.5분 소요 (16x 속도)
 */
export class HighSpeedAnalyzer extends BaseAnalyzer {
  readonly name = 'HighSpeedAnalyzer';
  readonly description = '고속 재생 기반 실제 오디오 분석';

  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private hiddenVideo: HTMLVideoElement | null = null;

  /** 재생 속도 (높을수록 빠르지만 정확도 감소) */
  private readonly playbackRate = 16;

  /** 샘플링 간격 (ms) */
  private readonly sampleInterval = 50;

  async analyze(source: string, options: AnalyzerOptions): Promise<AnalyzerResult> {
    this.initOptions(options);
    const { samples } = options;

    try {
      this.setStatus('initializing');
      this.reportProgress(0, '오디오 분석 준비 중...');

      // 비디오 duration 가져오기
      const duration = await this.getVideoDuration();

      if (this.isCancelled()) {
        return { success: false, error: '취소됨' };
      }

      // 숨겨진 비디오 요소 생성
      this.hiddenVideo = document.createElement('video');
      this.hiddenVideo.src = source;
      this.hiddenVideo.muted = false; // 오디오 분석을 위해 음소거 해제
      this.hiddenVideo.volume = 0.001; // 거의 들리지 않게
      this.hiddenVideo.playbackRate = this.playbackRate;
      this.hiddenVideo.style.display = 'none';
      document.body.appendChild(this.hiddenVideo);

      // Web Audio API 설정
      this.audioContext = new AudioContext();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.3;

      this.mediaSource = this.audioContext.createMediaElementSource(this.hiddenVideo);
      this.mediaSource.connect(this.analyserNode);
      // 출력에 연결하지 않으면 소리가 나지 않음 (원하는 동작)

      // 비디오 로드 대기
      await new Promise<void>((resolve, reject) => {
        if (!this.hiddenVideo) {
          reject(new Error('비디오 요소 없음'));
          return;
        }
        this.hiddenVideo.onloadedmetadata = () => resolve();
        this.hiddenVideo.onerror = () => reject(new Error('비디오 로드 실패'));
      });

      if (this.isCancelled()) {
        this.cleanup();
        return { success: false, error: '취소됨' };
      }

      this.setStatus('analyzing');
      this.reportProgress(5, '오디오 분석 중... (0%)');

      // 분석 시작
      const peaks = await this.sampleAudio(duration, samples);

      if (this.isCancelled()) {
        this.cleanup();
        return { success: false, error: '취소됨' };
      }

      this.cleanup();
      this.setStatus('complete');
      this.reportProgress(100, '완료');

      return {
        success: true,
        data: { peaks, duration },
      };
    } catch (error) {
      this.cleanup();
      this.setStatus('error');
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      return { success: false, error: message };
    }
  }

  /**
   * 오디오 샘플링
   */
  private async sampleAudio(duration: number, targetSamples: number): Promise<number[]> {
    if (!this.hiddenVideo || !this.analyserNode) {
      throw new Error('분석기가 초기화되지 않았습니다');
    }

    const peaks: number[] = [];
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    // 실제 재생 시간 (고속 재생 적용)
    const actualDuration = duration / this.playbackRate;
    const samplesPerSecond = targetSamples / actualDuration;
    const sampleIntervalMs = 1000 / samplesPerSecond;

    // 최소 간격 보장
    const interval = Math.max(this.sampleInterval, sampleIntervalMs);
    const totalSamples = Math.floor(actualDuration * 1000 / interval);

    // 재생 시작
    this.hiddenVideo.currentTime = 0;
    await this.hiddenVideo.play();

    let lastProgress = 0;

    for (let i = 0; i < totalSamples && !this.isCancelled(); i++) {
      // 현재 볼륨 샘플링
      this.analyserNode.getByteFrequencyData(dataArray);

      // RMS (Root Mean Square) 계산
      let sum = 0;
      for (let j = 0; j < dataArray.length; j++) {
        sum += dataArray[j] * dataArray[j];
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // 0 ~ 1 범위로 정규화
      const normalizedValue = Math.min(1, rms / 128);
      peaks.push(normalizedValue);

      // 진행률 업데이트
      const progress = Math.floor((i / totalSamples) * 95) + 5;
      if (progress !== lastProgress && progress % 5 === 0) {
        lastProgress = progress;
        const timeRemaining = Math.ceil((totalSamples - i) * interval / 1000);
        this.reportProgress(progress, `오디오 분석 중... (약 ${timeRemaining}초 남음)`);
      }

      // 다음 샘플까지 대기
      await this.sleep(interval);

      // 비디오가 끝났으면 중단
      if (this.hiddenVideo.ended) {
        break;
      }
    }

    // 비디오 정지
    this.hiddenVideo.pause();

    // 목표 샘플 수에 맞게 리샘플링
    return this.resample(peaks, targetSamples);
  }

  /**
   * 샘플 수 조정 (리샘플링)
   */
  private resample(source: number[], targetLength: number): number[] {
    if (source.length === 0) {
      return new Array(targetLength).fill(0);
    }

    if (source.length === targetLength) {
      return source;
    }

    const result: number[] = [];
    const ratio = source.length / targetLength;

    for (let i = 0; i < targetLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, source.length - 1);
      const fraction = srcIndex - srcIndexFloor;

      // 선형 보간
      const value = source[srcIndexFloor] * (1 - fraction) + source[srcIndexCeil] * fraction;
      result.push(value);
    }

    return result;
  }

  /**
   * 리소스 정리
   */
  private cleanup(): void {
    if (this.hiddenVideo) {
      this.hiddenVideo.pause();
      this.hiddenVideo.remove();
      this.hiddenVideo = null;
    }

    if (this.mediaSource) {
      this.mediaSource.disconnect();
      this.mediaSource = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * 분석 취소
   */
  override cancel(): void {
    super.cancel();
    this.cleanup();
  }

  /**
   * 리소스 정리
   */
  override dispose(): void {
    this.cleanup();
    super.dispose();
  }
}
