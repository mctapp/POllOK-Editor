import { create } from 'zustand';
import type { Movie, Expression, SynonymGroup } from '../../shared/types';

// 기본 유의어 사전 (화면해설 빈출 표현)
const DEFAULT_SYNONYMS: SynonymGroup[] = [
  // 이동/동작
  {
    id: 'syn-1',
    baseWord: '걷다',
    synonyms: ['걸어가다', '발걸음을 옮기다', '거닐다', '산책하다', '걸음을 내딛다'],
    category: '이동',
  },
  {
    id: 'syn-2',
    baseWord: '뛰다',
    synonyms: ['달리다', '뛰어가다', '전력질주하다', '내달리다', '달음박질하다'],
    category: '이동',
  },
  {
    id: 'syn-3',
    baseWord: '서다',
    synonyms: ['멈춰 서다', '우뚝 서다', '서 있다', '정지하다', '발걸음을 멈추다'],
    category: '이동',
  },
  // 시선/바라봄
  {
    id: 'syn-4',
    baseWord: '바라보다',
    synonyms: ['쳐다보다', '응시하다', '주시하다', '눈길을 주다', '시선을 두다'],
    category: '시선',
  },
  {
    id: 'syn-5',
    baseWord: '훑어보다',
    synonyms: ['살피다', '살펴보다', '눈으로 훑다', '둘러보다', '시선을 훑다'],
    category: '시선',
  },
  // 표정/감정
  {
    id: 'syn-6',
    baseWord: '웃다',
    synonyms: ['미소짓다', '살며시 웃다', '입꼬리를 올리다', '활짝 웃다', '씩 웃다'],
    category: '표정',
  },
  {
    id: 'syn-7',
    baseWord: '울다',
    synonyms: ['눈물 흘리다', '눈물짓다', '흐느끼다', '오열하다', '눈시울을 붉히다'],
    category: '표정',
  },
  {
    id: 'syn-8',
    baseWord: '놀라다',
    synonyms: ['깜짝 놀라다', '눈이 커지다', '화들짝 놀라다', '경악하다', '놀란 표정을 짓다'],
    category: '표정',
  },
  // 손동작
  {
    id: 'syn-9',
    baseWord: '잡다',
    synonyms: ['움켜쥐다', '붙잡다', '쥐다', '손에 쥐다', '손으로 잡다'],
    category: '손동작',
  },
  {
    id: 'syn-10',
    baseWord: '만지다',
    synonyms: ['어루만지다', '손길을 내밀다', '쓰다듬다', '손을 대다', '살짝 만지다'],
    category: '손동작',
  },
  // 자세/몸동작
  {
    id: 'syn-11',
    baseWord: '앉다',
    synonyms: ['자리에 앉다', '주저앉다', '앉아 있다', '걸터앉다', '기대앉다'],
    category: '자세',
  },
  {
    id: 'syn-12',
    baseWord: '눕다',
    synonyms: ['누워 있다', '드러눕다', '몸을 눕히다', '기대어 눕다', '쓰러지듯 눕다'],
    category: '자세',
  },
  // 대화/말
  {
    id: 'syn-13',
    baseWord: '말하다',
    synonyms: ['이야기하다', '대화하다', '입을 열다', '말을 꺼내다', '말문을 열다'],
    category: '대화',
  },
  {
    id: 'syn-14',
    baseWord: '외치다',
    synonyms: ['소리치다', '고함치다', '부르짖다', '큰 소리로 말하다', '악을 쓰다'],
    category: '대화',
  },
  // 문열기/문닫기
  {
    id: 'syn-15',
    baseWord: '문을 열다',
    synonyms: [
      '문을 밀다',
      '문을 당기다',
      '문을 열고 들어서다',
      '문을 활짝 열다',
      '문손잡이를 돌리다',
    ],
    category: '동작',
  },
];

interface ExpressionState {
  // 데이터
  movies: Movie[];
  expressions: Expression[];
  synonymGroups: SynonymGroup[];

  // 로딩/초기화 상태
  isInitialized: boolean;
  isLoading: boolean;

  // 검색 관련
  searchQuery: string;
  searchResults: Expression[];
  selectedMovieId: string | null;
  showHighlightedOnly: boolean;

  // 모달 상태
  isDialogOpen: boolean;

  // 초기화
  initialize: () => Promise<void>;

  // 영화 관리
  addMovie: (movie: Omit<Movie, 'id' | 'createdAt'>) => Promise<Movie>;
  updateMovie: (id: string, updates: Partial<Movie>) => Promise<void>;
  deleteMovie: (id: string) => Promise<void>;

  // 표현 관리
  addExpression: (expression: Omit<Expression, 'id' | 'createdAt' | 'modifiedAt'>) => Promise<void>;
  addExpressions: (expressions: Omit<Expression, 'id' | 'createdAt' | 'modifiedAt'>[]) => Promise<void>;
  updateExpression: (id: string, updates: Partial<Expression>) => Promise<void>;
  deleteExpression: (id: string) => Promise<void>;
  toggleHighlight: (id: string) => Promise<void>;

  // 유의어 관리
  addSynonymGroup: (group: Omit<SynonymGroup, 'id'>) => Promise<void>;
  updateSynonymGroup: (id: string, updates: Partial<SynonymGroup>) => void;
  deleteSynonymGroup: (id: string) => Promise<void>;

  // 검색
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  setSelectedMovieId: (id: string | null) => void;
  setShowHighlightedOnly: (show: boolean) => void;

  // 모달
  openDialog: () => void;
  closeDialog: () => void;

  // SRT 가져오기
  importFromSRT: (srtContent: string, movieInfo: Omit<Movie, 'id' | 'createdAt'>) => Promise<void>;
}

// SRT 파싱 함수
function parseSRT(content: string): Array<{ timecode: string; text: string }> {
  const blocks = content.trim().split(/\n\s*\n/);
  const entries: Array<{ timecode: string; text: string }> = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    // 타임코드 라인 (예: 00:00:01,000 --> 00:00:04,000)
    const timecodeMatch = lines[1]?.match(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
    );
    if (!timecodeMatch) continue;

    // 텍스트 (3번째 줄부터 끝까지)
    let text = lines.slice(2).join(' ').trim();
    if (!text) continue;

    // 괄호로 싸인 지시문 제거 (예: "(고개 돌리면 바로)")
    // 전체가 괄호인 경우 스킵, 부분적인 괄호는 제거
    text = text.replace(/\([^)]*\)/g, '').trim();
    if (!text) continue; // 괄호 제거 후 빈 텍스트면 스킵

    entries.push({
      timecode: timecodeMatch[1],
      text,
    });
  }

  return entries;
}

// UUID 생성
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// SQLite 레코드를 프론트엔드 타입으로 변환
function movieRecordToMovie(record: {
  id: string;
  title: string;
  director: string | null;
  year: number | null;
  genre: string | null;
  writer: string | null;
  createdAt: string;
}): Movie {
  return {
    id: record.id,
    title: record.title,
    director: record.director || undefined,
    year: record.year || undefined,
    genre: record.genre || undefined,
    writer: record.writer || undefined,
    createdAt: record.createdAt,
  };
}

function expressionRecordToExpression(record: {
  id: string;
  movieId: string;
  timecode: string;
  text: string;
  isHighlighted: number;
  tags: string | null;
  note: string | null;
  createdAt: string;
  modifiedAt: string;
}): Expression {
  return {
    id: record.id,
    movieId: record.movieId,
    timecode: record.timecode,
    text: record.text,
    isHighlighted: record.isHighlighted === 1,
    tags: record.tags ? JSON.parse(record.tags) : undefined,
    note: record.note || undefined,
    createdAt: record.createdAt,
    modifiedAt: record.modifiedAt,
  };
}

function synonymRecordToGroup(record: {
  id: string;
  baseWord: string;
  synonyms: string;
  category: string | null;
}): SynonymGroup {
  return {
    id: record.id,
    baseWord: record.baseWord,
    synonyms: JSON.parse(record.synonyms),
    category: record.category || undefined,
  };
}

export const useExpressionStore = create<ExpressionState>()((set, get) => ({
  // 초기 상태
  movies: [],
  expressions: [],
  synonymGroups: DEFAULT_SYNONYMS,
  isInitialized: false,
  isLoading: false,
  searchQuery: '',
  searchResults: [],
  selectedMovieId: null,
  showHighlightedOnly: false,
  isDialogOpen: false,

  // SQLite에서 데이터 로드
  initialize: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });

    try {
      // SQLite에서 데이터 로드
      const [movieRecords, expressionRecords, synonymRecords] = await Promise.all([
        window.api.expression.getAllMovies(),
        window.api.expression.getAll(),
        window.api.expression.getAllSynonyms(),
      ]);

      const movies = movieRecords.map(movieRecordToMovie);
      const expressions = expressionRecords.map(expressionRecordToExpression);

      // 유의어 그룹: DB에 없으면 기본값 사용, 있으면 DB 데이터 사용
      let synonymGroups: SynonymGroup[];
      if (synonymRecords.length > 0) {
        synonymGroups = synonymRecords.map(synonymRecordToGroup);
      } else {
        // 기본 유의어를 DB에 저장
        synonymGroups = DEFAULT_SYNONYMS;
        for (const group of DEFAULT_SYNONYMS) {
          await window.api.expression.addSynonym({
            id: group.id,
            baseWord: group.baseWord,
            synonyms: JSON.stringify(group.synonyms),
            category: group.category || null,
          });
        }
      }

      set({
        movies,
        expressions,
        synonymGroups,
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize expression store:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  // 영화 관리
  addMovie: async (movieData) => {
    const movie: Movie = {
      ...movieData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    await window.api.expression.addMovie({
      id: movie.id,
      title: movie.title,
      director: movie.director || null,
      year: movie.year || null,
      genre: movie.genre || null,
      writer: movie.writer || null,
      createdAt: movie.createdAt,
    });

    set((state) => ({ movies: [...state.movies, movie] }));
    return movie;
  },

  updateMovie: async (id, updates) => {
    const movie = get().movies.find((m) => m.id === id);
    if (!movie) return;

    const updatedMovie = { ...movie, ...updates };
    await window.api.expression.updateMovie({
      id: updatedMovie.id,
      title: updatedMovie.title,
      director: updatedMovie.director || null,
      year: updatedMovie.year || null,
      genre: updatedMovie.genre || null,
      writer: updatedMovie.writer || null,
      createdAt: updatedMovie.createdAt,
    });

    set((state) => ({
      movies: state.movies.map((m) => (m.id === id ? updatedMovie : m)),
    }));
  },

  deleteMovie: async (id) => {
    await window.api.expression.deleteMovie(id);
    set((state) => ({
      movies: state.movies.filter((m) => m.id !== id),
      expressions: state.expressions.filter((e) => e.movieId !== id),
    }));
  },

  // 표현 관리
  addExpression: async (expressionData) => {
    const now = new Date().toISOString();
    const expression: Expression = {
      ...expressionData,
      id: generateId(),
      createdAt: now,
      modifiedAt: now,
    };

    await window.api.expression.addExpressionsBulk([
      {
        id: expression.id,
        movieId: expression.movieId,
        timecode: expression.timecode,
        text: expression.text,
        isHighlighted: expression.isHighlighted ? 1 : 0,
        tags: expression.tags ? JSON.stringify(expression.tags) : null,
        note: expression.note || null,
        createdAt: expression.createdAt,
        modifiedAt: expression.modifiedAt,
      },
    ]);

    set((state) => ({ expressions: [...state.expressions, expression] }));
  },

  addExpressions: async (expressionsData) => {
    const now = new Date().toISOString();
    const newExpressions: Expression[] = expressionsData.map((data) => ({
      ...data,
      id: generateId(),
      createdAt: now,
      modifiedAt: now,
    }));

    const records = newExpressions.map((expr) => ({
      id: expr.id,
      movieId: expr.movieId,
      timecode: expr.timecode,
      text: expr.text,
      isHighlighted: expr.isHighlighted ? 1 : 0,
      tags: expr.tags ? JSON.stringify(expr.tags) : null,
      note: expr.note || null,
      createdAt: expr.createdAt,
      modifiedAt: expr.modifiedAt,
    }));

    await window.api.expression.addExpressionsBulk(records);
    set((state) => ({ expressions: [...state.expressions, ...newExpressions] }));
  },

  updateExpression: async (id, updates) => {
    const expression = get().expressions.find((e) => e.id === id);
    if (!expression) return;

    const updatedExpression = {
      ...expression,
      ...updates,
      modifiedAt: new Date().toISOString(),
    };

    await window.api.expression.updateExpression({
      id: updatedExpression.id,
      movieId: updatedExpression.movieId,
      timecode: updatedExpression.timecode,
      text: updatedExpression.text,
      isHighlighted: updatedExpression.isHighlighted ? 1 : 0,
      tags: updatedExpression.tags ? JSON.stringify(updatedExpression.tags) : null,
      note: updatedExpression.note || null,
      createdAt: updatedExpression.createdAt,
      modifiedAt: updatedExpression.modifiedAt,
    });

    set((state) => ({
      expressions: state.expressions.map((e) => (e.id === id ? updatedExpression : e)),
    }));
  },

  deleteExpression: async (id) => {
    await window.api.expression.deleteExpression(id);
    set((state) => ({
      expressions: state.expressions.filter((e) => e.id !== id),
    }));
  },

  toggleHighlight: async (id) => {
    const expression = get().expressions.find((e) => e.id === id);
    if (!expression) return;

    await get().updateExpression(id, { isHighlighted: !expression.isHighlighted });
  },

  // 유의어 관리
  addSynonymGroup: async (groupData) => {
    const group: SynonymGroup = {
      ...groupData,
      id: generateId(),
    };

    await window.api.expression.addSynonym({
      id: group.id,
      baseWord: group.baseWord,
      synonyms: JSON.stringify(group.synonyms),
      category: group.category || null,
    });

    set((state) => ({ synonymGroups: [...state.synonymGroups, group] }));
  },

  updateSynonymGroup: (id, updates) => {
    set((state) => ({
      synonymGroups: state.synonymGroups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
    // Note: 유의어 업데이트는 로컬에서만 처리 (UI에서 사용)
  },

  deleteSynonymGroup: async (id) => {
    await window.api.expression.deleteSynonym(id);
    set((state) => ({
      synonymGroups: state.synonymGroups.filter((g) => g.id !== id),
    }));
  },

  // 검색 (SQLite 검색 + 유의어 확장)
  search: async (query) => {
    const { synonymGroups, selectedMovieId, showHighlightedOnly } = get();
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
      set({ searchQuery: query, searchResults: [] });
      return;
    }

    // 유의어 확장: 검색어와 매칭되는 유의어 그룹 찾기
    const expandedTerms = new Set<string>([trimmedQuery]);

    for (const group of synonymGroups) {
      const allWords = [group.baseWord, ...group.synonyms].map((w) => w.toLowerCase());
      if (allWords.some((word) => word.includes(trimmedQuery) || trimmedQuery.includes(word))) {
        allWords.forEach((word) => expandedTerms.add(word));
      }
    }

    // SQLite에서 검색
    const keywords = Array.from(expandedTerms);
    const searchResults = await window.api.expression.searchByKeywords(keywords);

    let results = searchResults.map(expressionRecordToExpression);

    // 영화 필터
    if (selectedMovieId) {
      results = results.filter((e) => e.movieId === selectedMovieId);
    }

    // 하이라이트 필터
    if (showHighlightedOnly) {
      results = results.filter((e) => e.isHighlighted);
    }

    set({ searchQuery: query, searchResults: results });
  },

  clearSearch: () => {
    set({ searchQuery: '', searchResults: [] });
  },

  setSelectedMovieId: (id) => {
    set({ selectedMovieId: id });
    // 검색 결과 재필터링
    const { searchQuery } = get();
    if (searchQuery) {
      get().search(searchQuery);
    }
  },

  setShowHighlightedOnly: (show) => {
    set({ showHighlightedOnly: show });
    // 검색 결과 재필터링
    const { searchQuery } = get();
    if (searchQuery) {
      get().search(searchQuery);
    }
  },

  // 모달
  openDialog: () => {
    // 다이얼로그 열 때 초기화 확인
    get().initialize();
    set({ isDialogOpen: true });
  },
  closeDialog: () => set({ isDialogOpen: false, searchQuery: '', searchResults: [] }),

  // SRT 가져오기
  importFromSRT: async (srtContent, movieInfo) => {
    const entries = parseSRT(srtContent);
    if (entries.length === 0) return;

    // 영화 추가
    const movie = await get().addMovie(movieInfo);

    // 표현 추가
    const expressionsData = entries.map((entry) => ({
      movieId: movie.id,
      timecode: entry.timecode,
      text: entry.text,
      isHighlighted: false,
    }));

    await get().addExpressions(expressionsData);
  },
}));
