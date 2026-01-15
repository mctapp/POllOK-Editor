/**
 * FFmpeg 기반 오디오 노이즈 제거 모듈
 * 녹음 파일의 배경 노이즈를 자동으로 제거합니다.
 *
 * FFmpeg가 시스템에 설치되어 있어야 합니다.
 * macOS: brew install ffmpeg
 * Windows: choco install ffmpeg 또는 수동 설치
 * Linux: apt install ffmpeg
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import { execSync } from 'child_process';

// 시스템 FFmpeg 경로 찾기
function findFfmpegPath(): string | null {
  try {
    // macOS/Linux
    const result = execSync('which ffmpeg', { encoding: 'utf8' }).trim();
    if (result) return result;
  } catch {
    // Windows
    try {
      const result = execSync('where ffmpeg', { encoding: 'utf8' }).trim().split('\n')[0];
      if (result) return result;
    } catch {
      // FFmpeg not found
    }
  }
  return null;
}

// FFmpeg 경로 설정
const ffmpegPath = findFfmpegPath();
let ffmpegAvailable = false;

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpegAvailable = true;
  console.log('FFmpeg found at:', ffmpegPath);
} else {
  console.warn('FFmpeg not found. Noise removal will be disabled.');
}

export interface NoiseRemovalOptions {
  // 노이즈 감소 강도 (0.0 ~ 1.0, 기본 0.21)
  noiseReduction?: number;
  // 노이즈 플로어 (dB, 기본 -40)
  noiseFloor?: number;
  // High pass 필터 주파수 (Hz, 기본 80)
  highpassFreq?: number;
  // Low pass 필터 주파수 (Hz, 기본 8000)
  lowpassFreq?: number;
}

const DEFAULT_OPTIONS: Required<NoiseRemovalOptions> = {
  noiseReduction: 0.21,
  noiseFloor: -40,
  highpassFreq: 80,
  lowpassFreq: 8000,
};

/**
 * 오디오 파일의 노이즈를 제거합니다.
 * @param inputPath 입력 오디오 파일 경로
 * @param outputPath 출력 파일 경로 (선택, 기본: 원본 파일 덮어쓰기)
 * @param options 노이즈 제거 옵션
 * @returns 처리된 파일 경로
 */
export async function removeNoise(
  inputPath: string,
  outputPath?: string,
  options?: NoiseRemovalOptions
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 출력 경로가 지정되지 않으면 임시 파일 생성 후 원본 덮어쓰기
  const tempDir = path.join(app.getPath('temp'), 'accesson-audio');
  await fs.mkdir(tempDir, { recursive: true });

  const timestamp = Date.now();
  const tempPath = path.join(tempDir, `processed_${timestamp}.webm`);
  const finalOutputPath = outputPath || inputPath;

  return new Promise((resolve, reject) => {
    // afftdn: FFmpeg의 노이즈 감소 필터
    // nr: 노이즈 감소 양 (0.0 ~ 1.0)
    // nf: 노이즈 플로어 (dB)
    // highpass/lowpass: 음성 주파수 대역 필터링
    const audioFilters = [
      // High-pass 필터: 저주파 험, 바람 소리 제거
      `highpass=f=${opts.highpassFreq}`,
      // Low-pass 필터: 고주파 히스 노이즈 제거
      `lowpass=f=${opts.lowpassFreq}`,
      // 노이즈 감소 필터 (afftdn)
      `afftdn=nr=${opts.noiseReduction}:nf=${opts.noiseFloor}`,
      // 무음 구간 노멀라이즈 (선택적 - 볼륨 일관성)
      'dynaudnorm=p=0.9:m=10',
    ];

    ffmpeg(inputPath)
      .audioFilters(audioFilters)
      .audioCodec('libopus') // WebM용 Opus 코덱
      .audioBitrate('128k')
      .on('start', (commandLine) => {
        console.log('FFmpeg noise removal started:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Processing: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('end', async () => {
        try {
          // 원본 덮어쓰기 모드인 경우
          if (!outputPath) {
            await fs.copyFile(tempPath, finalOutputPath);
            await fs.unlink(tempPath);
          }
          console.log('Noise removal completed:', finalOutputPath);
          resolve(finalOutputPath);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('FFmpeg noise removal error:', error);
        reject(error);
      })
      .save(outputPath || tempPath);
  });
}

/**
 * 오디오 데이터(Buffer)에서 노이즈를 제거합니다.
 * FFmpeg가 설치되어 있지 않으면 원본 데이터를 그대로 반환합니다.
 * @param audioData 오디오 데이터 (Uint8Array 또는 Buffer)
 * @param options 노이즈 제거 옵션
 * @returns 처리된 오디오 데이터
 */
export async function removeNoiseFromBuffer(
  audioData: Buffer | Uint8Array,
  options?: NoiseRemovalOptions
): Promise<Buffer> {
  // FFmpeg가 없으면 원본 반환
  if (!ffmpegAvailable) {
    console.log('FFmpeg not available, skipping noise removal');
    return Buffer.from(audioData);
  }

  const tempDir = path.join(app.getPath('temp'), 'accesson-audio');
  await fs.mkdir(tempDir, { recursive: true });

  const timestamp = Date.now();
  const inputPath = path.join(tempDir, `input_${timestamp}.webm`);
  const outputPath = path.join(tempDir, `output_${timestamp}.webm`);

  try {
    // 입력 데이터를 임시 파일로 저장
    await fs.writeFile(inputPath, Buffer.from(audioData));

    // 노이즈 제거 처리
    await removeNoise(inputPath, outputPath, options);

    // 결과 파일 읽기
    const resultBuffer = await fs.readFile(outputPath);

    // 임시 파일 정리
    await fs.unlink(inputPath);
    await fs.unlink(outputPath);

    return resultBuffer;
  } catch (error) {
    // 에러 시 임시 파일 정리 시도
    try {
      await fs.unlink(inputPath);
    } catch {
      /* ignore */
    }
    try {
      await fs.unlink(outputPath);
    } catch {
      /* ignore */
    }
    throw error;
  }
}

/**
 * FFmpeg 사용 가능 여부 확인
 */
export function checkFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      if (err) {
        console.error('FFmpeg not available:', err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}
