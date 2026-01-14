import { useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Check,
  Trash2,
  ExternalLink,
  MessageSquare,
  Filter,
  ChevronsUpDown,
  AlertCircle,
} from 'lucide-react';
import { useFeedbackStore, useADStore, useCCStore, useVideoStore, useUIStore, useGuideStore } from '../../stores';
import type { Feedback } from '../../../shared/types';

export function FeedbackPanel() {
  const {
    feedbacks,
    expandedIds,
    toggleExpand,
    expandAll,
    collapseAll,
    deleteFeedback,
    resolveFeedback,
  } = useFeedbackStore();
  const { descriptions, selectDescription } = useADStore();
  const { captions, selectCaption } = useCCStore();
  const { fps, seekToFrame } = useVideoStore();
  const { setActiveTab } = useUIStore();
  const { getGuideByCode } = useGuideStore();

  // 시간순으로 정렬
  const sortedFeedbacks = useMemo(() => {
    return [...feedbacks].sort((a, b) => {
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
  }, [feedbacks, descriptions, captions]);

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

  const pendingCount = feedbacks.filter((f) => f.status === 'pending').length;
  const totalCount = feedbacks.length;

  return (
    <div className="h-full flex flex-col">
      {/* 툴바 */}
      <div className="flex items-center gap-2 p-2 border-b border-dark-border bg-dark-surface/50">
        <div className="flex-1 flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">전체 피드백</span>
        </div>

        <button
          onClick={() => (expandedIds.size === sortedFeedbacks.length ? collapseAll() : expandAll())}
          className="p-1.5 text-gray-500 hover:text-white transition-colors"
          title={expandedIds.size === sortedFeedbacks.length ? '모두 접기' : '모두 펼치기'}
        >
          <ChevronsUpDown className="w-4 h-4" />
        </button>
      </div>

      {/* 진행 상황 */}
      {totalCount > 0 && (
        <div className="px-3 py-2 border-b border-dark-border">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>보완 요청</span>
            <span>
              {pendingCount}/{totalCount}
            </span>
          </div>
          <div className="h-1.5 bg-dark-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-yellow transition-all duration-300"
              style={{ width: `${((totalCount - pendingCount) / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 피드백 리스트 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sortedFeedbacks.length > 0 ? (
          sortedFeedbacks.map((feedback) => {
            const cardInfo = getCardInfo(feedback);
            const isExpanded = expandedIds.has(feedback.id);
            const guide = getGuideByCode(feedback.guideCode);

            return (
              <div
                key={feedback.id}
                className={`rounded-lg border transition-colors ${
                  feedback.status === 'resolved'
                    ? 'bg-dark-surface/50 border-dark-border/50'
                    : 'bg-dark-surface border-accent-yellow/50 hover:border-accent-yellow'
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

                  {/* 가이드 코드 */}
                  <span
                    className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      feedback.status === 'resolved'
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-accent-yellow/20 text-accent-yellow'
                    }`}
                  >
                    {feedback.guideCode}
                  </span>

                  {/* 소분류 */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        feedback.status === 'resolved' ? 'text-gray-500 line-through' : 'text-white'
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
                  <div className="px-2 pb-2 pl-9">
                    {/* 커멘트 */}
                    {feedback.comment && (
                      <p className="text-xs text-gray-400 mb-2 whitespace-pre-wrap">
                        {feedback.comment}
                      </p>
                    )}

                    {/* 카드 정보 - 클릭 시 해당 카드로 이동 */}
                    {cardInfo && (
                      <div
                        className="flex items-center gap-2 text-xs text-gray-500 bg-dark-bg/50 rounded p-2 mb-2 cursor-pointer hover:bg-dark-bg group"
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

                    {/* 액션 버튼 */}
                    <div className="flex items-center justify-end gap-1">
                      {feedback.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveFeedback(feedback.id);
                          }}
                          className="p-1 text-gray-500 hover:text-accent-green transition-colors"
                          title="해결됨으로 표시"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
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
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm mb-1">피드백이 없습니다</p>
            <p className="text-gray-600 text-xs">감수자 모드에서 카드에 피드백을 추가해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
