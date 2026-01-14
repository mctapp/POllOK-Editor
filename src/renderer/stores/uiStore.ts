import { create } from 'zustand';
import type { AppMode } from '../../shared/types';

type ActiveTab = 'ad' | 'cc' | 'memo' | 'feedback';
type DialogType = 'newProject' | 'settings' | 'export' | 'about' | null;

interface UIState {
  // 상태
  appMode: AppMode; // 작가 모드 / 감수자 모드
  activeTab: ActiveTab;
  openDialog: DialogType;
  leftPanelWidth: number; // 비디오 패널 너비 (왼쪽 패널)
  scriptPanelWidth: number; // 스크립트 패널 너비
  timelineHeight: number;
  isTimelineCollapsed: boolean;
  showOverlay: boolean; // 영상 위 텍스트 오버레이 표시
  focusMode: boolean; // 포커스 모드 (최근 4개 카드만 표시)
  showReviewOnly: boolean; // 검토 필요 항목만 표시
  searchQuery: string; // 검색어
  timelineZoom: number; // 타임라인 줌 레벨 (0.5 ~ 10)
  showGuidePanel: boolean; // 가이드 안내 패널 표시

  // 액션
  setAppMode: (mode: AppMode) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setOpenDialog: (dialog: DialogType) => void;
  setLeftPanelWidth: (width: number) => void;
  setScriptPanelWidth: (width: number) => void;
  setTimelineHeight: (height: number) => void;
  toggleTimeline: () => void;
  toggleOverlay: () => void;
  toggleFocusMode: () => void;
  toggleReviewOnly: () => void;
  setSearchQuery: (query: string) => void;
  setTimelineZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleGuidePanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  appMode: 'writer',
  activeTab: 'ad',
  openDialog: null,
  leftPanelWidth: 70, // 기본 비디오 패널 너비 (70%)
  scriptPanelWidth: 400,
  timelineHeight: 200,
  isTimelineCollapsed: false,
  showOverlay: true, // 기본 켜짐
  focusMode: false,
  showReviewOnly: false,
  searchQuery: '',
  timelineZoom: 1,
  showGuidePanel: false,

  setAppMode: (appMode) => set({ appMode }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setOpenDialog: (openDialog) => set({ openDialog }),

  setLeftPanelWidth: (width) =>
    set({ leftPanelWidth: Math.max(40, Math.min(85, width)) }), // 40% ~ 85%

  setScriptPanelWidth: (width) =>
    set({ scriptPanelWidth: Math.max(280, Math.min(600, width)) }),

  setTimelineHeight: (height) =>
    set({ timelineHeight: Math.max(100, Math.min(400, height)) }),

  toggleTimeline: () =>
    set((state) => ({ isTimelineCollapsed: !state.isTimelineCollapsed })),

  toggleOverlay: () =>
    set((state) => ({ showOverlay: !state.showOverlay })),

  toggleFocusMode: () =>
    set((state) => ({ focusMode: !state.focusMode })),

  toggleReviewOnly: () =>
    set((state) => ({ showReviewOnly: !state.showReviewOnly })),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setTimelineZoom: (zoom) =>
    set({ timelineZoom: Math.max(0.5, Math.min(10, zoom)) }),

  zoomIn: () =>
    set((state) => ({ timelineZoom: Math.min(10, state.timelineZoom * 1.25) })),

  zoomOut: () =>
    set((state) => ({ timelineZoom: Math.max(0.5, state.timelineZoom / 1.25) })),

  toggleGuidePanel: () =>
    set((state) => ({ showGuidePanel: !state.showGuidePanel })),
}));
