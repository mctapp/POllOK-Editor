import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Feedback, FeedbackStatus } from '../../shared/types';

interface FeedbackState {
  feedbacks: Feedback[];
  expandedIds: Set<string>;

  // Actions
  addFeedback: (cardId: string, cardType: 'ad' | 'cc', guideCode: string, comment: string) => void;
  updateFeedback: (id: string, updates: Partial<Feedback>) => void;
  deleteFeedback: (id: string) => void;
  setStatus: (id: string, status: FeedbackStatus) => void;
  setWriterReply: (id: string, reply: string) => void;
  getFeedbacksForCard: (cardId: string, cardType: 'ad' | 'cc') => Feedback[];
  getUnresolvedFeedbacks: () => Feedback[];
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // Project sync
  setFeedbacks: (feedbacks: Feedback[]) => void;
  clearFeedbacks: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  feedbacks: [],
  expandedIds: new Set(),

  addFeedback: (cardId, cardType, guideCode, comment) => {
    const now = new Date().toISOString();
    const newFeedback: Feedback = {
      id: uuidv4(),
      cardId,
      cardType,
      guideCode,
      comment,
      writerReply: '',
      status: 'pending',
      createdAt: now,
      modifiedAt: now,
    };

    set((state) => ({
      feedbacks: [...state.feedbacks, newFeedback],
    }));
  },

  updateFeedback: (id, updates) => {
    set((state) => ({
      feedbacks: state.feedbacks.map((f) =>
        f.id === id ? { ...f, ...updates, modifiedAt: new Date().toISOString() } : f
      ),
    }));
  },

  deleteFeedback: (id) => {
    set((state) => ({
      feedbacks: state.feedbacks.filter((f) => f.id !== id),
    }));
  },

  setStatus: (id, status) => {
    set((state) => ({
      feedbacks: state.feedbacks.map((f) =>
        f.id === id ? { ...f, status, modifiedAt: new Date().toISOString() } : f
      ),
    }));
  },

  setWriterReply: (id, reply) => {
    set((state) => ({
      feedbacks: state.feedbacks.map((f) =>
        f.id === id ? { ...f, writerReply: reply, modifiedAt: new Date().toISOString() } : f
      ),
    }));
  },

  getFeedbacksForCard: (cardId, cardType) => {
    return get().feedbacks.filter((f) => f.cardId === cardId && f.cardType === cardType);
  },

  getUnresolvedFeedbacks: () => {
    return get().feedbacks.filter((f) => f.status !== 'resolved');
  },

  toggleExpand: (id) => {
    set((state) => {
      const newExpanded = new Set(state.expandedIds);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return { expandedIds: newExpanded };
    });
  },

  expandAll: () => {
    set((state) => ({
      expandedIds: new Set(state.feedbacks.map((f) => f.id)),
    }));
  },

  collapseAll: () => {
    set({ expandedIds: new Set() });
  },

  setFeedbacks: (feedbacks) => {
    set({ feedbacks, expandedIds: new Set() });
  },

  clearFeedbacks: () => {
    set({ feedbacks: [], expandedIds: new Set() });
  },
}));
