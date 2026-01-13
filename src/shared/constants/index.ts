// 기본 프로젝트 설정
export const DEFAULT_PROJECT_SETTINGS = {
  timecodeFormat: 'smpte' as const,
  defaultAdVoice: 'default',
  ccMaxCharsPerLine: 42,
  ccMaxLines: 2,
};

// 지원하는 비디오 형식
export const SUPPORTED_VIDEO_FORMATS = [
  { name: 'MOV', extensions: ['mov'] },
  { name: 'MP4', extensions: ['mp4', 'm4v'] },
  { name: 'MKV', extensions: ['mkv'] },
  { name: 'AVI', extensions: ['avi'] },
  { name: 'WebM', extensions: ['webm'] },
];

// 지원하는 프로젝트 형식
export const PROJECT_EXTENSION = '.afproj';
export const PROJECT_FILE_FILTER = {
  name: 'AccessFlow Project',
  extensions: ['afproj'],
};

// 키보드 단축키
export const SHORTCUTS = {
  // 재생 컨트롤
  PLAY_PAUSE: 'Space',
  FRAME_BACK: 'ArrowLeft',
  FRAME_FORWARD: 'ArrowRight',
  SECOND_BACK: 'Shift+ArrowLeft',
  SECOND_FORWARD: 'Shift+ArrowRight',

  // 편집
  SET_IN_POINT: 'i',
  SET_OUT_POINT: 'o',
  NEW_AD: 'CommandOrControl+d',
  NEW_CC: 'CommandOrControl+t',

  // 파일
  SAVE: 'CommandOrControl+s',
  OPEN: 'CommandOrControl+o',
  NEW: 'CommandOrControl+n',
  EXPORT: 'CommandOrControl+e',

  // 일반
  UNDO: 'CommandOrControl+z',
  REDO: 'CommandOrControl+Shift+z',
  DELETE: 'Delete',
} as const;

// 재생 속도 옵션
export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

// 자동 저장 간격 (ms)
export const AUTO_SAVE_INTERVAL = 30000;

// AD 타입 옵션
export const AD_TYPE_OPTIONS = [
  { value: 'scene', label: '장면 설명' },
  { value: 'character', label: '인물 등장' },
  { value: 'text', label: '자막/텍스트' },
  { value: 'action', label: '동작 설명' },
  { value: 'other', label: '기타' },
] as const;

// CC 타입 옵션
export const CC_TYPE_OPTIONS = [
  { value: 'dialogue', label: '대사' },
  { value: 'effect', label: '효과음' },
  { value: 'music', label: '음악' },
  { value: 'narrator', label: '나레이션' },
] as const;

// 화자 기본 색상
export const DEFAULT_SPEAKER_COLORS = [
  '#FFD700', // Gold
  '#00BFFF', // DeepSkyBlue
  '#FF69B4', // HotPink
  '#32CD32', // LimeGreen
  '#FF6347', // Tomato
  '#9370DB', // MediumPurple
  '#20B2AA', // LightSeaGreen
  '#FF8C00', // DarkOrange
];
