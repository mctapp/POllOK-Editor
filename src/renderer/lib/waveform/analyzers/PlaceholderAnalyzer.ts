import { BaseAnalyzer } from './BaseAnalyzer';
import type { AnalyzerOptions, AnalyzerResult } from '../types';

/**
 * 플레이스홀더 웨이브폼 분석기
 *
 * 실제 오디오 분석 대신 URL 해시 기반의 일관된 패턴을 생성합니다.
 * 빠르고 메모리 효율적이지만 실제 오디오를 반영하지 않습니다.
 *
 * 장점:
 * - 즉시 생성 (< 100ms)
 * - 메모리 사용량 최소
 * - 동일 파일에 대해 일관된 패턴
 *
 * 단점:
 * - 실제 오디오 볼륨을 반영하지 않음
 * - 무음 구간 식별 불가
 */
export class PlaceholderAnalyzer extends BaseAnalyzer {
  readonly name = 'PlaceholderAnalyzer';
  readonly description = '해시 기반 플레이스홀더 웨이브폼 (실제 오디오 분석 안 함)';

  async analyze(source: string, options: AnalyzerOptions): Promise<AnalyzerResult> {
    this.initOptions(options);
    const { samples } = options;

    try {
      this.setStatus('initializing');
      this.reportProgress(0, '비디오 정보 대기 중...');

      // 비디오 duration 가져오기
      const duration = await this.getVideoDuration();

      if (this.isCancelled()) {
        return { success: false, error: '취소됨' };
      }

      this.setStatus('analyzing');
      this.reportProgress(10, '오디오 파형 생성 중...');

      // URL 해시 생성
      let hash = 0;
      for (let i = 0; i < source.length; i++) {
        const char = source.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }

      // 웨이브폼 패턴 생성
      const peaks: number[] = [];
      const frequencyLow = 0.02;
      const frequencyMid = 0.1;
      const frequencyHigh = 0.5;

      for (let i = 0; i < samples; i++) {
        if (this.isCancelled()) {
          return { success: false, error: '취소됨' };
        }

        // 다중 주파수 노이즈 결합
        const lowFreq = Math.sin(hash * 0.001 + i * frequencyLow) * 0.3;
        const midFreq = Math.sin(hash * 0.01 + i * frequencyMid) * 0.25;
        const highFreq = Math.sin(hash * 0.1 + i * frequencyHigh) * 0.15;

        // 무음 구간 시뮬레이션
        const silenceModulation = Math.abs(Math.sin(hash * 0.0001 + i * 0.008));

        let value = 0.4 + lowFreq + midFreq + highFreq;
        value *= (0.3 + silenceModulation * 0.7);
        value = Math.max(0.05, Math.min(0.95, value));

        peaks.push(value);

        // 진행률 업데이트 (10% 단위)
        if (i % Math.floor(samples / 10) === 0) {
          const progress = 10 + Math.floor((i / samples) * 90);
          this.reportProgress(progress, '오디오 파형 생성 중...');
        }
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
      return { success: false, error: message };
    }
  }
}
