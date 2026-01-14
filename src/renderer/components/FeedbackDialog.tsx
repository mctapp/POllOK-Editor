import { useState, useEffect } from 'react';
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useGuideStore, useFeedbackStore } from '../stores';
import type { GuideItem } from '../../shared/types';

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  cardType: 'ad' | 'cc';
}

export function FeedbackDialog({ isOpen, onClose, cardId, cardType }: FeedbackDialogProps) {
  const { guides, isLoaded, loadGuides, getMajorCategories } = useGuideStore();
  const { addFeedback } = useFeedbackStore();

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && !isLoaded) {
      loadGuides();
    }
  }, [isOpen, isLoaded, loadGuides]);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedCode(null);
      setComment('');
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredGuides = guides.filter((g) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      g.code.toLowerCase().includes(query) ||
      g.minorCategory.toLowerCase().includes(query) ||
      g.principle.toLowerCase().includes(query)
    );
  });

  // 대분류별 그룹화
  const groupedGuides = filteredGuides.reduce((acc, guide) => {
    const category = guide.majorCategory;
    if (!acc[category]) acc[category] = [];
    acc[category].push(guide);
    return acc;
  }, {} as Record<string, GuideItem[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const selectedGuide = guides.find((g) => g.code === selectedCode);

  const handleSubmit = () => {
    if (!selectedCode) return;
    addFeedback(cardId, cardType, selectedCode, comment);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-dark-bg border border-dark-border rounded-lg w-[600px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h2 className="text-lg font-medium text-white">보완 요청</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 가이드 선택 */}
          <div className="w-1/2 border-r border-dark-border flex flex-col">
            <div className="p-3 border-b border-dark-border">
              <p className="text-sm text-gray-400 mb-2">가이드 유형 선택</p>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="검색..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-dark-surface border border-dark-border rounded focus:border-accent-yellow focus:outline-none text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {Object.entries(groupedGuides).map(([category, categoryGuides]) => (
                <div key={category} className="mb-1">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center gap-2 p-1.5 text-left hover:bg-dark-surface rounded transition-colors"
                  >
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-xs text-gray-300 flex-1 truncate">{category}</span>
                    <span className="text-xs text-gray-600">{categoryGuides.length}</span>
                  </button>

                  {expandedCategories.has(category) && (
                    <div className="ml-5 space-y-0.5">
                      {categoryGuides.map((guide) => (
                        <button
                          key={guide.code}
                          onClick={() => setSelectedCode(guide.code)}
                          className={`w-full flex items-center gap-2 p-1.5 text-left rounded transition-colors ${
                            selectedCode === guide.code
                              ? 'bg-accent-yellow/20 text-accent-yellow'
                              : 'hover:bg-dark-surface text-gray-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-mono w-8">{guide.code}</span>
                          <span className="text-xs truncate flex-1">{guide.minorCategory}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 선택된 가이드 상세 및 커멘트 */}
          <div className="w-1/2 flex flex-col">
            {selectedGuide ? (
              <>
                <div className="p-3 border-b border-dark-border flex-1 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent-yellow/20 text-accent-yellow">
                      {selectedGuide.code}
                    </span>
                    <span className="text-sm font-medium text-white">{selectedGuide.minorCategory}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="text-gray-500 mb-0.5">원칙/규칙</p>
                      <p className="text-gray-300">{selectedGuide.principle}</p>
                    </div>

                    <div>
                      <p className="text-gray-500 mb-0.5">위반 시 문제</p>
                      <p className="text-red-400">{selectedGuide.violationProblem}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-sm text-gray-400 mb-2">세부 커멘트 (선택)</p>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="구체적인 피드백을 입력하세요..."
                    className="w-full h-20 p-2 text-sm bg-dark-surface border border-dark-border rounded focus:border-accent-yellow focus:outline-none text-white resize-none"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500 text-sm">가이드 유형을 선택하세요</p>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedCode}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              selectedCode
                ? 'bg-accent-yellow text-black hover:bg-accent-yellow/80'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            보완 요청
          </button>
        </div>
      </div>
    </div>
  );
}
