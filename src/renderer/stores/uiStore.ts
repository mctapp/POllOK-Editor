import { create } from 'zustand';

type ActiveTab = 'ad' | 'cc' | 'memo';
type DialogType = 'newProject' | 'settings' | 'export' | 'about' | null;

interface UIState {
  // 상태
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

  // 액션
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
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'ad',
  openDialog: null,
  leftPanelWidth: 700, // 기본 비디오 패널 너비 (넓게 설정)
  scriptPanelWidth: 400,
  timelineHeight: 200,
  isTimelineCollapsed: false,
  showOverlay: true, // 기본 켜짐
  focusMode: false,
  showReviewOnly: false,
  searchQuery: '',
  timelineZoom: 1,

  setActiveTab: (activeTab) => set({ activeTab }),
  setOpenDialog: (openDialog) => set({ openDialog }),

  setLeftPanelWidth: (width) =>
    set({ leftPanelWidth: Math.max(400, Math.min(1200, width)) }),

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
}));
