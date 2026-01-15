/**
 * 웨이브폼 분석 모듈 타입 정의
 *
 * 이 모듈은 다양한 웨이브폼 분석 엔진을 교체 가능하도록 설계되었습니다.
 * 새로운 분석기를 추가하려면 WaveformAnalyzer 인터페이스를 구현하세요.
 */

/**
 * 웨이브폼 데이터
 */
export interface WaveformData {
  /** 피크 값 배열 (0 ~ 1 범위) */
  peaks: number[];
  /** 오디오 전체 길이 (초) */
  duration: number;
}

/**
 * 분석 진행 상태
 */
export type AnalyzerStatus =
  | 'idle'
  | 'initializing'
  | 'analyzing'
  | 'complete'
  | 'error'
  | 'cancelled';

/**
 * 진행 상황 콜백
 */
export type ProgressCallback = (progress: number, message: string) => void;

/**
 * 분석기 옵션
 */
export interface AnalyzerOptions {
  /** 샘플 수 (웨이브폼 해상도) */
  samples: number;
  /** 진행 상황 콜백 */
  onProgress?: ProgressCallback;
  /** 상태 변경 콜백 */
  onStatusChange?: (status: AnalyzerStatus) => void;
}

/**
 * 분석 결과
 */
export interface AnalyzerResult {
  success: boolean;
  data?: WaveformData;
  error?: string;
}

/**
 * 웨이브폼 분석기 인터페이스
 *
 * 모든 웨이브폼 분석기는 이 인터페이스를 구현해야 합니다.
 * 이를 통해 분석 엔진을 쉽게 교체할 수 있습니다.
 */
export interface WaveformAnalyzer {
  /** 분석기 이름 */
  readonly name: string;

  /** 분석기 설명 */
  readonly description: string;

  /** 현재 상태 */
  readonly status: AnalyzerStatus;

  /**
   * 오디오 분석 시작
   * @param source 비디오/오디오 소스 URL
   * @param options 분석 옵션
   */
  analyze(source: string, options: AnalyzerOptions): Promise<AnalyzerResult>;

  /**
   * 분석 취소
   */
  cancel(): void;

  /**
   * 리소스 정리
   */
  dispose(): void;
}

/**
 * 분석기 타입
 */
export type AnalyzerType = 'placeholder' | 'highspeed' | 'webworker' | 'ffmpeg';

/**
 * 분석기 팩토리 설정
 */
export interface AnalyzerConfig {
  /** 사용할 분석기 타입 */
  type: AnalyzerType;
  /** 분석기별 추가 설정 */
  options?: Record<string, unknown>;
}
