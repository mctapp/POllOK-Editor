import { BrowserWindow, ipcMain, dialog } from 'electron';
import { IpcChannels } from '../../shared/types';
import { SUPPORTED_VIDEO_FORMATS, PROJECT_FILE_FILTER } from '../../shared/constants';
import fs from 'fs/promises';
import crypto from 'crypto';
import { removeNoiseFromBuffer } from '../audio/noiseRemoval';

// SQLite 모듈 (선택적 로딩)
let expressionDb: typeof import('../database/expressionDb') | null = null;
let sqliteAvailable = false;

async function loadSqliteModule() {
  try {
    expressionDb = await import('../database/expressionDb');
    expressionDb.initDatabase();
    sqliteAvailable = true;
    console.log('SQLite module loaded successfully');
  } catch (error) {
    console.warn('SQLite module not available, expression dictionary will be disabled:', error);
    sqliteAvailable = false;
  }
}

export function setupIpcHandlers(mainWindow: BrowserWindow) {
  // 윈도우 컨트롤
  ipcMain.on(IpcChannels.WINDOW_MINIMIZE, () => {
    mainWindow.minimize();
  });

  ipcMain.on(IpcChannels.WINDOW_MAXIMIZE, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on(IpcChannels.WINDOW_CLOSE, () => {
    mainWindow.close();
  });

  ipcMain.handle(IpcChannels.WINDOW_IS_MAXIMIZED, () => {
    return mainWindow.isMaximized();
  });

  // 파일 선택: 비디오
  ipcMain.handle(IpcChannels.FILE_SELECT_VIDEO, async () => {
    const extensions = SUPPORTED_VIDEO_FORMATS.flatMap((f) => f.extensions);
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '영상 파일 선택',
      filters: [
        { name: 'Video Files', extensions },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // 파일 선택: 프로젝트
  ipcMain.handle(IpcChannels.FILE_SELECT_PROJECT, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '프로젝트 열기',
      filters: [PROJECT_FILE_FILTER, { name: 'All Files', extensions: ['*'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // 프로젝트 저장
  ipcMain.handle(
    IpcChannels.FILE_SAVE_PROJECT,
    async (_, data: { path?: string; content: string }) => {
      let filePath = data.path;

      if (!filePath) {
        const result = await dialog.showSaveDialog(mainWindow, {
          title: '프로젝트 저장',
          filters: [PROJECT_FILE_FILTER],
          defaultPath: 'untitled.afproj',
        });

        if (result.canceled || !result.filePath) {
          return null;
        }

        filePath = result.filePath;
      }

      try {
        await fs.writeFile(filePath, data.content, 'utf-8');
        return filePath;
      } catch (error) {
        console.error('Failed to save project:', error);
        throw error;
      }
    }
  );

  // 프로젝트 읽기
  ipcMain.handle(IpcChannels.FILE_READ_PROJECT, async (_, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read project:', error);
      throw error;
    }
  });

  // 파일 해시 계산
  ipcMain.handle(IpcChannels.FILE_CALCULATE_HASH, async (_, filePath: string) => {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return `sha256:${hashSum.digest('hex')}`;
    } catch (error) {
      console.error('Failed to calculate hash:', error);
      throw error;
    }
  });

  // 내보내기 경로 선택
  ipcMain.handle(
    IpcChannels.EXPORT_SELECT_PATH,
    async (_, options: { defaultPath: string; filters: Electron.FileFilter[] }) => {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: '내보내기',
        defaultPath: options.defaultPath,
        filters: options.filters,
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      return result.filePath;
    }
  );

  // 파일 내보내기 (쓰기)
  ipcMain.handle(
    IpcChannels.EXPORT_WRITE_FILE,
    async (_, data: { path: string; content: string | number[]; binary?: boolean }) => {
      try {
        if (data.binary && Array.isArray(data.content)) {
          // 바이너리 데이터 (Excel 등)
          await fs.writeFile(data.path, Buffer.from(data.content));
        } else {
          // 텍스트 데이터
          await fs.writeFile(data.path, data.content as string, 'utf-8');
        }
        return true;
      } catch (error) {
        console.error('Failed to export file:', error);
        throw error;
      }
    }
  );

  // 녹음 파일 저장
  ipcMain.handle(
    IpcChannels.RECORDING_SAVE,
    async (_, data: { cardId: string; audioData: number[]; projectPath?: string }) => {
      try {
        const path = await import('path');
        let recordingsDir: string;

        if (data.projectPath) {
          // 프로젝트 파일과 같은 이름의 폴더 생성
          const projectDir = path.dirname(data.projectPath);
          const projectName = path.basename(data.projectPath, '.afproj');
          recordingsDir = path.join(projectDir, projectName, 'recordings');
        } else {
          // 프로젝트가 저장되지 않은 경우 임시 폴더 사용
          const { app } = await import('electron');
          recordingsDir = path.join(app.getPath('documents'), 'AccessON', 'recordings');
        }

        // 폴더가 없으면 생성
        await fs.mkdir(recordingsDir, { recursive: true });

        // 파일 이름 생성 (cardId + timestamp)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${data.cardId}_${timestamp}.webm`;
        const filePath = path.join(recordingsDir, fileName);

        // webm 데이터를 파일로 저장
        const buffer = Buffer.from(data.audioData);
        await fs.writeFile(filePath, buffer);

        return filePath;
      } catch (error) {
        console.error('Failed to save recording:', error);
        throw error;
      }
    }
  );

  // 녹음 파일 노이즈 제거
  ipcMain.handle(
    IpcChannels.RECORDING_REMOVE_NOISE,
    async (_, audioData: number[]) => {
      try {
        const inputBuffer = Buffer.from(audioData);
        const processedBuffer = await removeNoiseFromBuffer(inputBuffer);
        return Array.from(processedBuffer);
      } catch (error) {
        console.error('Failed to remove noise:', error);
        throw error;
      }
    }
  );

  // ============ Expression Dictionary (SQLite) ============

  // 데이터베이스 초기화 (비동기)
  loadSqliteModule();

  // SQLite 사용 불가 시 빈 결과 반환하는 헬퍼
  const requireSqlite = () => {
    if (!sqliteAvailable || !expressionDb) {
      throw new Error('SQLite not available. Please run: npx electron-rebuild -f -w better-sqlite3');
    }
    return expressionDb;
  };

  // 영화 추가
  ipcMain.handle(IpcChannels.EXPR_ADD_MOVIE, (_, movie) => {
    try {
      const db = requireSqlite();
      db.addMovie(movie);
      return true;
    } catch (error) {
      console.error('Failed to add movie:', error);
      throw error;
    }
  });

  // 영화 업데이트
  ipcMain.handle(IpcChannels.EXPR_UPDATE_MOVIE, (_, movie) => {
    try {
      const db = requireSqlite();
      db.updateMovie(movie);
      return true;
    } catch (error) {
      console.error('Failed to update movie:', error);
      throw error;
    }
  });

  // 영화 삭제
  ipcMain.handle(IpcChannels.EXPR_DELETE_MOVIE, (_, movieId: string) => {
    try {
      const db = requireSqlite();
      db.deleteMovie(movieId);
      return true;
    } catch (error) {
      console.error('Failed to delete movie:', error);
      throw error;
    }
  });

  // 모든 영화 조회
  ipcMain.handle(IpcChannels.EXPR_GET_ALL_MOVIES, () => {
    try {
      const db = requireSqlite();
      return db.getAllMovies();
    } catch (error) {
      console.error('Failed to get movies:', error);
      return []; // SQLite 미사용시 빈 배열
    }
  });

  // 표현 일괄 추가
  ipcMain.handle(IpcChannels.EXPR_ADD_EXPRESSIONS_BULK, (_, expressions) => {
    try {
      const db = requireSqlite();
      db.addExpressionsBulk(expressions);
      return true;
    } catch (error) {
      console.error('Failed to add expressions:', error);
      throw error;
    }
  });

  // 표현 업데이트
  ipcMain.handle(IpcChannels.EXPR_UPDATE_EXPRESSION, (_, expression) => {
    try {
      const db = requireSqlite();
      db.updateExpression(expression);
      return true;
    } catch (error) {
      console.error('Failed to update expression:', error);
      throw error;
    }
  });

  // 표현 삭제
  ipcMain.handle(IpcChannels.EXPR_DELETE_EXPRESSION, (_, expressionId: string) => {
    try {
      const db = requireSqlite();
      db.deleteExpression(expressionId);
      return true;
    } catch (error) {
      console.error('Failed to delete expression:', error);
      throw error;
    }
  });

  // 표현 검색
  ipcMain.handle(IpcChannels.EXPR_SEARCH, (_, keyword: string) => {
    try {
      const db = requireSqlite();
      return db.searchExpressions(keyword);
    } catch (error) {
      console.error('Failed to search expressions:', error);
      return [];
    }
  });

  // 여러 키워드로 표현 검색 (유의어 확장)
  ipcMain.handle(IpcChannels.EXPR_SEARCH_BY_KEYWORDS, (_, keywords: string[]) => {
    try {
      const db = requireSqlite();
      return db.searchExpressionsByKeywords(keywords);
    } catch (error) {
      console.error('Failed to search expressions by keywords:', error);
      return [];
    }
  });

  // 영화별 표현 조회
  ipcMain.handle(IpcChannels.EXPR_GET_BY_MOVIE, (_, movieId: string) => {
    try {
      const db = requireSqlite();
      return db.getExpressionsByMovieId(movieId);
    } catch (error) {
      console.error('Failed to get expressions by movie:', error);
      return [];
    }
  });

  // 모든 표현 조회
  ipcMain.handle(IpcChannels.EXPR_GET_ALL, () => {
    try {
      const db = requireSqlite();
      return db.getAllExpressions();
    } catch (error) {
      console.error('Failed to get all expressions:', error);
      return [];
    }
  });

  // 유의어 그룹 추가
  ipcMain.handle(IpcChannels.EXPR_ADD_SYNONYM, (_, group) => {
    try {
      const db = requireSqlite();
      db.addSynonymGroup(group);
      return true;
    } catch (error) {
      console.error('Failed to add synonym group:', error);
      throw error;
    }
  });

  // 유의어 그룹 삭제
  ipcMain.handle(IpcChannels.EXPR_DELETE_SYNONYM, (_, groupId: string) => {
    try {
      const db = requireSqlite();
      db.deleteSynonymGroup(groupId);
      return true;
    } catch (error) {
      console.error('Failed to delete synonym group:', error);
      throw error;
    }
  });

  // 모든 유의어 그룹 조회
  ipcMain.handle(IpcChannels.EXPR_GET_ALL_SYNONYMS, () => {
    try {
      const db = requireSqlite();
      return db.getAllSynonymGroups();
    } catch (error) {
      console.error('Failed to get synonym groups:', error);
      return [];
    }
  });

  // 특정 단어의 유의어 그룹 찾기
  ipcMain.handle(IpcChannels.EXPR_FIND_SYNONYM, (_, word: string) => {
    try {
      const db = requireSqlite();
      return db.findSynonymGroup(word);
    } catch (error) {
      console.error('Failed to find synonym group:', error);
      return undefined;
    }
  });

  // 통계 조회
  ipcMain.handle(IpcChannels.EXPR_GET_STATS, () => {
    try {
      const db = requireSqlite();
      return db.getStats();
    } catch (error) {
      console.error('Failed to get stats:', error);
      return { movieCount: 0, expressionCount: 0, highlightedCount: 0 };
    }
  });

  // 레거시 데이터 가져오기 (localStorage → SQLite 마이그레이션)
  ipcMain.handle(IpcChannels.EXPR_IMPORT_LEGACY, (_, data) => {
    try {
      const db = requireSqlite();
      db.importLegacyData(data);
      return true;
    } catch (error) {
      console.error('Failed to import legacy data:', error);
      throw error;
    }
  });
}
