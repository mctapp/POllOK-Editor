import { create } from 'zustand';
import type { Feedback, FeedbackCategory, FeedbackStatus } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

interface FeedbackState {
  // 상태
  feedbacks: Feedback[];
  filter: 'all' | 'pending' | 'in_progress' | 'resolved';
  selectedCardId: string | null;

  // 액션
  addFeedback: (feedback: Partial<Feedback>) => string;
  updateFeedback: (id: string, updates: Partial<Feedback>) => void;
  deleteFeedback: (id: string) => void;
  resolveFeedback: (id: string) => void;
  rejectFeedback: (id: string) => void;
  setFilter: (filter: FeedbackState['filter']) => void;
  setSelectedCardId: (cardId: string | null) => void;
  getFeedbacksForCard: (cardId: string, cardType: 'ad' | 'cc') => Feedback[];
  getFeedbackCount: (cardId: string, cardType: 'ad' | 'cc') => number;
  getPendingCount: () => number;
  setFeedbacks: (feedbacks: Feedback[]) => void;
  reset: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  feedbacks: [],
  filter: 'all',
  selectedCardId: null,

  addFeedback: (feedback) => {
    const now = new Date().toISOString();
    const id = uuidv4();
    const newFeedback: Feedback = {
      id,
      cardId: feedback.cardId ?? '',
      cardType: feedback.cardType ?? 'ad',
      category: feedback.category ?? 'other',
      content: feedback.content ?? '',
      status: 'pending',
      reviewerName: feedback.reviewerName,
      createdAt: now,
      modifiedAt: now,
    };

    set((state) => ({
      feedbacks: [...state.feedbacks, newFeedback],
    }));

    return id;
  },

  updateFeedback: (id, updates) => {
    set((state) => ({
      feedbacks: state.feedbacks.map((fb) =>
        fb.id === id
          ? { ...fb, ...updates, modifiedAt: new Date().toISOString() }
          : fb
      ),
    }));
  },

  deleteFeedback: (id) => {
    set((state) => ({
      feedbacks: state.feedbacks.filter((fb) => fb.id !== id),
    }));
  },

  resolveFeedback: (id) => {
    set((state) => ({
      feedbacks: state.feedbacks.map((fb) =>
        fb.id === id
          ? {
              ...fb,
              status: 'resolved' as FeedbackStatus,
              resolvedAt: new Date().toISOString(),
              modifiedAt: new Date().toISOString(),
            }
          : fb
      ),
    }));
  },

  rejectFeedback: (id) => {
    set((state) => ({
      feedbacks: state.feedbacks.map((fb) =>
        fb.id === id
          ? {
              ...fb,
              status: 'rejected' as FeedbackStatus,
              modifiedAt: new Date().toISOString(),
            }
          : fb
      ),
    }));
  },

  setFilter: (filter) => {
    set({ filter });
  },

  setSelectedCardId: (cardId) => {
    set({ selectedCardId: cardId });
  },

  getFeedbacksForCard: (cardId, cardType) => {
    const { feedbacks } = get();
    return feedbacks.filter((fb) => fb.cardId === cardId && fb.cardType === cardType);
  },

  getFeedbackCount: (cardId, cardType) => {
    const { feedbacks } = get();
    return feedbacks.filter((fb) => fb.cardId === cardId && fb.cardType === cardType).length;
  },

  getPendingCount: () => {
    const { feedbacks } = get();
    return feedbacks.filter((fb) => fb.status === 'pending').length;
  },

  setFeedbacks: (feedbacks) => {
    set({ feedbacks });
  },

  reset: () => {
    set({ feedbacks: [], filter: 'all', selectedCardId: null });
  },
}));
