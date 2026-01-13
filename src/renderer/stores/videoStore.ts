import { create } from 'zustand';

interface VideoState {
  // 상태
  source: string | null;
  duration: number; // 프레임 단위
  fps: number;
  resolution: { width: number; height: number };
  currentFrame: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  inPoint: number | null;
  outPoint: number | null;

  // 액션
  setSource: (source: string | null) => void;
  setDuration: (frames: number) => void;
  setFps: (fps: number) => void;
  setResolution: (width: number, height: number) => void;
  setCurrentFrame: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setInPoint: () => void;
  setOutPoint: () => void;
  clearInPoint: () => void;
  clearOutPoint: () => void;
  clearPoints: () => void;
  seekToFrame: (frame: number) => void;
  seekFrames: (delta: number) => void;
  seekSeconds: (delta: number) => void;
  reset: () => void;
}

const initialState = {
  source: null,
  duration: 0,
  fps: 24,
  resolution: { width: 1920, height: 1080 },
  currentFrame: 0,
  isPlaying: false,
  playbackRate: 1.0,
  volume: 1.0,
  isMuted: false,
  inPoint: null,
  outPoint: null,
};

export const useVideoStore = create<VideoState>((set, get) => ({
  ...initialState,

  setSource: (source) => set({ source }),
  setDuration: (duration) => set({ duration }),
  setFps: (fps) => set({ fps }),
  setResolution: (width, height) => set({ resolution: { width, height } }),
  setCurrentFrame: (frame) => set({ currentFrame: Math.max(0, frame) }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

  toggleMute: () => {
    set((state) => ({ isMuted: !state.isMuted }));
  },

  setInPoint: () => {
    const { currentFrame } = get();
    set({ inPoint: currentFrame });
  },

  setOutPoint: () => {
    const { currentFrame } = get();
    set({ outPoint: currentFrame });
  },

  clearInPoint: () => {
    set({ inPoint: null });
  },

  clearOutPoint: () => {
    set({ outPoint: null });
  },

  clearPoints: () => {
    set({ inPoint: null, outPoint: null });
  },

  seekToFrame: (frame) => {
    const { duration, fps } = get();
    if (fps <= 0) return;

    const clampedFrame = Math.max(0, Math.min(duration, frame));
    set({ currentFrame: clampedFrame });

    // 비디오 요소 직접 제어
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      video.currentTime = clampedFrame / fps;
    }
  },

  seekFrames: (delta) => {
    const { currentFrame } = get();
    get().seekToFrame(currentFrame + delta);
  },

  seekSeconds: (delta) => {
    const { fps, currentFrame } = get();
    const frames = Math.round(delta * fps);
    get().seekToFrame(currentFrame + frames);
  },

  reset: () => set(initialState),
}));
