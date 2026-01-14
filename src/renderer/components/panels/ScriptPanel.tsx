import { useEffect, useMemo, useRef } from 'react';
import { Plus, Search, Focus, CheckSquare, StickyNote, AudioLines, Subtitles, MessageSquare } from 'lucide-react';
import { useUIStore, useADStore, useCCStore, useVideoStore, useProjectStore, useMemoStore, useFeedbackStore } from '../../stores';
import { ADCard } from './ADCard';
import { CCCard } from './CCCard';
import { MemoPanel } from './MemoPanel';
import { FeedbackPanel } from './FeedbackPanel';

export function ScriptPanel() {
  const { activeTab, setActiveTab, focusMode, toggleFocusMode, showReviewOnly, toggleReviewOnly, searchQuery, setSearchQuery } = useUIStore();
  const { project } = useProjectStore();
  const { descriptions, addDescription, selectedIds: adSelectedIds } = useADStore();
  const { captions, addCaption, selectedIds: ccSelectedIds } = useCCStore();
  const { memos } = useMemoStore();
  const { feedbacks } = useFeedbackStore();
  const { currentFrame } = useVideoStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleAddAD = () => {
    addDescription({
      tcIn: currentFrame,
      tcOut: currentFrame + 72, // 기본 3초 (24fps 기준)
      text: '',
      type: 'scene',
    });
  };

  const handleAddCC = () => {
    addCaption({
      tcIn: currentFrame,
      tcOut: currentFrame + 72, // 기본 3초
      text: '',
      type: 'dialogue',
    });
  };

  // 필터링된 항목들
  const filteredDescriptions = useMemo(() => {
    let items = descriptions;

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(desc => desc.text.toLowerCase().includes(query));
    }

    // 검토 필터
    if (showReviewOnly) {
      items = items.filter(desc => desc.needsReview);
    }

    // 포커스 모드: 최근 4개만 표시
    if (focusMode) {
      items = items.slice(-4);
    }

    return items;
  }, [descriptions, searchQuery, showReviewOnly, focusMode]);

  const filteredCaptions = useMemo(() => {
    let items = captions;

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(caption => caption.text.toLowerCase().includes(query));
    }

    // 검토 필터
    if (showReviewOnly) {
      items = items.filter(caption => caption.needsReview);
    }

    // 포커스 모드: 최근 4개만 표시
    if (focusMode) {
      items = items.slice(-4);
    }

    return items;
  }, [captions, searchQuery, showReviewOnly, focusMode]);

  // 새 항목 추가 시 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [descriptions.length, captions.length]);

  if (!project) {
    return (
      <div className="h-full flex flex-col bg-dark-bg items-center justify-center">
        <p className="text-gray-500 text-sm">프로젝트를 생성하거나 열어주세요</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      {/* 탭 헤더 */}
      <div className="flex items-center border-b border-dark-border bg-dark-surface">
        <button
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'ad'
              ? 'text-brand-brown'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('ad')}
        >
          <AudioLines className="w-4 h-4" />
          AD ({descriptions.length})
          {activeTab === 'ad' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-brown" />
          )}
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'cc'
              ? 'text-accent-green'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('cc')}
        >
          <Subtitles className="w-4 h-4" />
          CC ({captions.length})
          {activeTab === 'cc' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-green" />
          )}
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'memo'
              ? 'text-accent-yellow'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('memo')}
        >
          <StickyNote className="w-4 h-4" />
          Memo ({memos.length})
          {activeTab === 'memo' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-yellow" />
          )}
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'feedback'
              ? 'text-orange-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('feedback')}
        >
          <MessageSquare className="w-4 h-4" />
          피드백 ({feedbacks.length})
          {activeTab === 'feedback' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400" />
          )}
        </button>

        <div className="flex-1" />

        {(activeTab === 'ad' || activeTab === 'cc') && (
          <button
            onClick={activeTab === 'ad' ? handleAddAD : handleAddCC}
            className="flex items-center gap-1.5 px-3 py-1.5 mr-2 text-sm bg-brand-brown hover:bg-brand-brown/80 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        )}
      </div>

      {/* 메모/피드백 탭 */}
      {activeTab === 'memo' ? (
        <MemoPanel />
      ) : activeTab === 'feedback' ? (
        <FeedbackPanel />
      ) : (
        <>
          {/* 툴바 (검색, 필터) */}
          <div className="flex items-center gap-2 p-2 border-b border-dark-border bg-dark-surface/50">
            {/* 검색 */}
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`${activeTab === 'ad' ? 'AD' : 'CC'} 검색...`}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-dark-bg border border-dark-border rounded focus:border-brand-brown focus:outline-none text-white placeholder:text-gray-600"
              />
            </div>

            {/* 포커스 모드 */}
            <button
              onClick={toggleFocusMode}
              className={`p-1.5 rounded transition-colors ${
                focusMode
                  ? 'bg-accent-yellow text-brand-black'
                  : 'text-gray-500 hover:text-white hover:bg-dark-bg'
              }`}
              title="포커스 모드 (최근 4개만 표시)"
            >
              <Focus className="w-4 h-4" />
            </button>

            {/* 검토 필터 */}
            <button
              onClick={toggleReviewOnly}
              className={`p-1.5 rounded transition-colors ${
                showReviewOnly
                  ? 'bg-accent-green text-white'
                  : 'text-gray-500 hover:text-white hover:bg-dark-bg'
              }`}
              title="검토 필요 항목만 표시"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
          </div>

          {/* 콘텐츠 영역 */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTab === 'ad' ? (
          filteredDescriptions.length > 0 ? (
            filteredDescriptions.map((desc) => <ADCard key={desc.id} description={desc} />)
          ) : descriptions.length > 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">필터 조건에 맞는 항목이 없습니다.</p>
            </div>
          ) : (
            <EmptyState type="ad" onAdd={handleAddAD} />
          )
        ) : filteredCaptions.length > 0 ? (
          filteredCaptions.map((caption) => <CCCard key={caption.id} caption={caption} />)
        ) : captions.length > 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">필터 조건에 맞는 항목이 없습니다.</p>
          </div>
        ) : (
              <EmptyState type="cc" onAdd={handleAddCC} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ type, onAdd }: { type: 'ad' | 'cc'; onAdd: () => void }) {
  const isMac = window.api.platform === 'darwin';
  const modKey = isMac ? '⌘' : 'Ctrl';
  const shortcut = type === 'ad' ? `${modKey}+D` : `${modKey}+T`;
  const label = type === 'ad' ? '화면해설' : '자막';

  return (
    <div className="text-center py-12">
      <p className="text-gray-500 text-sm mb-2">{label} 항목이 없습니다.</p>
      <p className="text-gray-600 text-xs mb-4">{shortcut}로 새 항목을 추가하세요.</p>
      <button onClick={onAdd} className="btn-secondary text-sm">
        <Plus className="w-4 h-4 inline mr-1" />새 {label} 추가
      </button>
    </div>
  );
}
