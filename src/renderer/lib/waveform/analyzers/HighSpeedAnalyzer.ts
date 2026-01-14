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
   * 숨겨진 오디오 요소로 분석
   */
  private async analyzeWithHiddenAudio(
    source: string,
    duration: number,
    targetSamples: number
  ): Promise<number[]> {
    // 숨겨진 오디오 요소 생성
    const audio = document.createElement('audio');
    audio.src = source;
    audio.preload = 'auto';
    audio.volume = 0;
    audio.style.display = 'none';
    document.body.appendChild(audio);

    try {
      // 오디오 로드 대기
      await this.waitForAudioReady(audio);

      if (this.isCancelled()) {
        return [];
      }

      // Web Audio API 설정
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;

      const sourceNode = audioContext.createMediaElementSource(audio);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // 음소거

      sourceNode.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination); // 데이터 흐름을 위해 destination 연결 필요

      const peaks: number[] = [];
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const timeStep = duration / targetSamples;
      const chunkSize = 10; // 한 번에 처리할 샘플 수

      this.reportProgress(10, '오디오 분석 중...');

      for (let i = 0; i < targetSamples; i += chunkSize) {
        if (this.isCancelled()) {
          break;
        }

        // 청크 처리
        const chunkEnd = Math.min(i + chunkSize, targetSamples);
        for (let j = i; j < chunkEnd; j++) {
          const targetTime = j * timeStep;

          // 해당 위치로 시크
          audio.currentTime = targetTime;

          // seeked 이벤트 대기
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              audio.removeEventListener('seeked', onSeeked);
              resolve();
            };
            audio.addEventListener('seeked', onSeeked);
            setTimeout(resolve, 50); // 타임아웃
          });

          // 짧게 재생하여 오디오 버퍼 채우기
          try {
            await audio.play();
            await this.yieldToMain(30); // 30ms 재생
            audio.pause();
          } catch {
            // 재생 실패 시 무시
          }

          // 오디오 레벨 측정
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let k = 0; k < dataArray.length; k++) {
            sum += dataArray[k] * dataArray[k];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          peaks.push(Math.min(1, rms / 80));
        }

        // UI 업데이트 및 메인 스레드 양보
        const progress = Math.floor((chunkEnd / targetSamples) * 90) + 10;
        const remaining = Math.ceil((targetSamples - chunkEnd) * 0.08);
        this.reportProgress(progress, `오디오 분석 중... (약 ${remaining}초 남음)`);

        await this.yieldToMain(0);
      }

      // 정리
      sourceNode.disconnect();
      analyser.disconnect();
      gainNode.disconnect();
      await audioContext.close();

      return peaks;
    } finally {
      // 오디오 요소 제거
      audio.pause();
      audio.src = '';
      audio.remove();
    }
  }

  /**
   * 오디오 로드 대기
   */
  private async waitForAudioReady(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('오디오 로드 시간 초과'));
      }, 30000);

      const onCanPlay = () => {
        clearTimeout(timeout);
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        resolve();
      };

      const onError = () => {
        clearTimeout(timeout);
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        reject(new Error('오디오 로드 실패'));
      };

      audio.addEventListener('canplaythrough', onCanPlay);
      audio.addEventListener('error', onError);

      // 이미 로드된 경우
      if (audio.readyState >= 3) {
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
