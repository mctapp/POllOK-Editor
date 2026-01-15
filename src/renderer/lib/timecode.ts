/**
 * 타임코드 유틸리티 함수
 */

/**
 * 프레임을 SMPTE 타임코드로 변환
 * @param frame 프레임 번호
 * @param fps 초당 프레임 수
 * @returns HH:MM:SS:FF 형식의 타임코드
 */
export function formatTimecodeFromFrame(frame: number, fps: number): string {
  if (!fps || fps <= 0) return '00:00:00:00';

  const totalSeconds = frame / fps;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = Math.floor(frame % fps);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames
    .toString()
    .padStart(2, '0')}`;
}

/**
 * SMPTE 타임코드를 프레임으로 변환
 * @param timecode HH:MM:SS:FF 형식의 타임코드
 * @param fps 초당 프레임 수
 * @returns 프레임 번호
 */
export function parseTimecodeToFrame(timecode: string, fps: number): number {
  const parts = timecode.split(':').map(Number);
  if (parts.length !== 4) return 0;

  const [hours, minutes, seconds, frames] = parts;
  return Math.floor((hours * 3600 + minutes * 60 + seconds) * fps + frames);
}

/**
 * 프레임을 MM:SS 형식으로 변환 (짧은 형식)
 * @param frame 프레임 번호
 * @param fps 초당 프레임 수
 * @returns MM:SS 형식의 시간
 */
export function formatShortTime(frame: number, fps: number): string {
  if (!fps || fps <= 0) return '00:00';

  const totalSeconds = Math.floor(frame / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
