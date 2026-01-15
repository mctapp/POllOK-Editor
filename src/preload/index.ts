import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from '../shared/types';

// 표현 사전 데이터베이스 레코드 타입
interface MovieRecord {
  id: string;
  title: string;
  director: string | null;
  year: number | null;
  genre: string | null;
  writer: string | null;
  createdAt: string;
}

interface ExpressionRecord {
  id: string;
  movieId: string;
  timecode: string;
  text: string;
  isHighlighted: number;
  tags: string | null;
  note: string | null;
  createdAt: string;
  modifiedAt: string;
}

interface SynonymGroupRecord {
  id: string;
  baseWord: string;
  synonyms: string;
  category: string | null;
}

interface LegacyData {
  movies: MovieRecord[];
  expressions: ExpressionRecord[];
  synonymGroups: SynonymGroupRecord[];
}

// API 정의
const api = {
  // 윈도우 컨트롤
  window: {
    minimize: () => ipcRenderer.send(IpcChannels.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.send(IpcChannels.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.send(IpcChannels.WINDOW_CLOSE),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke(IpcChannels.WINDOW_IS_MAXIMIZED),
  },

  // 파일 작업
  file: {
    selectVideo: (): Promise<string | null> => ipcRenderer.invoke(IpcChannels.FILE_SELECT_VIDEO),
    selectProject: (): Promise<string | null> =>
      ipcRenderer.invoke(IpcChannels.FILE_SELECT_PROJECT),
    saveProject: (data: { path?: string; content: string }): Promise<string | null> =>
      ipcRenderer.invoke(IpcChannels.FILE_SAVE_PROJECT, data),
    readProject: <T>(path: string): Promise<T> =>
      ipcRenderer.invoke(IpcChannels.FILE_READ_PROJECT, path),
    calculateHash: (path: string): Promise<string> =>
      ipcRenderer.invoke(IpcChannels.FILE_CALCULATE_HASH, path),
  },

  // 내보내기
  export: {
    selectPath: (options: {
      defaultPath: string;
      filters: { name: string; extensions: string[] }[];
    }): Promise<string | null> => ipcRenderer.invoke(IpcChannels.EXPORT_SELECT_PATH, options),
    writeFile: (data: { path: string; content: string | number[]; binary?: boolean }): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.EXPORT_WRITE_FILE, data),
  },

  // 이벤트 리스너
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const listener = (_: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // 녹음
  saveRecording: (
    cardId: string,
    audioData: number[],
    projectPath?: string
  ): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.RECORDING_SAVE, { cardId, audioData, projectPath }),

  // 녹음 노이즈 제거
  removeNoise: (audioData: number[]): Promise<number[]> =>
    ipcRenderer.invoke(IpcChannels.RECORDING_REMOVE_NOISE, audioData),

  // 표현 사전 (SQLite)
  expression: {
    // 영화
    addMovie: (movie: MovieRecord): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.EXPR_ADD_MOVIE, movie),
    updateMovie: (movie: MovieRecord): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.EXPR_UPDATE_MOVIE, movie),
    deleteMovie: (movieId: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.EXPR_DELETE_MOVIE, movieId),
    getAllMovies: (): Promise<MovieRecord[]> =>
      ipcRenderer.invoke(IpcChannels.EXPR_GET_ALL_MOVIES),

    // 표현
    addExpressionsBulk: (expressions: ExpressionRecord[]): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.EXPR_ADD_EXPRESSIONS_BULK, expressions),
    updateExpression: (expression: ExpressionRecord): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.EXPR_UPDATE_EXPRESSION, expression),
    deleteExpression: (expressionId: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.EXPR_DELETE_EXPRESSION, expressionId),
    search: (keyword: string): Promise<ExpressionRecord[]> =>
      ipcRenderer.invoke(IpcChannels.EXPR_SEARCH, keyword),
    searchByKeywords: (keywords: string[]): Promise<ExpressionRecord[]> =>
      ipcRenderer.invoke(IpcChannels.EXPR_SEARCH_BY_KEYWORDS, keywords),
    getByMovie: (movieId: string): Promise<ExpressionRecord[]> =>
      ipcRenderer.invoke(IpcChannels.EXPR_GET_BY_MOVIE, movieId),
    getAll: (): Promise<ExpressionRecord[]> =>
      ipcRenderer.invoke(IpcChannels.EXPR_GET_ALL),

    // 유의어
    addSynonym: (group: SynonymGroupRecord): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.EXPR_ADD_SYNONYM, group),
    deleteSynonym: (groupId: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.EXPR_DELETE_SYNONYM, groupId),
    getAllSynonyms: (): Promise<SynonymGroupRecord[]> =>
      ipcRenderer.invoke(IpcChannels.EXPR_GET_ALL_SYNONYMS),
    findSynonym: (word: string): Promise<SynonymGroupRecord | undefined> =>
      ipcRenderer.invoke(IpcChannels.EXPR_FIND_SYNONYM, word),

    // 통계 및 마이그레이션
    getStats: (): Promise<{ movieCount: number; expressionCount: number; highlightedCount: number }> =>
      ipcRenderer.invoke(IpcChannels.EXPR_GET_STATS),
    importLegacy: (data: LegacyData): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.EXPR_IMPORT_LEGACY, data),
  },

  // 플랫폼 정보
  platform: process.platform,

  // 유틸리티
  utils: {
    // 파일 경로를 local-file:// URL로 변환 (커스텀 프로토콜)
    getFileUrl: (filePath: string): string => {
      // Windows 경로 처리
      const normalizedPath = filePath.replace(/\\/g, '/');
      return `local-file://${encodeURIComponent(normalizedPath)}`;
    },
  },
};

// API를 window 객체에 노출
contextBridge.exposeInMainWorld('api', api);

// TypeScript 타입 정의
export type ApiType = typeof api;
