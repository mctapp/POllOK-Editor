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

// User Mode Types
export type UserMode = 'writer' | 'reviewer';

// Feedback Types (감수자가 작가에게 남기는 피드백)
export interface Feedback {
  id: string;
  cardId: string;
  cardType: 'ad' | 'cc';
  category: FeedbackCategory;
  content: string;
  status: FeedbackStatus;
  reviewerName?: string;
  createdAt: string;
  modifiedAt: string;
  resolvedAt?: string;
}

// 피드백 카테고리 (기본 가이드)
export type FeedbackCategory =
  | 'timing' // 타이밍 조정 필요
  | 'wording' // 표현 수정 필요
  | 'accuracy' // 정확성 확인 필요
  | 'missing' // 누락된 내용
  | 'redundant' // 불필요한 내용
  | 'style' // 스타일 가이드 준수
  | 'other'; // 기타

export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

// 피드백 카테고리 라벨
export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  timing: '타이밍 조정',
  wording: '표현 수정',
  accuracy: '정확성 확인',
  missing: '누락된 내용',
  redundant: '불필요한 내용',
  style: '스타일 가이드',
  other: '기타',
};

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
