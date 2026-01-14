import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 키보드 단축키 설정
 */
export interface KeyboardShortcuts {
  // 재생 컨트롤
  playPause: string;
  seekBackward1s: string;
  seekForward1s: string;
  seekBackward5s: string;
  seekForward5s: string;
  seekBackward1Frame: string;
  seekForward1Frame: string;

  // 타임라인
  zoomIn: string;
  zoomOut: string;

  // 카드
  addADCard: string;
  addCCCard: string;
}

/**
 * 웨이브폼 설정
 */
export interface WaveformSettings {
  /** 샘플 수 (500 ~ 5000) - 높을수록 디테일 */
  samples: number;
  /** 분석 속도 (8 ~ 16) - 재생 배속 */
  analysisSpeed: number;
}

/**
 * 타임라인 설정
 */
export interface TimelineSettings {
  /** AD 트랙 높이 비율 (0.2 ~ 0.5) */
  adTrackHeightRatio: number;
  /** CC 트랙 높이 비율 (0.2 ~ 0.5) */
  ccTrackHeightRatio: number;
  /** 오디오 트랙 높이 비율 (0.2 ~ 0.5) */
  audioTrackHeightRatio: number;
}

/**
 * 스크립트 설정
 */
export interface ScriptSettings {
  /** 스크립트 글꼴 크기 (12 ~ 24) */
  fontSize: number;
}

/**
 * 오버레이 설정
 */
export interface OverlaySettings {
  /** AD 오버레이 글꼴 크기 (12 ~ 32) */
  adFontSize: number;
  /** CC 오버레이 글꼴 크기 (12 ~ 32) */
  ccFontSize: number;
  /** AD 오버레이 위치 (top, center, bottom) */
  adPosition: 'top' | 'center' | 'bottom';
  /** CC 오버레이 위치 (top, center, bottom) */
  ccPosition: 'top' | 'center' | 'bottom';
}

/**
 * 전체 설정
 */
interface SettingsState {
  // 웨이브폼 설정
  waveform: WaveformSettings;

  // 타임라인 설정
  timeline: TimelineSettings;

  // 스크립트 설정
  script: ScriptSettings;

  // 오버레이 설정
  overlay: OverlaySettings;

  // 키보드 단축키
  shortcuts: KeyboardShortcuts;

  // 액션
  setWaveformSettings: (settings: Partial<WaveformSettings>) => void;
  setTimelineSettings: (settings: Partial<TimelineSettings>) => void;
  setScriptSettings: (settings: Partial<ScriptSettings>) => void;
  setOverlaySettings: (settings: Partial<OverlaySettings>) => void;
  setShortcut: (key: keyof KeyboardShortcuts, value: string) => void;
  resetToDefaults: () => void;
}

/**
 * 기본 키보드 단축키
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcuts = {
  playPause: 'Space',
  seekBackward1s: 'ArrowLeft',
  seekForward1s: 'ArrowRight',
  seekBackward5s: 'ArrowDown',
  seekForward5s: 'ArrowUp',
  seekBackward1Frame: 'Shift+ArrowLeft',
  seekForward1Frame: 'Shift+ArrowRight',
  zoomIn: '=',
  zoomOut: '-',
  addADCard: 'Ctrl+D',
  addCCCard: 'Ctrl+T',
};

/**
 * 기본 웨이브폼 설정
 */
export const DEFAULT_WAVEFORM: WaveformSettings = {
  samples: 2000,
  analysisSpeed: 16,
};

/**
 * 기본 타임라인 설정
 */
export const DEFAULT_TIMELINE: TimelineSettings = {
  adTrackHeightRatio: 0.33,
  ccTrackHeightRatio: 0.33,
  audioTrackHeightRatio: 0.34,
};

/**
 * 기본 스크립트 설정
 */
export const DEFAULT_SCRIPT: ScriptSettings = {
  fontSize: 14,
};

/**
 * 기본 오버레이 설정
 */
export const DEFAULT_OVERLAY: OverlaySettings = {
  adFontSize: 16,
  ccFontSize: 16,
  adPosition: 'bottom',
  ccPosition: 'bottom',
};

/**
 * 설정 스토어
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      waveform: { ...DEFAULT_WAVEFORM },
      timeline: { ...DEFAULT_TIMELINE },
      script: { ...DEFAULT_SCRIPT },
      overlay: { ...DEFAULT_OVERLAY },
      shortcuts: { ...DEFAULT_SHORTCUTS },

      setWaveformSettings: (settings) =>
        set((state) => ({
          waveform: { ...state.waveform, ...settings },
        })),

      setTimelineSettings: (settings) =>
        set((state) => ({
          timeline: { ...state.timeline, ...settings },
        })),

      setScriptSettings: (settings) =>
        set((state) => ({
          script: { ...state.script, ...settings },
        })),

      setOverlaySettings: (settings) =>
        set((state) => ({
          overlay: { ...state.overlay, ...settings },
        })),

      setShortcut: (key, value) =>
        set((state) => ({
          shortcuts: { ...state.shortcuts, [key]: value },
        })),

      resetToDefaults: () =>
        set({
          waveform: { ...DEFAULT_WAVEFORM },
          timeline: { ...DEFAULT_TIMELINE },
          script: { ...DEFAULT_SCRIPT },
          overlay: { ...DEFAULT_OVERLAY },
          shortcuts: { ...DEFAULT_SHORTCUTS },
        }),
    }),
    {
      name: 'accesson-settings',
      // 기존 저장된 설정에 새 속성이 없을 때 기본값으로 병합
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsState>;
        return {
          ...currentState,
          ...persisted,
          waveform: { ...DEFAULT_WAVEFORM, ...persisted.waveform },
          timeline: { ...DEFAULT_TIMELINE, ...persisted.timeline },
          script: { ...DEFAULT_SCRIPT, ...persisted.script },
          overlay: { ...DEFAULT_OVERLAY, ...persisted.overlay },
          shortcuts: { ...DEFAULT_SHORTCUTS, ...persisted.shortcuts },
        };
      },
    }
  )
);

/**
 * 단축키 이름 한글화
 */
export const SHORTCUT_LABELS: Record<keyof KeyboardShortcuts, string> = {
  playPause: '재생/일시정지',
  seekBackward1s: '1초 뒤로',
  seekForward1s: '1초 앞으로',
  seekBackward5s: '5초 뒤로',
  seekForward5s: '5초 앞으로',
  seekBackward1Frame: '1프레임 뒤로',
  seekForward1Frame: '1프레임 앞으로',
  zoomIn: '타임라인 확대',
  zoomOut: '타임라인 축소',
  addADCard: 'AD 카드 추가',
  addCCCard: 'CC 카드 추가',
};
