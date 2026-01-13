import { create } from 'zustand';

type ActiveTab = 'ad' | 'cc';
type DialogType = 'newProject' | 'settings' | 'export' | 'about' | null;

interface UIState {
  // 상태
  activeTab: ActiveTab;
  openDialog: DialogType;
  leftPanelWidth: number;
  timelineHeight: number;
  isTimelineCollapsed: boolean;

  // 액션
  setActiveTab: (tab: ActiveTab) => void;
  setOpenDialog: (dialog: DialogType) => void;
  setLeftPanelWidth: (width: number) => void;
  setTimelineHeight: (height: number) => void;
  toggleTimeline: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'ad',
  openDialog: null,
  leftPanelWidth: 480,
  timelineHeight: 200,
  isTimelineCollapsed: false,

  setActiveTab: (activeTab) => set({ activeTab }),
  setOpenDialog: (openDialog) => set({ openDialog }),

  setLeftPanelWidth: (width) =>
    set({ leftPanelWidth: Math.max(300, Math.min(800, width)) }),

  setTimelineHeight: (height) =>
    set({ timelineHeight: Math.max(100, Math.min(400, height)) }),

  toggleTimeline: () =>
    set((state) => ({ isTimelineCollapsed: !state.isTimelineCollapsed })),
}));
