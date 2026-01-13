import { create } from 'zustand';
import type { AudioDescription, ADType, Status } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

interface ADState {
  // 상태
  descriptions: AudioDescription[];
  selectedIds: string[];

  // 액션
  addDescription: (desc: Partial<AudioDescription>) => string;
  updateDescription: (id: string, updates: Partial<AudioDescription>) => void;
  deleteDescription: (id: string) => void;
  deleteSelected: () => void;
  selectDescription: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setDescriptions: (descriptions: AudioDescription[]) => void;
  getDescriptionAt: (frame: number) => AudioDescription | undefined;
  reset: () => void;
}

export const useADStore = create<ADState>((set, get) => ({
  descriptions: [],
  selectedIds: [],

  addDescription: (desc) => {
    const now = new Date().toISOString();
    const id = uuidv4();
    const newDescription: AudioDescription = {
      id,
      tcIn: desc.tcIn ?? 0,
      tcOut: desc.tcOut ?? 0,
      text: desc.text ?? '',
      type: (desc.type as ADType) ?? 'scene',
      voice: desc.voice ?? 'default',
      status: (desc.status as Status) ?? 'draft',
      createdAt: now,
      modifiedAt: now,
    };

    set((state) => ({
      descriptions: [...state.descriptions, newDescription].sort((a, b) => a.tcIn - b.tcIn),
      selectedIds: [id],
    }));

    return id;
  },

  updateDescription: (id, updates) => {
    set((state) => ({
      descriptions: state.descriptions
        .map((desc) =>
          desc.id === id
            ? { ...desc, ...updates, modifiedAt: new Date().toISOString() }
            : desc
        )
        .sort((a, b) => a.tcIn - b.tcIn),
    }));
  },

  deleteDescription: (id) => {
    set((state) => ({
      descriptions: state.descriptions.filter((desc) => desc.id !== id),
      selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
    }));
  },

  deleteSelected: () => {
    set((state) => ({
      descriptions: state.descriptions.filter(
        (desc) => !state.selectedIds.includes(desc.id)
      ),
      selectedIds: [],
    }));
  },

  selectDescription: (id, multi = false) => {
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

  setDescriptions: (descriptions) => {
    set({ descriptions: descriptions.sort((a, b) => a.tcIn - b.tcIn) });
  },

  getDescriptionAt: (frame) => {
    const { descriptions } = get();
    return descriptions.find((desc) => frame >= desc.tcIn && frame <= desc.tcOut);
  },

  reset: () => {
    set({ descriptions: [], selectedIds: [] });
  },
}));
