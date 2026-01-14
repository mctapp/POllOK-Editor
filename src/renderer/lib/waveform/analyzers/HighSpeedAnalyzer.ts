import { BaseAnalyzer } from './BaseAnalyzer';
import type { AnalyzerOptions, AnalyzerResult } from '../types';

/**
 * 고속 웨이브폼 분석기 (백그라운드 처리)
 *
 * 메인 비디오에 영향을 주지 않고 백그라운드에서 분석합니다.
 * 청크 단위로 처리하여 UI 응답성을 유지합니다.
 */
export class HighSpeedAnalyzer extends BaseAnalyzer {
  readonly name = 'HighSpeedAnalyzer';
  readonly description = '백그라운드 오디오 분석';

  private abortController: AbortController | null = null;

  async analyze(source: string, options: AnalyzerOptions): Promise<AnalyzerResult> {
    this.initOptions(options);
    const { samples } = options;

    this.abortController = new AbortController();

    try {
      this.setStatus('initializing');
      this.reportProgress(0, '비디오 정보 확인 중...');

      // 메인 비디오에서 duration 가져오기
      const mainVideo = document.querySelector('video');
      if (!mainVideo) {
        throw new Error('비디오 요소를 찾을 수 없습니다');
      }

      // duration 대기
      const duration = await this.waitForDuration(mainVideo);
      if (!duration) {
        throw new Error('비디오 정보를 가져올 수 없습니다');
      }

      this.setStatus('analyzing');
      this.reportProgress(5, '오디오 분석 준비 중...');

      // 숨겨진 오디오 요소로 분석 (비디오 재생에 영향 없음)
      const peaks = await this.analyzeWithHiddenAudio(source, duration, samples);

      if (this.isCancelled()) {
        return { success: false, error: '취소됨' };
      }

      this.setStatus('complete');
      this.reportProgress(100, '완료');

      return {
        success: true,
        data: { peaks, duration },
      };
    } catch (error) {
      this.setStatus('error');
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('Waveform analysis error:', error);
      return { success: false, error: message };
    }
  }

  /**
   * duration 대기
   */
  private async waitForDuration(video: HTMLVideoElement): Promise<number> {
    for (let i = 0; i < 30; i++) {
      if (this.isCancelled()) return 0;

      if (video.readyState >= 1 && video.duration && isFinite(video.duration)) {
        return video.duration;
      }

      await this.yieldToMain(300);
    }
    return 0;
  }

  /**
   * 숨겨진 비디오 요소로 분석 (연속 고속 재생)
   */
  private async analyzeWithHiddenAudio(
    source: string,
    duration: number,
    targetSamples: number
  ): Promise<number[]> {
    const video = document.createElement('video');
    video.src = source;
    video.preload = 'auto';
    video.playbackRate = 16; // 16배속 재생
    video.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
    document.body.appendChild(video);

    try {
      await this.waitForVideoReady(video);

      if (this.isCancelled()) {
        return [];
      }

      // Web Audio API 설정
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;

      const sourceNode = audioContext.createMediaElementSource(video);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0;

      sourceNode.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const peaks: number[] = [];
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // 실제 재생 시간 (16배속 적용)
      const actualDuration = duration / 16;
      const sampleInterval = (actualDuration * 1000) / targetSamples;
      const minInterval = 30; // 최소 30ms 간격
      const interval = Math.max(minInterval, sampleInterval);
      const actualSamples = Math.floor((actualDuration * 1000) / interval);

      this.reportProgress(10, '오디오 분석 중... (16x 재생)');

      // 재생 시작
      video.currentTime = 0;
      video.volume = 0.01; // 아주 작은 볼륨 (0이면 데이터 안 나올 수 있음)

      try {
        await video.play();
      } catch (e) {
        console.error('Video play failed:', e);
        throw new Error('비디오 재생 실패');
      }

      let lastProgress = 0;
      const startTime = Date.now();

      // 연속 재생하면서 샘플링
      while (!video.ended && !this.isCancelled() && peaks.length < actualSamples) {
        // 오디오 레벨 측정
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let k = 0; k < dataArray.length; k++) {
          sum += dataArray[k] * dataArray[k];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        // 제곱근으로 대비 강화 (조용한 구간과 소리 있는 구간 차이 극대화)
        const normalized = Math.min(1, rms / 60);
        const enhanced = Math.pow(normalized, 0.6); // 0.6 제곱으로 중간값 부스트
        peaks.push(Math.max(0.02, enhanced)); // 최소값 보장

        // 진행률 업데이트
        const progress = Math.min(99, Math.floor((peaks.length / actualSamples) * 90) + 10);
        if (progress !== lastProgress && progress % 5 === 0) {
          lastProgress = progress;
          const elapsed = (Date.now() - startTime) / 1000;
          const remaining = Math.max(0, Math.ceil((actualDuration - elapsed)));
          this.reportProgress(progress, `오디오 분석 중... (약 ${remaining}초 남음)`);
        }

        await this.yieldToMain(interval);
      }

      video.pause();

      // 정리
      sourceNode.disconnect();
      analyser.disconnect();
      gainNode.disconnect();
      await audioContext.close();

      // 목표 샘플 수에 맞게 리샘플링
      return this.resamplePeaks(peaks, targetSamples);
    } finally {
      video.pause();
      video.src = '';
      video.remove();
    }
  }

  /**
   * 피크 리샘플링
   */
  private resamplePeaks(peaks: number[], targetLength: number): number[] {
    if (peaks.length === 0) return new Array(targetLength).fill(0.1);
    if (peaks.length === targetLength) return peaks;

    const result: number[] = [];
    const ratio = peaks.length / targetLength;

    for (let i = 0; i < targetLength; i++) {
      const srcIndex = Math.floor(i * ratio);
      result.push(peaks[Math.min(srcIndex, peaks.length - 1)]);
    }

    return result;
  }

  /**
   * 비디오 로드 대기
   */
  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('비디오 로드 시간 초과'));
      }, 30000);

      const onCanPlay = () => {
        clearTimeout(timeout);
        video.removeEventListener('canplaythrough', onCanPlay);
        video.removeEventListener('error', onError);
        resolve();
      };

      const onError = () => {
        clearTimeout(timeout);
        video.removeEventListener('canplaythrough', onCanPlay);
        video.removeEventListener('error', onError);
        reject(new Error('비디오 로드 실패'));
      };

      video.addEventListener('canplaythrough', onCanPlay);
      video.addEventListener('error', onError);

      if (video.readyState >= 3) {
        clearTimeout(timeout);
        resolve();
      }
    });
  }

  /**
   * 메인 스레드에 양보 (UI 응답성 유지)
   */
  private yieldToMain(ms: number = 0): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 분석 취소
   */
  override cancel(): void {
    super.cancel();
    this.abortController?.abort();
  }

  /**
   * 리소스 정리
   */
  override dispose(): void {
    this.abortController?.abort();
    super.dispose();
  }
}
