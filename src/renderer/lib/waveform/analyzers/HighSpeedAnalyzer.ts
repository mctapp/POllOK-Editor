import { BaseAnalyzer } from './BaseAnalyzer';
import type { AnalyzerOptions, AnalyzerResult } from '../types';

/**
 * 고속 재생 웨이브폼 분석기
 *
 * 기존 비디오 요소를 사용하여 구간별로 시크하면서
 * Web Audio API의 AnalyserNode로 오디오 볼륨을 샘플링합니다.
 *
 * 장점:
 * - 실제 오디오 볼륨 반영
 * - 메모리 효율적
 * - 무음 구간 정확히 식별
 *
 * 단점:
 * - 분석에 시간 소요
 */
export class HighSpeedAnalyzer extends BaseAnalyzer {
  readonly name = 'HighSpeedAnalyzer';
  readonly description = '실제 오디오 분석 (시크 기반)';

  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private video: HTMLVideoElement | null = null;
  private originalVolume = 1;
  private originalCurrentTime = 0;
  private wasPlaying = false;

  async analyze(source: string, options: AnalyzerOptions): Promise<AnalyzerResult> {
    this.initOptions(options);
    const { samples } = options;

    try {
      this.setStatus('initializing');
      this.reportProgress(0, '오디오 분석 준비 중...');

      // 기존 비디오 요소 찾기
      this.video = document.querySelector('video');
      if (!this.video) {
        throw new Error('비디오 요소를 찾을 수 없습니다');
      }

      // 비디오 메타데이터 로드 대기
      const duration = await this.waitForVideoDuration(this.video);
      if (!duration || duration <= 0) {
        throw new Error('비디오 정보를 가져올 수 없습니다');
      }

      // 현재 상태 저장
      this.originalVolume = this.video.volume;
      this.originalCurrentTime = this.video.currentTime;
      this.wasPlaying = !this.video.paused;

      // 비디오 일시정지 및 음소거
      this.video.pause();
      this.video.volume = 0;

      if (this.isCancelled()) {
        this.restoreVideoState();
        return { success: false, error: '취소됨' };
      }

      // Web Audio API 설정
      this.audioContext = new AudioContext();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.1;

      // GainNode로 출력 음소거 (분석은 가능하게)
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0;

      this.sourceNode = this.audioContext.createMediaElementSource(this.video);
      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.setStatus('analyzing');
      this.reportProgress(5, '오디오 분석 중...');

      // 분석 시작
      const peaks = await this.sampleBySeek(duration, samples);

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
   * 비디오 duration 대기
   */
  private async waitForVideoDuration(video: HTMLVideoElement, maxRetries = 20): Promise<number> {
    for (let i = 0; i < maxRetries; i++) {
      if (this.isCancelled()) {
        return 0;
      }

      // readyState >= 1 (HAVE_METADATA) 이고 duration이 유효한 경우
      if (video.readyState >= 1 && video.duration && isFinite(video.duration) && video.duration > 0) {
        return video.duration;
      }

      // loadedmetadata 이벤트 대기
      await new Promise<void>((resolve) => {
        const onLoaded = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          resolve();
        };
        video.addEventListener('loadedmetadata', onLoaded);
        // 타임아웃 (이미 로드된 경우)
        setTimeout(resolve, 500);
      });
    }

    return video.duration || 0;
  }

  /**
   * 시크 기반 오디오 샘플링
   * 비디오를 각 위치로 시크하고 짧게 재생하여 오디오 레벨 측정
   */
  private async sampleBySeek(duration: number, targetSamples: number): Promise<number[]> {
    if (!this.video || !this.analyserNode || !this.audioContext) {
      throw new Error('분석기가 초기화되지 않았습니다');
    }

    const peaks: number[] = [];
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    const timeStep = duration / targetSamples;

    let lastProgress = 0;

    for (let i = 0; i < targetSamples && !this.isCancelled(); i++) {
      const targetTime = i * timeStep;

      // 해당 위치로 시크
      this.video.currentTime = targetTime;

      // seeked 이벤트 대기
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          this.video?.removeEventListener('seeked', onSeeked);
          resolve();
        };
        this.video?.addEventListener('seeked', onSeeked);
        // 타임아웃 (이미 해당 위치인 경우)
        setTimeout(resolve, 100);
      });

      // 짧게 재생하여 오디오 버퍼 채우기
      await this.video.play();
      await this.sleep(50);
      this.video.pause();

      // 오디오 레벨 측정
      this.analyserNode.getByteFrequencyData(dataArray);

      // RMS 계산
      let sum = 0;
      for (let j = 0; j < dataArray.length; j++) {
        sum += dataArray[j] * dataArray[j];
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // 0 ~ 1 범위로 정규화 (더 민감하게)
      const normalizedValue = Math.min(1, rms / 100);
      peaks.push(normalizedValue);

      // 진행률 업데이트
      const progress = Math.floor((i / targetSamples) * 95) + 5;
      if (progress !== lastProgress && progress % 2 === 0) {
        lastProgress = progress;
        const remaining = targetSamples - i;
        const estimatedSeconds = Math.ceil(remaining * 0.15);
        this.reportProgress(progress, `오디오 분석 중... (약 ${estimatedSeconds}초 남음)`);
      }
    }

    return peaks;
  }

  /**
   * 비디오 상태 복원
   */
  private restoreVideoState(): void {
    if (this.video) {
      this.video.currentTime = this.originalCurrentTime;
      this.video.volume = this.originalVolume;
      if (this.wasPlaying) {
        this.video.play();
      }
    }
  }

  /**
   * 리소스 정리
   */
  private cleanup(): void {
    // 오디오 노드 연결 해제
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // 비디오 상태 복원
    this.restoreVideoState();
    this.video = null;
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
