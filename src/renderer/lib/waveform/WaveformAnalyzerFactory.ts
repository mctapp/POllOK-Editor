import type { WaveformAnalyzer, AnalyzerType, AnalyzerConfig } from './types';
import { PlaceholderAnalyzer, HighSpeedAnalyzer } from './analyzers';

/**
 * 웨이브폼 분석기 팩토리
 *
 * 설정에 따라 적절한 분석기 인스턴스를 생성합니다.
 * 새로운 분석기를 추가할 때 여기에 등록하세요.
 */
export class WaveformAnalyzerFactory {
  private static defaultType: AnalyzerType = 'highspeed';

  /**
   * 분석기 생성
   */
  static create(config?: AnalyzerConfig): WaveformAnalyzer {
    const type = config?.type ?? this.defaultType;

    switch (type) {
      case 'placeholder':
        return new PlaceholderAnalyzer();

      case 'highspeed':
        return new HighSpeedAnalyzer();

      case 'webworker':
        // TODO: Web Worker 기반 분석기 구현
        console.warn('WebWorker analyzer not implemented, falling back to highspeed');
        return new HighSpeedAnalyzer();

      case 'ffmpeg':
        // TODO: FFmpeg 기반 분석기 구현
        console.warn('FFmpeg analyzer not implemented, falling back to highspeed');
        return new HighSpeedAnalyzer();

      default:
        console.warn(`Unknown analyzer type: ${type}, falling back to highspeed`);
        return new HighSpeedAnalyzer();
    }
  }

  /**
   * 기본 분석기 타입 설정
   */
  static setDefaultType(type: AnalyzerType): void {
    this.defaultType = type;
  }

  /**
   * 사용 가능한 분석기 목록
   */
  static getAvailableAnalyzers(): Array<{ type: AnalyzerType; name: string; description: string }> {
    return [
      {
        type: 'placeholder',
        name: 'PlaceholderAnalyzer',
        description: '해시 기반 플레이스홀더 (빠름, 실제 오디오 반영 안 함)',
      },
      {
        type: 'highspeed',
        name: 'HighSpeedAnalyzer',
        description: '고속 재생 기반 분석 (실제 오디오 반영, 시간 소요)',
      },
      // 향후 추가될 분석기들
      // {
      //   type: 'webworker',
      //   name: 'WebWorkerAnalyzer',
      //   description: 'Web Worker 기반 백그라운드 분석',
      // },
      // {
      //   type: 'ffmpeg',
      //   name: 'FFmpegAnalyzer',
      //   description: 'FFmpeg 기반 정밀 분석',
      // },
    ];
  }
}
