import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Check,
  Trash2,
  Pencil,
  Filter,
  ChevronsUpDown,
  StickyNote,
  ExternalLink,
} from 'lucide-react';
import { useMemoStore, useADStore, useCCStore, useVideoStore, useUIStore } from '../../stores';
import type { Memo } from '../../../shared/types';
import { MemoDialog } from '../MemoDialog';

export function MemoPanel() {
  const {
    memos,
    expandedIds,
    filter,
    toggleComplete,
    toggleExpand,
    expandAll,
    collapseAll,
    setFilter,
    deleteMemo,
  } = useMemoStore();
  const { descriptions, selectDescription } = useADStore();
  const { captions, selectCaption } = useCCStore();
  const { fps, seekToFrame } = useVideoStore();
  const { setActiveTab } = useUIStore();

  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);

  // 필터링된 메모
  const filteredMemos = useMemo(() => {
    let items = memos;

    switch (filter) {
      case 'ad':
        items = items.filter((m) => m.cardType === 'ad');
        break;
      case 'cc':
        items = items.filter((m) => m.cardType === 'cc');
        break;
      case 'incomplete':
        items = items.filter((m) => !m.completed);
        break;
      case 'completed':
        items = items.filter((m) => m.completed);
        break;
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
  }, [memos, filter, descriptions, captions]);

  // 카드 정보 가져오기
  const getCardInfo = (memo: Memo) => {
    if (memo.cardType === 'ad') {
      const desc = descriptions.find((d) => d.id === memo.cardId);
      return desc ? { tcIn: desc.tcIn, text: desc.text } : null;
    } else {
      const caption = captions.find((c) => c.id === memo.cardId);
      return caption ? { tcIn: caption.tcIn, text: caption.text } : null;
    }
  };

  const formatTimecode = (frame: number) => {
    const totalSeconds = frame / fps;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 해당 카드로 이동 (탭 전환 + 카드 선택 + 비디오 seek)
  const handleNavigateToCard = (memo: Memo) => {
    const cardInfo = getCardInfo(memo);
    if (cardInfo) {
      seekToFrame(cardInfo.tcIn);
    }
    // 탭 전환 및 카드 선택
    if (memo.cardType === 'ad') {
      setActiveTab('ad');
      selectDescription(memo.cardId, false);
    } else {
      setActiveTab('cc');
      selectCaption(memo.cardId, false);
    }
  };

  const completedCount = memos.filter((m) => m.completed).length;
  const totalCount = memos.length;

  return (
    <div className="h-full flex flex-col">
      {/* 메모 다이얼로그 */}
      {editingMemo && (
        <MemoDialog
          isOpen={true}
          onClose={() => setEditingMemo(null)}
          cardId={editingMemo.cardId}
          cardType={editingMemo.cardType}
          memoId={editingMemo.id}
        />
      )}

      {/* 툴바 */}
      <div className="flex items-center gap-2 p-2 border-b border-dark-border bg-dark-surface/50">
        {/* 필터 */}
        <div className="relative flex-1">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="w-full pl-7 pr-3 py-1.5 text-sm bg-dark-bg border border-dark-border rounded focus:border-accent-yellow focus:outline-none text-white appearance-none cursor-pointer"
          >
            <option value="all">전체 메모</option>
            <option value="ad">AD 메모만</option>
            <option value="cc">CC 메모만</option>
            <option value="incomplete">미완료</option>
            <option value="completed">완료됨</option>
          </select>
          <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        </div>

        {/* 펼치기/접기 */}
        <button
          onClick={() => (expandedIds.size === filteredMemos.length ? collapseAll() : expandAll())}
          className="p-1.5 text-gray-500 hover:text-white transition-colors"
          title={expandedIds.size === filteredMemos.length ? '모두 접기' : '모두 펼치기'}
        >
          <ChevronsUpDown className="w-4 h-4" />
        </button>
      </div>

      {/* 진행 상황 */}
      {totalCount > 0 && (
        <div className="px-3 py-2 border-b border-dark-border">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>진행 상황</span>
            <span>
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="h-1.5 bg-dark-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-green transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 메모 리스트 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredMemos.length > 0 ? (
          filteredMemos.map((memo) => {
            const cardInfo = getCardInfo(memo);
            const isExpanded = expandedIds.has(memo.id);

            return (
              <div
                key={memo.id}
                className={`rounded-lg border transition-colors ${
                  memo.completed
                    ? 'bg-dark-surface/50 border-dark-border/50'
                    : 'bg-dark-surface border-dark-border hover:border-gray-500'
                }`}
              >
                {/* 헤더 */}
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer"
                  onClick={() => toggleExpand(memo.id)}
                >
                  {/* 펼치기/접기 아이콘 */}
                  <button className="p-0.5 text-gray-500">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {/* 완료 체크박스 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleComplete(memo.id);
                    }}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      memo.completed
                        ? 'bg-accent-green border-accent-green text-white'
                        : 'bg-dark-bg border-gray-400 hover:border-accent-green hover:bg-dark-bg/80'
                    }`}
                    title={memo.completed ? '완료 취소' : '완료로 표시'}
                  >
                    {memo.completed && <Check className="w-4 h-4" />}
                  </button>

                  {/* 제목 */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        memo.completed ? 'text-gray-500 line-through' : 'text-white'
                      }`}
                    >
                      {memo.title}
                    </p>
                  </div>

                  {/* 카드 타입 배지 */}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      memo.cardType === 'ad'
                        ? 'bg-brand-brown/30 text-brand-brown'
                        : 'bg-accent-green/30 text-accent-green'
                    }`}
                  >
                    {memo.cardType.toUpperCase()}
                  </span>
                </div>

                {/* 확장 내용 */}
                {isExpanded && (
                  <div className="px-2 pb-3 pl-10">
                    {/* 메모 내용 */}
                    {memo.content && (
                      <p className="text-sm text-gray-300 mb-3 whitespace-pre-wrap leading-relaxed">
                        {memo.content}
                      </p>
                    )}

                    {/* 카드 정보 - 클릭 시 해당 카드로 이동 */}
                    {cardInfo && (
                      <div
                        className="flex items-center gap-2 text-sm text-gray-500 bg-dark-bg/50 rounded p-2 mb-2 cursor-pointer hover:bg-dark-bg group"
                        onClick={() => handleNavigateToCard(memo)}
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
                        <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-accent-yellow flex-shrink-0" />
                      </div>
                    )}

                    {/* 액션 버튼 */}
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMemo(memo);
                        }}
                        className="p-1 text-gray-500 hover:text-white transition-colors"
                        title="편집"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMemo(memo.id);
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
            <StickyNote className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm mb-1">메모가 없습니다</p>
            <p className="text-gray-600 text-xs">AD/CC 카드에서 메모를 추가해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
