import { useState, useRef } from 'react';
import {
  X,
  Search,
  Star,
  Upload,
  Trash2,
  Film,
  ChevronDown,
  BookMarked,
  Pencil,
} from 'lucide-react';
import { useExpressionStore } from '../stores';
import type { Movie } from '../../shared/types';

interface ExpressionDictionaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'search' | 'manage' | 'synonyms';

export function ExpressionDictionaryDialog({ isOpen, onClose }: ExpressionDictionaryDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editMovieDialogOpen, setEditMovieDialogOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  // Import form state
  const [newMovieTitle, setNewMovieTitle] = useState('');
  const [newMovieDirector, setNewMovieDirector] = useState('');
  const [newMovieYear, setNewMovieYear] = useState('');
  const [newMovieGenre, setNewMovieGenre] = useState('');
  const [newMovieWriter, setNewMovieWriter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDirector, setEditDirector] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editWriter, setEditWriter] = useState('');

  const {
    movies,
    expressions,
    synonymGroups,
    searchQuery,
    searchResults,
    selectedMovieId,
    showHighlightedOnly,
    search,
    clearSearch,
    setSelectedMovieId,
    setShowHighlightedOnly,
    toggleHighlight,
    deleteMovie,
    updateMovie,
    importFromSRT,
  } = useExpressionStore();

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.srt')) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !newMovieTitle.trim()) return;

    const content = await selectedFile.text();
    importFromSRT(content, {
      title: newMovieTitle.trim(),
      director: newMovieDirector.trim() || undefined,
      year: newMovieYear ? parseInt(newMovieYear) : undefined,
      genre: newMovieGenre.trim() || undefined,
      writer: newMovieWriter.trim() || undefined,
    });

    // 초기화
    resetImportForm();
  };

  const resetImportForm = () => {
    setSelectedFile(null);
    setNewMovieTitle('');
    setNewMovieDirector('');
    setNewMovieYear('');
    setNewMovieGenre('');
    setNewMovieWriter('');
    setImportDialogOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditMovie = (movie: Movie) => {
    setEditingMovie(movie);
    setEditTitle(movie.title);
    setEditDirector(movie.director || '');
    setEditYear(movie.year?.toString() || '');
    setEditGenre(movie.genre || '');
    setEditWriter(movie.writer || '');
    setEditMovieDialogOpen(true);
  };

  const handleSaveMovieEdit = () => {
    if (!editingMovie || !editTitle.trim()) return;

    updateMovie(editingMovie.id, {
      title: editTitle.trim(),
      director: editDirector.trim() || undefined,
      year: editYear ? parseInt(editYear) : undefined,
      genre: editGenre.trim() || undefined,
      writer: editWriter.trim() || undefined,
    });

    setEditMovieDialogOpen(false);
    setEditingMovie(null);
  };

  const getMovieTitle = (movieId: string) => {
    return movies.find((m) => m.id === movieId)?.title || '알 수 없음';
  };

  const getMovieInfo = (movieId: string) => {
    const movie = movies.find((m) => m.id === movieId);
    if (!movie) return null;
    return movie;
  };

  const filteredExpressions = selectedMovieId
    ? expressions.filter((e) => e.movieId === selectedMovieId)
    : expressions;

  const displayExpressions = searchQuery ? searchResults : filteredExpressions;
  const finalExpressions = showHighlightedOnly
    ? displayExpressions.filter((e) => e.isHighlighted)
    : displayExpressions;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-bg border border-dark-border rounded-lg w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-accent-yellow" />
            <h2 className="text-sm font-medium text-white">표현 사전</h2>
            <span className="text-xs text-gray-500">
              ({expressions.length}개 표현 / {movies.length}개 작품)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-dark-border">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
              activeTab === 'search'
                ? 'text-accent-yellow border-b-2 border-accent-yellow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            검색
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
              activeTab === 'manage'
                ? 'text-accent-yellow border-b-2 border-accent-yellow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            작품 관리
          </button>
          <button
            onClick={() => setActiveTab('synonyms')}
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
              activeTab === 'synonyms'
                ? 'text-accent-yellow border-b-2 border-accent-yellow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            유의어 사전
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 검색 탭 */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              {/* 검색 입력 */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => search(e.target.value)}
                    placeholder="표현 검색 (유의어 자동 확장)..."
                    className="w-full pl-10 pr-4 py-2 bg-dark-surface border border-dark-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-yellow"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="px-3 py-2 text-xs bg-dark-surface border border-dark-border rounded text-gray-400 hover:text-white"
                  >
                    초기화
                  </button>
                )}
              </div>

              {/* 필터 */}
              <div className="flex gap-4 items-center">
                <div className="relative">
                  <select
                    value={selectedMovieId || ''}
                    onChange={(e) => setSelectedMovieId(e.target.value || null)}
                    className="appearance-none pl-3 pr-8 py-1.5 bg-dark-surface border border-dark-border rounded text-xs text-gray-300 focus:outline-none focus:border-accent-yellow"
                  >
                    <option value="">모든 작품</option>
                    {movies.map((movie) => (
                      <option key={movie.id} value={movie.id}>
                        {movie.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHighlightedOnly}
                    onChange={(e) => setShowHighlightedOnly(e.target.checked)}
                    className="rounded border-dark-border bg-dark-surface text-accent-yellow focus:ring-0 focus:ring-offset-0"
                  />
                  <Star className="w-3 h-3 text-yellow-500" />
                  돋보이는 표현만
                </label>

                <span className="text-xs text-gray-500 ml-auto">
                  {finalExpressions.length}개 결과
                </span>
              </div>

              {/* 검색 결과 */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {finalExpressions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {searchQuery
                      ? '검색 결과가 없습니다.'
                      : 'SRT 파일을 가져와서 표현을 추가하세요.'}
                  </div>
                ) : (
                  finalExpressions.map((expr) => {
                    const movieInfo = getMovieInfo(expr.movieId);
                    return (
                      <div
                        key={expr.id}
                        className="p-3 bg-dark-surface border border-dark-border rounded hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm text-white">{expr.text}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Film className="w-3 h-3" />
                                {getMovieTitle(expr.movieId)}
                              </span>
                              {movieInfo?.writer && (
                                <span>작가: {movieInfo.writer}</span>
                              )}
                              <span>{expr.timecode}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleHighlight(expr.id)}
                            className={`p-1 transition-colors ${
                              expr.isHighlighted
                                ? 'text-yellow-500 hover:text-yellow-400'
                                : 'text-gray-600 hover:text-yellow-500'
                            }`}
                            title={expr.isHighlighted ? '하이라이트 해제' : '돋보이는 표현으로 표시'}
                          >
                            <Star className={`w-4 h-4 ${expr.isHighlighted ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 작품 관리 탭 */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {/* SRT 가져오기 버튼 */}
              <button
                onClick={() => setImportDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent-yellow text-dark-bg rounded text-sm font-medium hover:bg-accent-yellow/90 transition-colors"
              >
                <Upload className="w-4 h-4" />
                SRT 파일 가져오기
              </button>

              {/* 작품 목록 */}
              <div className="space-y-2">
                {movies.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    등록된 작품이 없습니다.
                  </div>
                ) : (
                  movies.map((movie) => {
                    const expressionCount = expressions.filter(
                      (e) => e.movieId === movie.id
                    ).length;
                    const highlightCount = expressions.filter(
                      (e) => e.movieId === movie.id && e.isHighlighted
                    ).length;

                    return (
                      <div
                        key={movie.id}
                        className="p-3 bg-dark-surface border border-dark-border rounded"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-white">{movie.title}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              {movie.director && <span>감독: {movie.director}</span>}
                              {movie.year && <span>{movie.year}년</span>}
                              {movie.genre && <span>{movie.genre}</span>}
                              {movie.writer && (
                                <span className="text-accent-yellow">작가: {movie.writer}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span>{expressionCount}개 표현</span>
                              {highlightCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                  {highlightCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditMovie(movie)}
                              className="p-2 text-gray-500 hover:text-white transition-colors"
                              title="수정"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(`"${movie.title}" 작품과 모든 표현을 삭제하시겠습니까?`)
                                ) {
                                  deleteMovie(movie.id);
                                }
                              }}
                              className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 유의어 사전 탭 */}
          {activeTab === 'synonyms' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                검색 시 유의어가 자동으로 확장됩니다. 예: &ldquo;걷다&rdquo; 검색 시
                &ldquo;걸어가다&rdquo;, &ldquo;거닐다&rdquo; 등도 함께 검색됩니다.
              </p>

              {/* 유의어 그룹 목록 */}
              <div className="space-y-2 max-h-[450px] overflow-y-auto">
                {synonymGroups.map((group) => (
                  <div
                    key={group.id}
                    className="p-3 bg-dark-surface border border-dark-border rounded"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-accent-yellow">
                            {group.baseWord}
                          </span>
                          {group.category && (
                            <span className="px-2 py-0.5 bg-dark-border rounded text-xs text-gray-400">
                              {group.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{group.synonyms.join(', ')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500">
                * 유의어 사전은 프로그램 업데이트를 통해 확장됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end items-center px-4 py-3 border-t border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-accent-yellow text-dark-bg rounded hover:bg-accent-yellow/90 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>

      {/* SRT 가져오기 다이얼로그 */}
      {importDialogOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-dark-bg border border-dark-border rounded-lg w-[450px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
              <h3 className="text-sm font-medium text-white">SRT 파일 가져오기</h3>
              <button
                onClick={resetImportForm}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 파일 선택 */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">SRT 파일</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".srt"
                  onChange={handleFileSelect}
                  className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-dark-surface file:text-gray-300 file:rounded file:cursor-pointer hover:file:bg-gray-700"
                />
                {selectedFile && (
                  <p className="text-xs text-green-400 mt-1">선택됨: {selectedFile.name}</p>
                )}
              </div>

              {/* 작품 정보 */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  작품 제목 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newMovieTitle}
                  onChange={(e) => setNewMovieTitle(e.target.value)}
                  placeholder="예: 기생충"
                  className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-yellow"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">감독 (선택)</label>
                  <input
                    type="text"
                    value={newMovieDirector}
                    onChange={(e) => setNewMovieDirector(e.target.value)}
                    placeholder="예: 봉준호"
                    className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">연도 (선택)</label>
                  <input
                    type="number"
                    value={newMovieYear}
                    onChange={(e) => setNewMovieYear(e.target.value)}
                    placeholder="예: 2019"
                    className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-yellow"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">장르 (선택)</label>
                  <input
                    type="text"
                    value={newMovieGenre}
                    onChange={(e) => setNewMovieGenre(e.target.value)}
                    placeholder="예: 드라마, 스릴러"
                    className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">화면해설 작가 (선택)</label>
                  <input
                    type="text"
                    value={newMovieWriter}
                    onChange={(e) => setNewMovieWriter(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-yellow"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-dark-border">
              <button
                onClick={resetImportForm}
                className="px-4 py-1.5 text-xs bg-dark-surface border border-dark-border rounded text-gray-300 hover:text-white"
              >
                취소
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedFile || !newMovieTitle.trim()}
                className="px-4 py-1.5 text-xs bg-accent-yellow text-dark-bg rounded hover:bg-accent-yellow/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                가져오기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 작품 정보 수정 다이얼로그 */}
      {editMovieDialogOpen && editingMovie && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-dark-bg border border-dark-border rounded-lg w-[450px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
              <h3 className="text-sm font-medium text-white">작품 정보 수정</h3>
              <button
                onClick={() => {
                  setEditMovieDialogOpen(false);
                  setEditingMovie(null);
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  작품 제목 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-yellow"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">감독</label>
                  <input
                    type="text"
                    value={editDirector}
                    onChange={(e) => setEditDirector(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">연도</label>
                  <input
                    type="number"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-yellow"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">장르</label>
                  <input
                    type="text"
                    value={editGenre}
                    onChange={(e) => setEditGenre(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">화면해설 작가</label>
                  <input
                    type="text"
                    value={editWriter}
                    onChange={(e) => setEditWriter(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-yellow"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-dark-border">
              <button
                onClick={() => {
                  setEditMovieDialogOpen(false);
                  setEditingMovie(null);
                }}
                className="px-4 py-1.5 text-xs bg-dark-surface border border-dark-border rounded text-gray-300 hover:text-white"
              >
                취소
              </button>
              <button
                onClick={handleSaveMovieEdit}
                disabled={!editTitle.trim()}
                className="px-4 py-1.5 text-xs bg-accent-yellow text-dark-bg rounded hover:bg-accent-yellow/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
