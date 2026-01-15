import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

  // 검색 관련
  searchQuery: string;
  searchResults: Expression[];
  selectedMovieId: string | null;
  showHighlightedOnly: boolean;

  // 모달 상태
  isDialogOpen: boolean;

  // 영화 관리
  addMovie: (movie: Omit<Movie, 'id' | 'createdAt'>) => Movie;
  updateMovie: (id: string, updates: Partial<Movie>) => void;
  deleteMovie: (id: string) => void;

  // 표현 관리
  addExpression: (expression: Omit<Expression, 'id' | 'createdAt' | 'modifiedAt'>) => void;
  addExpressions: (expressions: Omit<Expression, 'id' | 'createdAt' | 'modifiedAt'>[]) => void;
  updateExpression: (id: string, updates: Partial<Expression>) => void;
  deleteExpression: (id: string) => void;
  toggleHighlight: (id: string) => void;

  // 유의어 관리
  addSynonymGroup: (group: Omit<SynonymGroup, 'id'>) => void;
  updateSynonymGroup: (id: string, updates: Partial<SynonymGroup>) => void;
  deleteSynonymGroup: (id: string) => void;

  // 검색
  search: (query: string) => void;
  clearSearch: () => void;
  setSelectedMovieId: (id: string | null) => void;
  setShowHighlightedOnly: (show: boolean) => void;

  // 모달
  openDialog: () => void;
  closeDialog: () => void;

  // SRT 가져오기
  importFromSRT: (srtContent: string, movieInfo: Omit<Movie, 'id' | 'createdAt'>) => void;
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

export const useExpressionStore = create<ExpressionState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      movies: [],
      expressions: [],
      synonymGroups: DEFAULT_SYNONYMS,
      searchQuery: '',
      searchResults: [],
      selectedMovieId: null,
      showHighlightedOnly: false,
      isDialogOpen: false,

      // 영화 관리
      addMovie: (movieData) => {
        const movie: Movie = {
          ...movieData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ movies: [...state.movies, movie] }));
        return movie;
      },

      updateMovie: (id, updates) => {
        set((state) => ({
          movies: state.movies.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }));
      },

      deleteMovie: (id) => {
        set((state) => ({
          movies: state.movies.filter((m) => m.id !== id),
          expressions: state.expressions.filter((e) => e.movieId !== id),
        }));
      },

      // 표현 관리
      addExpression: (expressionData) => {
        const now = new Date().toISOString();
        const expression: Expression = {
          ...expressionData,
          id: generateId(),
          createdAt: now,
          modifiedAt: now,
        };
        set((state) => ({ expressions: [...state.expressions, expression] }));
      },

      addExpressions: (expressionsData) => {
        const now = new Date().toISOString();
        const newExpressions: Expression[] = expressionsData.map((data) => ({
          ...data,
          id: generateId(),
          createdAt: now,
          modifiedAt: now,
        }));
        set((state) => ({ expressions: [...state.expressions, ...newExpressions] }));
      },

      updateExpression: (id, updates) => {
        set((state) => ({
          expressions: state.expressions.map((e) =>
            e.id === id ? { ...e, ...updates, modifiedAt: new Date().toISOString() } : e
          ),
        }));
      },

      deleteExpression: (id) => {
        set((state) => ({
          expressions: state.expressions.filter((e) => e.id !== id),
        }));
      },

      toggleHighlight: (id) => {
        set((state) => ({
          expressions: state.expressions.map((e) =>
            e.id === id
              ? { ...e, isHighlighted: !e.isHighlighted, modifiedAt: new Date().toISOString() }
              : e
          ),
        }));
      },

      // 유의어 관리
      addSynonymGroup: (groupData) => {
        const group: SynonymGroup = {
          ...groupData,
          id: generateId(),
        };
        set((state) => ({ synonymGroups: [...state.synonymGroups, group] }));
      },

      updateSynonymGroup: (id, updates) => {
        set((state) => ({
          synonymGroups: state.synonymGroups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }));
      },

      deleteSynonymGroup: (id) => {
        set((state) => ({
          synonymGroups: state.synonymGroups.filter((g) => g.id !== id),
        }));
      },

      // 검색 (유의어 확장 포함)
      search: (query) => {
        const { expressions, synonymGroups, selectedMovieId, showHighlightedOnly } = get();
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

        // 필터링
        let results = expressions.filter((expr) => {
          const text = expr.text.toLowerCase();
          return Array.from(expandedTerms).some((term) => text.includes(term));
        });

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
      openDialog: () => set({ isDialogOpen: true }),
      closeDialog: () => set({ isDialogOpen: false, searchQuery: '', searchResults: [] }),

      // SRT 가져오기
      importFromSRT: (srtContent, movieInfo) => {
        const entries = parseSRT(srtContent);
        if (entries.length === 0) return;

        // 영화 추가
        const movie = get().addMovie(movieInfo);

        // 표현 추가
        const expressionsData = entries.map((entry) => ({
          movieId: movie.id,
          timecode: entry.timecode,
          text: entry.text,
          isHighlighted: false,
        }));

        get().addExpressions(expressionsData);
      },
    }),
    {
      name: 'expression-dictionary-storage',
      partialize: (state) => ({
        movies: state.movies,
        expressions: state.expressions,
        synonymGroups: state.synonymGroups,
      }),
    }
  )
);
