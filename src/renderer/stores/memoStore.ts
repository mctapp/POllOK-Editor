import { create } from 'zustand';
import type { Memo } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

interface MemoState {
  // 상태
  memos: Memo[];
  expandedIds: Set<string>;
  filter: 'all' | 'ad' | 'cc' | 'incomplete' | 'completed';

  // 액션
  addMemo: (memo: Partial<Memo>) => string;
  updateMemo: (id: string, updates: Partial<Memo>) => void;
  deleteMemo: (id: string) => void;
  toggleComplete: (id: string) => void;
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setFilter: (filter: MemoState['filter']) => void;
  getMemosForCard: (cardId: string, cardType: 'ad' | 'cc') => Memo[];
  getMemoCount: (cardId: string, cardType: 'ad' | 'cc') => number;
  setMemos: (memos: Memo[]) => void;
  reset: () => void;
}

export const useMemoStore = create<MemoState>((set, get) => ({
  memos: [],
  expandedIds: new Set(),
  filter: 'all',

  addMemo: (memo) => {
    const now = new Date().toISOString();
    const id = uuidv4();
    const newMemo: Memo = {
      id,
      title: memo.title ?? '',
      content: memo.content ?? '',
      completed: memo.completed ?? false,
      cardId: memo.cardId ?? '',
      cardType: memo.cardType ?? 'ad',
      createdAt: now,
      modifiedAt: now,
    };

    set((state) => ({
      memos: [...state.memos, newMemo],
      expandedIds: new Set([...state.expandedIds, id]),
    }));

    return id;
  },

  updateMemo: (id, updates) => {
    set((state) => ({
      memos: state.memos.map((memo) =>
        memo.id === id ? { ...memo, ...updates, modifiedAt: new Date().toISOString() } : memo
      ),
    }));
  },

  deleteMemo: (id) => {
    set((state) => {
      const newExpandedIds = new Set(state.expandedIds);
      newExpandedIds.delete(id);
      return {
        memos: state.memos.filter((memo) => memo.id !== id),
        expandedIds: newExpandedIds,
      };
    });
  },

  toggleComplete: (id) => {
    set((state) => ({
      memos: state.memos.map((memo) =>
        memo.id === id
          ? { ...memo, completed: !memo.completed, modifiedAt: new Date().toISOString() }
          : memo
      ),
    }));
  },

  toggleExpand: (id) => {
    set((state) => {
      const newExpandedIds = new Set(state.expandedIds);
      if (newExpandedIds.has(id)) {
        newExpandedIds.delete(id);
      } else {
        newExpandedIds.add(id);
      }
      return { expandedIds: newExpandedIds };
    });
  },

  expandAll: () => {
    set((state) => ({
      expandedIds: new Set(state.memos.map((m) => m.id)),
    }));
  },

  collapseAll: () => {
    set({ expandedIds: new Set() });
  },

  setFilter: (filter) => {
    set({ filter });
  },

  getMemosForCard: (cardId, cardType) => {
    const { memos } = get();
    return memos.filter((m) => m.cardId === cardId && m.cardType === cardType);
  },

  getMemoCount: (cardId, cardType) => {
    const { memos } = get();
    return memos.filter((m) => m.cardId === cardId && m.cardType === cardType).length;
  },

  setMemos: (memos) => {
    set({ memos });
  },

  reset: () => {
    set({ memos: [], expandedIds: new Set(), filter: 'all' });
  },
}));
