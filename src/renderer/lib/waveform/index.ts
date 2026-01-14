/**
 * 웨이브폼 분석 모듈
 *
 * 이 모듈은 오디오 웨이브폼 분석을 위한 확장 가능한 시스템을 제공합니다.
 *
 * 사용 예:
 * ```typescript
 * import { WaveformAnalyzerFactory } from '@/lib/waveform';
 *
 * const analyzer = WaveformAnalyzerFactory.create({ type: 'highspeed' });
 * const result = await analyzer.analyze(videoSource, {
 *   samples: 1000,
 *   onProgress: (progress, message) => console.log(progress, message),
 * });
 * ```
 *
 * 새로운 분석기 추가 방법:
 * 1. BaseAnalyzer를 상속받아 새 분석기 클래스 생성
 * 2. analyzers/index.ts에 export 추가
 * 3. WaveformAnalyzerFactory에 타입 등록
 * 4. types.ts의 AnalyzerType에 타입 추가
 */

// Types
export type {
  WaveformData,
  AnalyzerStatus,
  ProgressCallback,
  AnalyzerOptions,
  AnalyzerResult,
  WaveformAnalyzer,
  AnalyzerType,
  AnalyzerConfig,
} from './types';

// Factory
export { WaveformAnalyzerFactory } from './WaveformAnalyzerFactory';

// Analyzers (직접 사용 시)
export { BaseAnalyzer, PlaceholderAnalyzer, HighSpeedAnalyzer } from './analyzers';
