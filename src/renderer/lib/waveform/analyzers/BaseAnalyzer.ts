import type {
  WaveformAnalyzer,
  AnalyzerStatus,
  AnalyzerOptions,
  AnalyzerResult,
  ProgressCallback,
} from '../types';

/**
 * 웨이브폼 분석기 기본 클래스
 *
 * 모든 분석기가 공유하는 기본 기능을 제공합니다.
 * 새로운 분석기를 만들 때 이 클래스를 상속받으세요.
 */
export abstract class BaseAnalyzer implements WaveformAnalyzer {
  abstract readonly name: string;
  abstract readonly description: string;

  protected _status: AnalyzerStatus = 'idle';
  protected _cancelled = false;
  protected _onProgress?: ProgressCallback;
  protected _onStatusChange?: (status: AnalyzerStatus) => void;

  get status(): AnalyzerStatus {
    return this._status;
  }

  /**
   * 상태 변경
   */
  protected setStatus(status: AnalyzerStatus): void {
    this._status = status;
    this._onStatusChange?.(status);
  }

  /**
   * 진행 상황 보고
   */
  protected reportProgress(progress: number, message: string): void {
    this._onProgress?.(progress, message);
  }

  /**
   * 취소 여부 확인
   */
  protected isCancelled(): boolean {
    return this._cancelled;
  }

  /**
   * 분석 실행 (서브클래스에서 구현)
   */
  abstract analyze(source: string, options: AnalyzerOptions): Promise<AnalyzerResult>;

  /**
   * 분석 취소
   */
  cancel(): void {
    this._cancelled = true;
    this.setStatus('cancelled');
  }

  /**
   * 리소스 정리 (서브클래스에서 오버라이드 가능)
   */
  dispose(): void {
    this._cancelled = true;
    this._onProgress = undefined;
    this._onStatusChange = undefined;
    this.setStatus('idle');
  }

  /**
   * 옵션 초기화
   */
  protected initOptions(options: AnalyzerOptions): void {
    this._cancelled = false;
    this._onProgress = options.onProgress;
    this._onStatusChange = options.onStatusChange;
  }

  /**
   * 비디오 요소에서 duration 가져오기
   */
  protected async getVideoDuration(maxRetries = 10, retryInterval = 500): Promise<number> {
    for (let i = 0; i < maxRetries; i++) {
      if (this.isCancelled()) {
        throw new Error('Cancelled');
      }

      const video = document.querySelector('video');
      if (video && video.duration && isFinite(video.duration) && video.duration > 0) {
        return video.duration;
      }

      await this.sleep(retryInterval);
    }

    throw new Error('비디오 정보를 가져올 수 없습니다');
  }

  /**
   * 대기 유틸리티
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
