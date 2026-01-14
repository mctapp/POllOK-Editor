import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  X,
  Search,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useGuideStore, useUIStore } from '../../stores';
import type { GuideItem } from '../../../shared/types';

export function GuidePanel() {
  const { guides, isLoaded, loadGuides, selectedCode, selectGuide, getMajorCategories } = useGuideStore();
  const { showGuidePanel, toggleGuidePanel } = useUIStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isLoaded) {
      loadGuides();
    }
  }, [isLoaded, loadGuides]);

  // 선택된 가이드
  const selectedGuide = guides.find((g) => g.code === selectedCode);

  // 검색 필터
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

  if (!showGuidePanel) return null;

  return (
    <div className="w-80 border-l border-dark-border bg-dark-bg flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-3 border-b border-dark-border">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent-yellow" />
          <span className="text-sm font-medium text-white">가이드 안내</span>
        </div>
        <button
          onClick={toggleGuidePanel}
          className="p-1 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 검색 */}
      <div className="p-2 border-b border-dark-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="가이드 검색..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-dark-surface border border-dark-border rounded focus:border-accent-yellow focus:outline-none text-white"
          />
        </div>
      </div>

      {/* 선택된 가이드 상세 */}
      {selectedGuide && (
        <div className="p-3 border-b border-dark-border bg-dark-surface/50">
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

            {selectedGuide.correctExample && (
              <div>
                <p className="text-gray-500 mb-0.5 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-accent-green" />
                  올바른 예시
                </p>
                <p className="text-accent-green/80 bg-accent-green/10 rounded px-2 py-1">
                  {selectedGuide.correctExample}
                </p>
              </div>
            )}

            {selectedGuide.wrongExample && (
              <div>
                <p className="text-gray-500 mb-0.5 flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-400" />
                  잘못된 예시
                </p>
                <p className="text-red-400/80 bg-red-400/10 rounded px-2 py-1">
                  {selectedGuide.wrongExample}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => selectGuide(null)}
            className="mt-2 text-xs text-gray-500 hover:text-white"
          >
            닫기
          </button>
        </div>
      )}

      {/* 가이드 목록 */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(groupedGuides).map(([category, categoryGuides]) => (
          <div key={category} className="mb-2">
            {/* 대분류 헤더 */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-2 p-2 text-left hover:bg-dark-surface rounded transition-colors"
            >
              {expandedCategories.has(category) ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <span className="text-sm text-gray-300 flex-1">{category}</span>
              <span className="text-xs text-gray-600">{categoryGuides.length}</span>
            </button>

            {/* 소분류 목록 */}
            {expandedCategories.has(category) && (
              <div className="ml-6 space-y-0.5">
                {categoryGuides.map((guide) => (
                  <button
                    key={guide.code}
                    onClick={() => selectGuide(guide.code)}
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

        {filteredGuides.length === 0 && (
          <div className="text-center py-8">
            <BookOpen className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              {searchQuery ? '검색 결과가 없습니다' : '가이드를 로드 중...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
