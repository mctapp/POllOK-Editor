/**
 * 표현 사전 SQLite 데이터베이스 모듈
 * 화면해설 표현 및 영화 메타데이터를 저장합니다.
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface MovieRecord {
  id: string;
  title: string;
  director: string | null;
  year: number | null;
  genre: string | null;
  writer: string | null;
  createdAt: string;
}

export interface ExpressionRecord {
  id: string;
  movieId: string;
  timecode: string;
  text: string;
  isHighlighted: number; // SQLite는 boolean 대신 0/1 사용
  tags: string | null; // JSON 문자열
  note: string | null;
  createdAt: string;
  modifiedAt: string;
}

export interface SynonymGroupRecord {
  id: string;
  baseWord: string;
  synonyms: string; // JSON 배열 문자열
  category: string | null;
}

let db: Database.Database | null = null;

/**
 * 데이터베이스 초기화 및 연결
 */
export function initDatabase(): Database.Database {
  if (db) return db;

  // 데이터베이스 파일 경로
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'expression-dictionary.db');

  // 디렉토리가 없으면 생성
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log('Expression DB path:', dbPath);

  // 데이터베이스 연결
  db = new Database(dbPath);

  // WAL 모드 활성화 (성능 향상)
  db.pragma('journal_mode = WAL');

  // 테이블 생성
  createTables(db);

  return db;
}

/**
 * 데이터베이스 테이블 생성
 */
function createTables(database: Database.Database): void {
  // 영화 테이블
  database.exec(`
    CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      director TEXT,
      year INTEGER,
      genre TEXT,
      writer TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  // 표현 테이블
  database.exec(`
    CREATE TABLE IF NOT EXISTS expressions (
      id TEXT PRIMARY KEY,
      movieId TEXT NOT NULL,
      timecode TEXT,
      text TEXT NOT NULL,
      isHighlighted INTEGER DEFAULT 0,
      tags TEXT,
      note TEXT,
      createdAt TEXT NOT NULL,
      modifiedAt TEXT NOT NULL,
      FOREIGN KEY (movieId) REFERENCES movies(id) ON DELETE CASCADE
    )
  `);

  // 표현 텍스트 검색을 위한 인덱스
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_expressions_text ON expressions(text)
  `);

  // 영화별 검색을 위한 인덱스
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_expressions_movieId ON expressions(movieId)
  `);

  // 유의어 그룹 테이블
  database.exec(`
    CREATE TABLE IF NOT EXISTS synonym_groups (
      id TEXT PRIMARY KEY,
      baseWord TEXT NOT NULL UNIQUE,
      synonyms TEXT NOT NULL,
      category TEXT
    )
  `);

  // 유의어 검색을 위한 인덱스
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_synonym_baseWord ON synonym_groups(baseWord)
  `);
}

/**
 * 데이터베이스 연결 종료
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ============ Movie CRUD ============

export function addMovie(movie: MovieRecord): void {
  const database = initDatabase();
  const stmt = database.prepare(`
    INSERT INTO movies (id, title, director, year, genre, writer, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(movie.id, movie.title, movie.director, movie.year, movie.genre, movie.writer, movie.createdAt);
}

export function updateMovie(movie: MovieRecord): void {
  const database = initDatabase();
  const stmt = database.prepare(`
    UPDATE movies SET title = ?, director = ?, year = ?, genre = ?, writer = ?
    WHERE id = ?
  `);
  stmt.run(movie.title, movie.director, movie.year, movie.genre, movie.writer, movie.id);
}

export function deleteMovie(movieId: string): void {
  const database = initDatabase();
  // CASCADE로 관련 표현도 자동 삭제
  const stmt = database.prepare('DELETE FROM movies WHERE id = ?');
  stmt.run(movieId);
}

export function getAllMovies(): MovieRecord[] {
  const database = initDatabase();
  const stmt = database.prepare('SELECT * FROM movies ORDER BY createdAt DESC');
  return stmt.all() as MovieRecord[];
}

export function getMovieById(movieId: string): MovieRecord | undefined {
  const database = initDatabase();
  const stmt = database.prepare('SELECT * FROM movies WHERE id = ?');
  return stmt.get(movieId) as MovieRecord | undefined;
}

// ============ Expression CRUD ============

export function addExpression(expression: ExpressionRecord): void {
  const database = initDatabase();
  const stmt = database.prepare(`
    INSERT INTO expressions (id, movieId, timecode, text, isHighlighted, tags, note, createdAt, modifiedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    expression.id,
    expression.movieId,
    expression.timecode,
    expression.text,
    expression.isHighlighted,
    expression.tags,
    expression.note,
    expression.createdAt,
    expression.modifiedAt
  );
}

export function addExpressionsBulk(expressions: ExpressionRecord[]): void {
  const database = initDatabase();
  const stmt = database.prepare(`
    INSERT INTO expressions (id, movieId, timecode, text, isHighlighted, tags, note, createdAt, modifiedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = database.transaction((items: ExpressionRecord[]) => {
    for (const expr of items) {
      stmt.run(
        expr.id,
        expr.movieId,
        expr.timecode,
        expr.text,
        expr.isHighlighted,
        expr.tags,
        expr.note,
        expr.createdAt,
        expr.modifiedAt
      );
    }
  });

  insertMany(expressions);
}

export function updateExpression(expression: ExpressionRecord): void {
  const database = initDatabase();
  const stmt = database.prepare(`
    UPDATE expressions
    SET timecode = ?, text = ?, isHighlighted = ?, tags = ?, note = ?, modifiedAt = ?
    WHERE id = ?
  `);
  stmt.run(
    expression.timecode,
    expression.text,
    expression.isHighlighted,
    expression.tags,
    expression.note,
    expression.modifiedAt,
    expression.id
  );
}

export function deleteExpression(expressionId: string): void {
  const database = initDatabase();
  const stmt = database.prepare('DELETE FROM expressions WHERE id = ?');
  stmt.run(expressionId);
}

export function getExpressionsByMovieId(movieId: string): ExpressionRecord[] {
  const database = initDatabase();
  const stmt = database.prepare('SELECT * FROM expressions WHERE movieId = ? ORDER BY timecode');
  return stmt.all(movieId) as ExpressionRecord[];
}

export function getAllExpressions(): ExpressionRecord[] {
  const database = initDatabase();
  const stmt = database.prepare('SELECT * FROM expressions ORDER BY createdAt DESC');
  return stmt.all() as ExpressionRecord[];
}

/**
 * 텍스트 검색 (키워드 포함)
 */
export function searchExpressions(keyword: string): ExpressionRecord[] {
  const database = initDatabase();
  const stmt = database.prepare(`
    SELECT * FROM expressions
    WHERE text LIKE ?
    ORDER BY isHighlighted DESC, createdAt DESC
  `);
  return stmt.all(`%${keyword}%`) as ExpressionRecord[];
}

/**
 * 여러 키워드로 검색 (유의어 확장 검색용)
 */
export function searchExpressionsByKeywords(keywords: string[]): ExpressionRecord[] {
  if (keywords.length === 0) return [];

  const database = initDatabase();
  const placeholders = keywords.map(() => 'text LIKE ?').join(' OR ');
  const stmt = database.prepare(`
    SELECT * FROM expressions
    WHERE ${placeholders}
    ORDER BY isHighlighted DESC, createdAt DESC
  `);

  const params = keywords.map((k) => `%${k}%`);
  return stmt.all(...params) as ExpressionRecord[];
}

// ============ Synonym Group CRUD ============

export function addSynonymGroup(group: SynonymGroupRecord): void {
  const database = initDatabase();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO synonym_groups (id, baseWord, synonyms, category)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(group.id, group.baseWord, group.synonyms, group.category);
}

export function deleteSynonymGroup(groupId: string): void {
  const database = initDatabase();
  const stmt = database.prepare('DELETE FROM synonym_groups WHERE id = ?');
  stmt.run(groupId);
}

export function getAllSynonymGroups(): SynonymGroupRecord[] {
  const database = initDatabase();
  const stmt = database.prepare('SELECT * FROM synonym_groups ORDER BY baseWord');
  return stmt.all() as SynonymGroupRecord[];
}

/**
 * 특정 단어의 유의어 그룹 찾기
 */
export function findSynonymGroup(word: string): SynonymGroupRecord | undefined {
  const database = initDatabase();
  // 기본 단어로 검색
  const stmt1 = database.prepare('SELECT * FROM synonym_groups WHERE baseWord = ?');
  const result = stmt1.get(word) as SynonymGroupRecord | undefined;
  if (result) return result;

  // 유의어 목록에서 검색 (JSON 배열 내 검색)
  const stmt2 = database.prepare(`
    SELECT * FROM synonym_groups
    WHERE synonyms LIKE ?
  `);
  return stmt2.get(`%"${word}"%`) as SynonymGroupRecord | undefined;
}

// ============ Statistics ============

export function getStats(): { movieCount: number; expressionCount: number; highlightedCount: number } {
  const database = initDatabase();

  const movieStmt = database.prepare('SELECT COUNT(*) as count FROM movies');
  const movieCount = (movieStmt.get() as { count: number }).count;

  const exprStmt = database.prepare('SELECT COUNT(*) as count FROM expressions');
  const expressionCount = (exprStmt.get() as { count: number }).count;

  const highlightStmt = database.prepare('SELECT COUNT(*) as count FROM expressions WHERE isHighlighted = 1');
  const highlightedCount = (highlightStmt.get() as { count: number }).count;

  return { movieCount, expressionCount, highlightedCount };
}

// ============ 데이터 마이그레이션 (localStorage → SQLite) ============

export interface LegacyData {
  movies: MovieRecord[];
  expressions: ExpressionRecord[];
  synonymGroups: SynonymGroupRecord[];
}

export function importLegacyData(data: LegacyData): void {
  const database = initDatabase();

  database.transaction(() => {
    // 영화 가져오기
    const movieStmt = database.prepare(`
      INSERT OR IGNORE INTO movies (id, title, director, year, genre, writer, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const movie of data.movies) {
      movieStmt.run(movie.id, movie.title, movie.director, movie.year, movie.genre, movie.writer, movie.createdAt);
    }

    // 표현 가져오기
    const exprStmt = database.prepare(`
      INSERT OR IGNORE INTO expressions (id, movieId, timecode, text, isHighlighted, tags, note, createdAt, modifiedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const expr of data.expressions) {
      exprStmt.run(
        expr.id,
        expr.movieId,
        expr.timecode,
        expr.text,
        expr.isHighlighted,
        expr.tags,
        expr.note,
        expr.createdAt,
        expr.modifiedAt
      );
    }

    // 유의어 그룹 가져오기
    const synStmt = database.prepare(`
      INSERT OR IGNORE INTO synonym_groups (id, baseWord, synonyms, category)
      VALUES (?, ?, ?, ?)
    `);
    for (const group of data.synonymGroups) {
      synStmt.run(group.id, group.baseWord, group.synonyms, group.category);
    }
  })();
}
