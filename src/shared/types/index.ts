// Project Types
export interface Project {
  version: string;
  id: string;
  title: string;
  createdAt: string;
  modifiedAt: string;
  video: VideoInfo | null;
  settings: ProjectSettings;
}

export interface VideoInfo {
  path: string;
  filename: string;
  hash: string;
  duration: number; // 초 단위
  durationFrames: number;
  fps: number;
  width: number;
  height: number;
  resolution: string;
}

export interface ProjectSettings {
  timecodeFormat: 'smpte' | 'milliseconds';
  defaultAdVoice: string;
  ccMaxCharsPerLine: number;
  ccMaxLines: number;
}

// Version History for text snapshots
export interface TextVersion {
  text: string;
  savedAt: string;
}

// Memo Types
export interface Memo {
  id: string;
  title: string;
  content: string;
  completed: boolean;
  cardId: string; // AD 또는 CC 카드 ID
  cardType: 'ad' | 'cc';
  createdAt: string;
  modifiedAt: string;
}

// Audio Description Types
export interface AudioDescription {
  id: string;
  tcIn: number; // 프레임 단위
  tcOut: number;
  text: string;
  type: ADType;
  voice: string;
  status: Status;
  needsReview: boolean; // 검토 필요 체크
  versions?: TextVersion[]; // 버전 기록
  audioFile?: string; // 녹음 파일 경로
  createdAt: string;
  modifiedAt: string;
}

export type ADType = 'scene' | 'character' | 'text' | 'action' | 'other';
export type Status = 'draft' | 'review' | 'approved';

// Caption Types
export interface Caption {
  id: string;
  tcIn: number;
  tcOut: number;
  text: string;
  speakerId: string | null;
  position: Position;
  align: Alignment;
  type: CaptionType;
  style: CaptionStyle;
  needsReview: boolean; // 검토 필요 체크
  versions?: TextVersion[]; // 버전 기록
  createdAt: string;
  modifiedAt: string;
}

export type Position = 'top' | 'center' | 'bottom';
export type Alignment = 'left' | 'center' | 'right';
export type CaptionType = 'dialogue' | 'effect' | 'music' | 'narrator';

export interface CaptionStyle {
  color: string;
  background: string;
}

// Speaker Types
export interface Speaker {
  id: string;
  name: string;
  color: string;
}

// Waveform Cache Types
export interface WaveformCache {
  peaks: number[];
  duration: number;
  samples: number;
  videoPath: string;
  analyzedAt: string;
}

// Guide Types (감수 가이드)
export interface GuideItem {
  code: string; // A01, B01, etc.
  category: string; // 유개념: WHEN, WHAT, etc.
  majorCategory: string; // 대분류
  minorCategory: string; // 소분류
  principle: string; // 원칙/규칙
  violationProblem: string; // 위반 시 문제
  correctExample: string; // 올바른 예시
  wrongExample: string; // 잘못된 예시
}

// Feedback Types (감수자 피드백)
export interface Feedback {
  id: string;
  cardId: string; // AD 또는 CC 카드 ID
  cardType: 'ad' | 'cc';
  guideCode: string; // 가이드 코드 (A01, B01, etc.)
  comment: string; // 감수자 커멘트
  writerReply: string; // 작가 답변/의견
  status: FeedbackStatus;
  createdAt: string;
  modifiedAt: string;
}

// 피드백 상태: 보완요청(pending) → 진행중(in_progress) → 보완완료(resolved)
export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved';

// App Mode Types
export type AppMode = 'writer' | 'reviewer';

// IPC Channels
export const IpcChannels = {
  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
  WINDOW_MAXIMIZED_CHANGED: 'window:maximized-changed',

  // File
  FILE_SELECT_VIDEO: 'file:selectVideo',
  FILE_SELECT_PROJECT: 'file:selectProject',
  FILE_SAVE_PROJECT: 'file:saveProject',
  FILE_READ_PROJECT: 'file:readProject',
  FILE_CALCULATE_HASH: 'file:calculateHash',
  FILE_GET_VIDEO_PATH: 'file:getVideoPath',

  // Export
  EXPORT_SELECT_PATH: 'export:selectPath',
  EXPORT_WRITE_FILE: 'export:writeFile',

  // TTS
  TTS_SPEAK: 'tts:speak',
  TTS_STOP: 'tts:stop',
  TTS_GET_VOICES: 'tts:getVoices',

  // Recording
  RECORDING_SAVE: 'recording:save',
} as const;
