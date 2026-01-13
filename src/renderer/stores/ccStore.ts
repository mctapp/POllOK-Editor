import { create } from 'zustand';
import type { Caption, Speaker, Position, Alignment, CaptionType } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_SPEAKER_COLORS } from '../../shared/constants';

interface CCState {
  // 상태
  captions: Caption[];
  speakers: Speaker[];
  selectedIds: string[];
  editingId: string | null; // 현재 편집 중인 ID

  // 캡션 액션
  addCaption: (caption: Partial<Caption>) => string;
  updateCaption: (id: string, updates: Partial<Caption>) => void;
  deleteCaption: (id: string) => void;
  deleteSelected: () => void;
  selectCaption: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setCaptions: (captions: Caption[]) => void;
  getCaptionAt: (frame: number) => Caption | undefined;
  setEditingId: (id: string | null) => void;

  // 화자 액션
  addSpeaker: (name: string) => string;
  updateSpeaker: (id: string, updates: Partial<Speaker>) => void;
  deleteSpeaker: (id: string) => void;
  setSpeakers: (speakers: Speaker[]) => void;

  reset: () => void;
}

export const useCCStore = create<CCState>((set, get) => ({
  captions: [],
  speakers: [],
  selectedIds: [],
  editingId: null,

  addCaption: (caption) => {
    const now = new Date().toISOString();
    const id = uuidv4();
    const newCaption: Caption = {
      id,
      tcIn: caption.tcIn ?? 0,
      tcOut: caption.tcOut ?? 0,
      text: caption.text ?? '',
      speakerId: caption.speakerId ?? null,
      position: (caption.position as Position) ?? 'bottom',
      align: (caption.align as Alignment) ?? 'center',
      type: (caption.type as CaptionType) ?? 'dialogue',
      style: caption.style ?? { color: '#FFFFFF', background: '#000000CC' },
      createdAt: now,
      modifiedAt: now,
    };

    set((state) => ({
      captions: [...state.captions, newCaption].sort((a, b) => a.tcIn - b.tcIn),
      selectedIds: [id],
      editingId: id, // 자동으로 편집 모드 진입
    }));

    return id;
  },

  updateCaption: (id, updates) => {
    set((state) => ({
      captions: state.captions
        .map((caption) =>
          caption.id === id
            ? { ...caption, ...updates, modifiedAt: new Date().toISOString() }
            : caption
        )
        .sort((a, b) => a.tcIn - b.tcIn),
    }));
  },

  deleteCaption: (id) => {
    set((state) => ({
      captions: state.captions.filter((caption) => caption.id !== id),
      selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
    }));
  },

  deleteSelected: () => {
    set((state) => ({
      captions: state.captions.filter(
        (caption) => !state.selectedIds.includes(caption.id)
      ),
      selectedIds: [],
    }));
  },

  selectCaption: (id, multi = false) => {
    set((state) => {
      if (multi) {
        const isSelected = state.selectedIds.includes(id);
        return {
          selectedIds: isSelected
            ? state.selectedIds.filter((selectedId) => selectedId !== id)
            : [...state.selectedIds, id],
        };
      }
      return { selectedIds: [id] };
    });
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  setCaptions: (captions) => {
    set({ captions: captions.sort((a, b) => a.tcIn - b.tcIn) });
  },

  getCaptionAt: (frame) => {
    const { captions } = get();
    return captions.find((caption) => frame >= caption.tcIn && frame <= caption.tcOut);
  },

  setEditingId: (id) => {
    set({ editingId: id });
  },

  addSpeaker: (name) => {
    const { speakers } = get();
    const id = uuidv4();
    const colorIndex = speakers.length % DEFAULT_SPEAKER_COLORS.length;

    const newSpeaker: Speaker = {
      id,
      name,
      color: DEFAULT_SPEAKER_COLORS[colorIndex],
    };

    set((state) => ({
      speakers: [...state.speakers, newSpeaker],
    }));

    return id;
  },

  updateSpeaker: (id, updates) => {
    set((state) => ({
      speakers: state.speakers.map((speaker) =>
        speaker.id === id ? { ...speaker, ...updates } : speaker
      ),
    }));
  },

  deleteSpeaker: (id) => {
    set((state) => ({
      speakers: state.speakers.filter((speaker) => speaker.id !== id),
      // 해당 화자를 사용하는 캡션의 speakerId를 null로 변경
      captions: state.captions.map((caption) =>
        caption.speakerId === id ? { ...caption, speakerId: null } : caption
      ),
    }));
  },

  setSpeakers: (speakers) => {
    set({ speakers });
  },

  reset: () => {
    set({ captions: [], speakers: [], selectedIds: [], editingId: null });
  },
}));
