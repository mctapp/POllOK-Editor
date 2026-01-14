import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  ExternalLink,
  MessageSquare,
  Filter,
  ChevronsUpDown,
  CheckCircle,
  Clock,
  PlayCircle,
  Send,
} from 'lucide-react';
import { useFeedbackStore, useADStore, useCCStore, useVideoStore, useUIStore, useGuideStore } from '../../stores';
import type { Feedback, FeedbackStatus } from '../../../shared/types';

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: '보완요청',
  in_progress: '진행중',
  resolved: '보완완료',
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  pending: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  resolved: 'bg-accent-green/20 text-accent-green border-accent-green/50',
};

export function FeedbackPanel() {
  const {
    feedbacks,
    expandedIds,
    toggleExpand,
    expandAll,
    collapseAll,
    deleteFeedback,
    setStatus,
    setWriterReply,
  } = useFeedbackStore();
  const { descriptions, selectDescription } = useADStore();
  const { captions, selectCaption } = useCCStore();
  const { fps, seekToFrame } = useVideoStore();
  const { setActiveTab, appMode } = useUIStore();
  const { getGuideByCode } = useGuideStore();

  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');

  // 필터링 및 정렬
  const filteredFeedbacks = useMemo(() => {
    let items = [...feedbacks];

    // 상태 필터
    if (statusFilter !== 'all') {
      items = items.filter((f) => f.status === statusFilter);
    }

    // 시간순으로 정렬
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
  }, [feedbacks, statusFilter, descriptions, captions]);

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

  // 작가 답변 제출
  const handleSubmitReply = (feedbackId: string) => {
    const reply = replyInputs[feedbackId];
    if (reply?.trim()) {
      setWriterReply(feedbackId, reply.trim());
      setReplyInputs((prev) => ({ ...prev, [feedbackId]: '' }));
    }
  };

  const pendingCount = feedbacks.filter((f) => f.status === 'pending').length;
  const inProgressCount = feedbacks.filter((f) => f.status === 'in_progress').length;
  const resolvedCount = feedbacks.filter((f) => f.status === 'resolved').length;
  const totalCount = feedbacks.length;

  return (
    <div className="h-full flex flex-col">
      {/* 툴바 */}
      <div className="flex items-center gap-2 p-2 border-b border-dark-border bg-dark-surface/50">
        <div className="flex-1 relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | 'all')}
            className="w-full pl-7 pr-3 py-1.5 text-sm bg-dark-bg border border-dark-border rounded focus:border-accent-yellow focus:outline-none text-white appearance-none cursor-pointer"
          >
            <option value="all">전체 피드백</option>
            <option value="pending">보완요청</option>
            <option value="in_progress">진행중</option>
            <option value="resolved">보완완료</option>
          </select>
          <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        </div>

        <button
          onClick={() => (expandedIds.size === filteredFeedbacks.length ? collapseAll() : expandAll())}
          className="p-1.5 text-gray-500 hover:text-white transition-colors"
          title={expandedIds.size === filteredFeedbacks.length ? '모두 접기' : '모두 펼치기'}
        >
          <ChevronsUpDown className="w-4 h-4" />
        </button>
      </div>

      {/* 진행 상황 */}
      {totalCount > 0 && (
        <div className="px-3 py-2 border-b border-dark-border">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>진행 상황</span>
            <span className="flex items-center gap-2">
              <span className="text-orange-400">{pendingCount}</span>
              <span className="text-gray-600">/</span>
              <span className="text-blue-400">{inProgressCount}</span>
              <span className="text-gray-600">/</span>
              <span className="text-accent-green">{resolvedCount}</span>
            </span>
          </div>
          <div className="h-1.5 bg-dark-surface rounded-full overflow-hidden flex">
            <div
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${(pendingCount / totalCount) * 100}%` }}
            />
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(inProgressCount / totalCount) * 100}%` }}
            />
            <div
              className="h-full bg-accent-green transition-all duration-300"
              style={{ width: `${(resolvedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 피드백 리스트 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredFeedbacks.length > 0 ? (
          filteredFeedbacks.map((feedback) => {
            const cardInfo = getCardInfo(feedback);
            const isExpanded = expandedIds.has(feedback.id);
            const guide = getGuideByCode(feedback.guideCode);

            return (
              <div
                key={feedback.id}
                className={`rounded-lg border transition-colors ${
                  feedback.status === 'resolved'
                    ? 'bg-dark-surface/50 border-dark-border/50'
                    : feedback.status === 'in_progress'
                    ? 'bg-dark-surface border-blue-500/30'
                    : 'bg-dark-surface border-orange-500/30'
                }`}
              >
                {/* 헤더 */}
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer"
                  onClick={() => toggleExpand(feedback.id)}
                >
                  <button className="p-0.5 text-gray-500">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {/* 상태 배지 */}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COLORS[feedback.status]}`}
                  >
                    {STATUS_LABELS[feedback.status]}
                  </span>

                  {/* 가이드 코드 */}
                  <span className="text-xs font-mono text-gray-500">
                    {feedback.guideCode}
                  </span>

                  {/* 소분류 */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        feedback.status === 'resolved' ? 'text-gray-500' : 'text-white'
                      }`}
                    >
                      {guide?.minorCategory || feedback.guideCode}
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
                  <div className="px-2 pb-2 pl-9 space-y-2">
                    {/* 감수자 커멘트 */}
                    {feedback.comment && (
                      <div className="bg-dark-bg/50 rounded p-2">
                        <p className="text-xs text-gray-500 mb-1">감수자 의견</p>
                        <p className="text-xs text-gray-300 whitespace-pre-wrap">
                          {feedback.comment}
                        </p>
                      </div>
                    )}

                    {/* 작가 답변 */}
                    {feedback.writerReply && (
                      <div className="bg-accent-green/10 rounded p-2">
                        <p className="text-xs text-accent-green mb-1">작가 답변</p>
                        <p className="text-xs text-gray-300 whitespace-pre-wrap">
                          {feedback.writerReply}
                        </p>
                      </div>
                    )}

                    {/* 카드 정보 - 클릭 시 해당 카드로 이동 */}
                    {cardInfo && (
                      <div
                        className="flex items-center gap-2 text-xs text-gray-500 bg-dark-bg/50 rounded p-2 cursor-pointer hover:bg-dark-bg group"
                        onClick={() => handleNavigateToCard(feedback)}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-timecode text-gray-600">
                            {formatTimecode(cardInfo.tcIn)}
                          </span>
                          <span className="mx-2">•</span>
                          <span className="text-gray-400 line-clamp-1">{cardInfo.text || '(내용 없음)'}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-accent-yellow flex-shrink-0" />
                      </div>
                    )}

                    {/* 작가 모드: 답변 입력 및 상태 변경 */}
                    {appMode === 'writer' && feedback.status !== 'resolved' && (
                      <div className="space-y-2 pt-2 border-t border-dark-border/50">
                        {/* 답변 입력 */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyInputs[feedback.id] || ''}
                            onChange={(e) =>
                              setReplyInputs((prev) => ({ ...prev, [feedback.id]: e.target.value }))
                            }
                            placeholder="답변 입력..."
                            className="flex-1 px-2 py-1 text-xs bg-dark-bg border border-dark-border rounded focus:border-accent-green focus:outline-none text-white"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSubmitReply(feedback.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleSubmitReply(feedback.id)}
                            disabled={!replyInputs[feedback.id]?.trim()}
                            className="p-1 text-gray-500 hover:text-accent-green disabled:opacity-50 disabled:cursor-not-allowed"
                            title="답변 저장"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>

                        {/* 상태 변경 버튼 */}
                        <div className="flex items-center gap-2">
                          {feedback.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setStatus(feedback.id, 'in_progress')}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                              >
                                <PlayCircle className="w-3 h-3" />
                                진행중
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 감수자 모드: 상태 변경 및 삭제 */}
                    {appMode === 'reviewer' && (
                      <div className="flex items-center justify-end gap-1 pt-2 border-t border-dark-border/50">
                        {feedback.status === 'in_progress' && (
                          <button
                            onClick={() => setStatus(feedback.id, 'resolved')}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-accent-green/20 text-accent-green rounded hover:bg-accent-green/30 transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" />
                            보완완료
                          </button>
                        )}
                        {feedback.status === 'pending' && (
                          <button
                            onClick={() => setStatus(feedback.id, 'resolved')}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-accent-green/20 text-accent-green rounded hover:bg-accent-green/30 transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" />
                            보완완료
                          </button>
                        )}
                        <button
                          onClick={() => deleteFeedback(feedback.id)}
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
              {appMode === 'reviewer'
                ? 'AD/CC 카드에서 피드백을 추가해보세요'
                : '감수자의 피드백이 여기에 표시됩니다'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
