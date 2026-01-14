import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Trash2,
  Filter,
  ChevronsUpDown,
  MessageSquare,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  useFeedbackStore,
  useADStore,
  useCCStore,
  useVideoStore,
  useUIStore,
} from '../../stores';
import type { Feedback, FeedbackCategory, FeedbackStatus } from '../../../shared/types';
import { FEEDBACK_CATEGORY_LABELS } from '../../../shared/types';

// 피드백 상태 라벨
const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: '대기중',
  in_progress: '처리중',
  resolved: '해결됨',
  rejected: '반려됨',
};

// 피드백 상태 아이콘
const getStatusIcon = (status: FeedbackStatus) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-3.5 h-3.5 text-accent-yellow" />;
    case 'in_progress':
      return <AlertCircle className="w-3.5 h-3.5 text-accent-blue" />;
    case 'resolved':
      return <CheckCircle className="w-3.5 h-3.5 text-accent-green" />;
    case 'rejected':
      return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  }
};

export function FeedbackPanel() {
  const {
    feedbacks,
    filter,
    setFilter,
    resolveFeedback,
    rejectFeedback,
    deleteFeedback,
    addFeedback,
    getPendingCount,
  } = useFeedbackStore();
  const { descriptions, selectDescription } = useADStore();
  const { captions, selectCaption } = useCCStore();
  const { fps, seekToFrame } = useVideoStore();
  const { setActiveTab, userMode } = useUIStore();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFeedbackCardId, setNewFeedbackCardId] = useState<string>('');
  const [newFeedbackCardType, setNewFeedbackCardType] = useState<'ad' | 'cc'>('ad');
  const [newFeedbackCategory, setNewFeedbackCategory] = useState<FeedbackCategory>('wording');
  const [newFeedbackContent, setNewFeedbackContent] = useState('');

  // 필터링된 피드백
  const filteredFeedbacks = useMemo(() => {
    let items = feedbacks;

    if (filter !== 'all') {
      items = items.filter((fb) => fb.status === filter);
    }

    // 시간순으로 정렬 (카드의 tcIn 기준)
    return items.sort((a, b) => {
      const cardA =
        a.cardType === 'ad'
          ? descriptions.find((d) => d.id === a.cardId)
          : captions.find((c) => c.id === a.cardId);
      const cardB =
        b.cardType === 'ad'
          ? descriptions.find((d) => d.id === b.cardId)
          : captions.find((c) => c.id === b.cardId);
      return (cardA?.tcIn ?? 0) - (cardB?.tcIn ?? 0);
    });
  }, [feedbacks, filter, descriptions, captions]);

  // 카드 정보 가져오기
  const getCardInfo = (feedback: Feedback) => {
    if (feedback.cardType === 'ad') {
      const desc = descriptions.find((d) => d.id === feedback.cardId);
      return desc ? { tcIn: desc.tcIn, text: desc.text } : null;
    } else {
      const caption = captions.find((c) => c.id === feedback.cardId);
      return caption ? { tcIn: caption.tcIn, text: caption.text } : null;
    }
  };

  const formatTimecode = (frame: number) => {
    const totalSeconds = frame / fps;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 해당 카드로 이동
  const handleNavigateToCard = (feedback: Feedback) => {
    const cardInfo = getCardInfo(feedback);
    if (cardInfo) {
      seekToFrame(cardInfo.tcIn);
    }
    if (feedback.cardType === 'ad') {
      setActiveTab('ad');
      selectDescription(feedback.cardId, false);
    } else {
      setActiveTab('cc');
      selectCaption(feedback.cardId, false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const expandAll = () => {
    setExpandedIds(new Set(filteredFeedbacks.map((fb) => fb.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // 피드백 추가 핸들러
  const handleAddFeedback = () => {
    if (!newFeedbackCardId || !newFeedbackContent.trim()) return;

    addFeedback({
      cardId: newFeedbackCardId,
      cardType: newFeedbackCardType,
      category: newFeedbackCategory,
      content: newFeedbackContent.trim(),
    });

    // 폼 초기화
    setNewFeedbackCardId('');
    setNewFeedbackContent('');
    setShowAddForm(false);
  };

  const pendingCount = getPendingCount();
  const totalCount = feedbacks.length;

  // 카드 선택 옵션
  const cardOptions = useMemo(() => {
    const adOptions = descriptions.map((d) => ({
      id: d.id,
      type: 'ad' as const,
      label: `[AD] ${formatTimecode(d.tcIn)} - ${d.text?.slice(0, 20) || '(내용 없음)'}`,
    }));
    const ccOptions = captions.map((c) => ({
      id: c.id,
      type: 'cc' as const,
      label: `[CC] ${formatTimecode(c.tcIn)} - ${c.text?.slice(0, 20) || '(내용 없음)'}`,
    }));
    return [...adOptions, ...ccOptions].sort((a, b) => {
      const cardA = a.type === 'ad' ? descriptions.find(d => d.id === a.id) : captions.find(c => c.id === a.id);
      const cardB = b.type === 'ad' ? descriptions.find(d => d.id === b.id) : captions.find(c => c.id === b.id);
      return (cardA?.tcIn ?? 0) - (cardB?.tcIn ?? 0);
    });
  }, [descriptions, captions, fps]);

  return (
    <div className="h-full flex flex-col border-l border-dark-border">
      {/* 헤더 */}
      <div className="px-3 py-2 border-b border-dark-border bg-dark-surface">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-accent-blue" />
          <span className="text-sm font-medium text-white">피드백</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-accent-yellow/20 text-accent-yellow rounded">
              {pendingCount}
            </span>
          )}
        </div>
      </div>

      {/* 툴바 */}
      <div className="flex items-center gap-2 p-2 border-b border-dark-border bg-dark-surface/50">
        {/* 필터 */}
        <div className="relative flex-1">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="w-full pl-7 pr-3 py-1.5 text-sm bg-dark-bg border border-dark-border rounded focus:border-accent-blue focus:outline-none text-white appearance-none cursor-pointer"
          >
            <option value="all">전체 ({totalCount})</option>
            <option value="pending">대기중</option>
            <option value="in_progress">처리중</option>
            <option value="resolved">해결됨</option>
            <option value="rejected">반려됨</option>
          </select>
          <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        </div>

        {/* 펼치기/접기 */}
        <button
          onClick={() => (expandedIds.size === filteredFeedbacks.length ? collapseAll() : expandAll())}
          className="p-1.5 text-gray-500 hover:text-white transition-colors"
          title={expandedIds.size === filteredFeedbacks.length ? '모두 접기' : '모두 펼치기'}
        >
          <ChevronsUpDown className="w-4 h-4" />
        </button>
      </div>

      {/* 감수자 모드: 피드백 추가 버튼 */}
      {userMode === 'reviewer' && (
        <div className="p-2 border-b border-dark-border">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-2 text-sm bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue rounded transition-colors"
            >
              + 피드백 추가
            </button>
          ) : (
            <div className="space-y-2 bg-dark-bg p-3 rounded-lg">
              {/* 카드 선택 */}
              <select
                value={`${newFeedbackCardType}:${newFeedbackCardId}`}
                onChange={(e) => {
                  const [type, id] = e.target.value.split(':');
                  setNewFeedbackCardType(type as 'ad' | 'cc');
                  setNewFeedbackCardId(id);
                }}
                className="w-full px-3 py-2 text-sm bg-dark-surface border border-dark-border rounded focus:border-accent-blue focus:outline-none text-white"
              >
                <option value="">카드 선택...</option>
                {cardOptions.map((opt) => (
                  <option key={`${opt.type}:${opt.id}`} value={`${opt.type}:${opt.id}`}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* 카테고리 선택 */}
              <select
                value={newFeedbackCategory}
                onChange={(e) => setNewFeedbackCategory(e.target.value as FeedbackCategory)}
                className="w-full px-3 py-2 text-sm bg-dark-surface border border-dark-border rounded focus:border-accent-blue focus:outline-none text-white"
              >
                {(Object.entries(FEEDBACK_CATEGORY_LABELS) as [FeedbackCategory, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>

              {/* 상세 내용 */}
              <textarea
                value={newFeedbackContent}
                onChange={(e) => setNewFeedbackContent(e.target.value)}
                placeholder="상세 피드백 내용을 입력하세요..."
                className="w-full px-3 py-2 text-sm bg-dark-surface border border-dark-border rounded focus:border-accent-blue focus:outline-none text-white resize-none"
                rows={3}
              />

              {/* 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 text-sm bg-dark-surface hover:bg-gray-700 text-gray-300 rounded transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleAddFeedback}
                  disabled={!newFeedbackCardId || !newFeedbackContent.trim()}
                  className="flex-1 py-2 text-sm bg-accent-blue hover:bg-accent-blue/80 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  추가
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 피드백 리스트 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredFeedbacks.length > 0 ? (
          filteredFeedbacks.map((feedback) => {
            const cardInfo = getCardInfo(feedback);
            const isExpanded = expandedIds.has(feedback.id);

            return (
              <div
                key={feedback.id}
                className={`rounded-lg border transition-colors ${
                  feedback.status === 'resolved'
                    ? 'bg-dark-surface/50 border-dark-border/50'
                    : feedback.status === 'rejected'
                    ? 'bg-red-900/10 border-red-900/30'
                    : 'bg-dark-surface border-dark-border hover:border-gray-500'
                }`}
              >
                {/* 헤더 */}
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer"
                  onClick={() => toggleExpand(feedback.id)}
                >
                  {/* 펼치기/접기 아이콘 */}
                  <button className="p-0.5 text-gray-500">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {/* 상태 아이콘 */}
                  {getStatusIcon(feedback.status)}

                  {/* 카테고리 */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        feedback.status === 'resolved' ? 'text-gray-500' : 'text-white'
                      }`}
                    >
                      {FEEDBACK_CATEGORY_LABELS[feedback.category]}
                    </p>
                  </div>

                  {/* 카드 타입 배지 */}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      feedback.cardType === 'ad'
                        ? 'bg-brand-brown/30 text-brand-brown'
                        : 'bg-accent-green/30 text-accent-green'
                    }`}
                  >
                    {feedback.cardType.toUpperCase()}
                  </span>
                </div>

                {/* 확장 내용 */}
                {isExpanded && (
                  <div className="px-2 pb-3 pl-10">
                    {/* 피드백 내용 */}
                    <p className="text-sm text-gray-300 mb-3 whitespace-pre-wrap leading-relaxed">
                      {feedback.content}
                    </p>

                    {/* 카드 정보 - 클릭 시 해당 카드로 이동 */}
                    {cardInfo && (
                      <div
                        className="flex items-center gap-2 text-sm text-gray-500 bg-dark-bg/50 rounded p-2 mb-2 cursor-pointer hover:bg-dark-bg group"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateToCard(feedback);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-timecode text-gray-500">
                            {formatTimecode(cardInfo.tcIn)}
                          </span>
                          <span className="mx-2">•</span>
                          <span className="text-gray-400 line-clamp-1">
                            {cardInfo.text || '(내용 없음)'}
                          </span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-accent-blue flex-shrink-0" />
                      </div>
                    )}

                    {/* 상태 정보 */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>{FEEDBACK_STATUS_LABELS[feedback.status]}</span>
                      {feedback.reviewerName && <span>by {feedback.reviewerName}</span>}
                    </div>

                    {/* 액션 버튼 (작가 모드일 때만 해결/반려 가능) */}
                    {userMode === 'writer' && feedback.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveFeedback(feedback.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          해결
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            rejectFeedback(feedback.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          반려
                        </button>
                      </div>
                    )}

                    {/* 삭제 버튼 (감수자 모드일 때만) */}
                    {userMode === 'reviewer' && (
                      <div className="flex items-center justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFeedback(feedback.id);
                          }}
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm mb-1">피드백이 없습니다</p>
            <p className="text-gray-600 text-xs">
              {userMode === 'reviewer'
                ? '카드에 피드백을 추가해보세요'
                : '감수자의 피드백이 여기에 표시됩니다'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
