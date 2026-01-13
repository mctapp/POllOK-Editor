# AccessFlow 아키텍처 설계

## 1. 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AccessFlow                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Renderer Process                          │   │
│  │                      (React App)                             │   │
│  │                                                              │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │   │
│  │  │ VideoPlayer  │ │   Timeline   │ │ ScriptEditor │        │   │
│  │  │  Component   │ │  Component   │ │  Component   │        │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘        │   │
│  │                                                              │   │
│  │  ┌────────────────────────────────────────────────────┐     │   │
│  │  │              Zustand Store                          │     │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │     │   │
│  │  │  │ project │ │  video  │ │   ad    │ │   cc    │  │     │   │
│  │  │  │  Store  │ │  Store  │ │  Store  │ │  Store  │  │     │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │     │   │
│  │  └────────────────────────────────────────────────────┘     │   │
│  │                           │                                  │   │
│  └───────────────────────────┼──────────────────────────────────┘   │
│                              │ IPC                                   │
│  ┌───────────────────────────┼──────────────────────────────────┐   │
│  │                    Preload Script                             │   │
│  │              (Secure Bridge / Context Isolation)              │   │
│  └───────────────────────────┼──────────────────────────────────┘   │
│                              │                                       │
│  ┌───────────────────────────┼──────────────────────────────────┐   │
│  │                     Main Process                              │   │
│  │                                                               │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │   │
│  │  │   File      │ │   Export    │ │    TTS      │            │   │
│  │  │  Service    │ │   Service   │ │   Service   │            │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘            │   │
│  │                                                               │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │   │
│  │  │   Project   │ │   SQLite    │ │   Window    │            │   │
│  │  │   Service   │ │   Database  │ │   Manager   │            │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘            │   │
│  │                                                               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 디렉토리 구조

```
accessflow/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # PR 빌드/테스트
│   │   └── release.yml               # 릴리스 자동화
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── pull_request_template.md
│
├── src/
│   ├── main/                         # Electron Main Process
│   │   ├── index.ts                  # 메인 엔트리포인트
│   │   ├── window.ts                 # 윈도우 관리
│   │   ├── menu.ts                   # 앱 메뉴
│   │   │
│   │   ├── ipc/                      # IPC 핸들러
│   │   │   ├── index.ts
│   │   │   ├── fileHandlers.ts
│   │   │   ├── projectHandlers.ts
│   │   │   ├── exportHandlers.ts
│   │   │   └── ttsHandlers.ts
│   │   │
│   │   ├── services/                 # 비즈니스 로직
│   │   │   ├── FileService.ts
│   │   │   ├── ProjectService.ts
│   │   │   ├── ExportService.ts
│   │   │   ├── TTSService.ts
│   │   │   └── HashService.ts
│   │   │
│   │   ├── exporters/                # 내보내기 모듈
│   │   │   ├── SRTExporter.ts
│   │   │   ├── VTTExporter.ts
│   │   │   ├── STLExporter.ts
│   │   │   ├── ExcelExporter.ts
│   │   │   └── CSVExporter.ts
│   │   │
│   │   └── db/                       # 데이터베이스
│   │       ├── index.ts
│   │       ├── migrations/
│   │       └── schema.ts
│   │
│   ├── renderer/                     # React Frontend
│   │   ├── index.html
│   │   ├── main.tsx                  # React 엔트리포인트
│   │   ├── App.tsx
│   │   │
│   │   ├── components/               # UI 컴포넌트
│   │   │   ├── common/               # 공통 컴포넌트
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Dropdown.tsx
│   │   │   │   └── Tooltip.tsx
│   │   │   │
│   │   │   ├── layout/               # 레이아웃
│   │   │   │   ├── TitleBar.tsx
│   │   │   │   ├── MenuBar.tsx
│   │   │   │   ├── StatusBar.tsx
│   │   │   │   ├── MainLayout.tsx
│   │   │   │   └── PanelSplitter.tsx
│   │   │   │
│   │   │   ├── VideoPlayer/          # 비디오 플레이어
│   │   │   │   ├── VideoPlayer.tsx
│   │   │   │   ├── VideoControls.tsx
│   │   │   │   ├── TimecodeDisplay.tsx
│   │   │   │   ├── SpeedControl.tsx
│   │   │   │   ├── VolumeControl.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Timeline/             # 타임라인
│   │   │   │   ├── Timeline.tsx
│   │   │   │   ├── Waveform.tsx
│   │   │   │   ├── Track.tsx
│   │   │   │   ├── EventBlock.tsx
│   │   │   │   ├── Playhead.tsx
│   │   │   │   ├── TimeRuler.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── ScriptEditor/         # 스크립트 에디터
│   │   │   │   ├── ScriptEditor.tsx
│   │   │   │   ├── ScriptList.tsx
│   │   │   │   ├── ScriptCard.tsx
│   │   │   │   ├── ADEditor.tsx
│   │   │   │   ├── CCEditor.tsx
│   │   │   │   ├── SpeakerManager.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── dialogs/              # 다이얼로그
│   │   │       ├── NewProjectDialog.tsx
│   │   │       ├── ExportDialog.tsx
│   │   │       ├── SettingsDialog.tsx
│   │   │       └── AboutDialog.tsx
│   │   │
│   │   ├── stores/                   # Zustand 상태 관리
│   │   │   ├── index.ts
│   │   │   ├── projectStore.ts
│   │   │   ├── videoStore.ts
│   │   │   ├── adStore.ts
│   │   │   ├── ccStore.ts
│   │   │   ├── uiStore.ts
│   │   │   └── settingsStore.ts
│   │   │
│   │   ├── hooks/                    # 커스텀 훅
│   │   │   ├── useVideoPlayer.ts
│   │   │   ├── useTimecode.ts
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   ├── useAutoSave.ts
│   │   │   └── useIPC.ts
│   │   │
│   │   ├── utils/                    # 유틸리티
│   │   │   ├── timecode.ts
│   │   │   ├── formatters.ts
│   │   │   └── validators.ts
│   │   │
│   │   └── styles/                   # 스타일
│   │       ├── globals.css
│   │       └── components/
│   │
│   ├── shared/                       # Main/Renderer 공유
│   │   ├── types/                    # TypeScript 타입
│   │   │   ├── project.ts
│   │   │   ├── description.ts
│   │   │   ├── caption.ts
│   │   │   ├── speaker.ts
│   │   │   ├── video.ts
│   │   │   └── ipc.ts
│   │   │
│   │   ├── constants/                # 상수
│   │   │   ├── shortcuts.ts
│   │   │   ├── formats.ts
│   │   │   └── defaults.ts
│   │   │
│   │   └── schemas/                  # 검증 스키마
│   │       ├── project.schema.ts
│   │       └── export.schema.ts
│   │
│   └── preload/                      # Preload 스크립트
│       ├── index.ts
│       └── api.ts
│
├── resources/                        # 정적 리소스
│   ├── icons/
│   │   ├── icon.icns                 # Mac
│   │   ├── icon.ico                  # Windows
│   │   └── icon.png                  # Linux
│   └── templates/
│       └── ad-templates.json
│
├── scripts/                          # 빌드 스크립트
│   ├── build.js
│   └── notarize.js
│
├── tests/                            # 테스트
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .eslintrc.cjs
├── .prettierrc
└── README.md
```

---

## 3. 상태 관리 설계 (Zustand)

### 3.1 Store 구조

```typescript
// stores/projectStore.ts
interface ProjectState {
  // 상태
  id: string | null;
  title: string;
  filePath: string | null;
  isDirty: boolean;
  lastSaved: Date | null;

  // 액션
  createProject: (title: string) => void;
  openProject: (path: string) => Promise<void>;
  saveProject: () => Promise<void>;
  closeProject: () => void;
  setDirty: (dirty: boolean) => void;
}

// stores/videoStore.ts
interface VideoState {
  // 상태
  source: string | null;
  duration: number;           // 프레임 단위
  fps: number;
  resolution: { width: number; height: number };
  currentFrame: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  inPoint: number | null;
  outPoint: number | null;

  // 액션
  loadVideo: (path: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (frame: number) => void;
  setPlaybackRate: (rate: number) => void;
  setInPoint: () => void;
  setOutPoint: () => void;
  clearPoints: () => void;
}

// stores/adStore.ts
interface ADState {
  // 상태
  descriptions: AudioDescription[];
  selectedIds: string[];

  // 액션
  addDescription: (desc: Partial<AudioDescription>) => void;
  updateDescription: (id: string, updates: Partial<AudioDescription>) => void;
  deleteDescription: (id: string) => void;
  selectDescription: (id: string) => void;
  clearSelection: () => void;
}

// stores/ccStore.ts
interface CCState {
  // 상태
  captions: Caption[];
  speakers: Speaker[];
  selectedIds: string[];

  // 액션
  addCaption: (caption: Partial<Caption>) => void;
  updateCaption: (id: string, updates: Partial<Caption>) => void;
  deleteCaption: (id: string) => void;
  addSpeaker: (speaker: Partial<Speaker>) => void;
  updateSpeaker: (id: string, updates: Partial<Speaker>) => void;
  deleteSpeaker: (id: string) => void;
}
```

### 3.2 Store 연동

```typescript
// stores/index.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// 스토어 간 연동을 위한 미들웨어 사용
export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set, get) => ({
    // ...implementation
  }))
);

// AD/CC 변경 시 프로젝트 dirty 플래그 설정
useADStore.subscribe(
  (state) => state.descriptions,
  () => useProjectStore.getState().setDirty(true)
);
```

---

## 4. IPC 통신 설계

### 4.1 채널 정의

```typescript
// shared/types/ipc.ts

// 파일 관련
export const FileChannels = {
  SELECT_VIDEO: 'file:select-video',
  SELECT_PROJECT: 'file:select-project',
  SAVE_PROJECT: 'file:save-project',
  READ_PROJECT: 'file:read-project',
  CALCULATE_HASH: 'file:calculate-hash',
} as const;

// 내보내기 관련
export const ExportChannels = {
  EXPORT_SRT: 'export:srt',
  EXPORT_VTT: 'export:vtt',
  EXPORT_EXCEL: 'export:excel',
  EXPORT_CSV: 'export:csv',
  SELECT_EXPORT_PATH: 'export:select-path',
} as const;

// TTS 관련
export const TTSChannels = {
  SPEAK: 'tts:speak',
  STOP: 'tts:stop',
  GET_VOICES: 'tts:get-voices',
  ESTIMATE_DURATION: 'tts:estimate-duration',
} as const;
```

### 4.2 Preload API

```typescript
// preload/api.ts
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  file: {
    selectVideo: () => ipcRenderer.invoke(FileChannels.SELECT_VIDEO),
    selectProject: () => ipcRenderer.invoke(FileChannels.SELECT_PROJECT),
    saveProject: (data: ProjectData) =>
      ipcRenderer.invoke(FileChannels.SAVE_PROJECT, data),
    readProject: (path: string) =>
      ipcRenderer.invoke(FileChannels.READ_PROJECT, path),
    calculateHash: (path: string) =>
      ipcRenderer.invoke(FileChannels.CALCULATE_HASH, path),
  },

  export: {
    toSRT: (data: ExportData, path: string) =>
      ipcRenderer.invoke(ExportChannels.EXPORT_SRT, data, path),
    toVTT: (data: ExportData, path: string) =>
      ipcRenderer.invoke(ExportChannels.EXPORT_VTT, data, path),
    toExcel: (data: ExportData, path: string) =>
      ipcRenderer.invoke(ExportChannels.EXPORT_EXCEL, data, path),
    selectPath: (defaultName: string) =>
      ipcRenderer.invoke(ExportChannels.SELECT_EXPORT_PATH, defaultName),
  },

  tts: {
    speak: (text: string, voice?: string) =>
      ipcRenderer.invoke(TTSChannels.SPEAK, text, voice),
    stop: () => ipcRenderer.invoke(TTSChannels.STOP),
    getVoices: () => ipcRenderer.invoke(TTSChannels.GET_VOICES),
    estimateDuration: (text: string) =>
      ipcRenderer.invoke(TTSChannels.ESTIMATE_DURATION, text),
  },

  // 이벤트 리스너
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
};

contextBridge.exposeInMainWorld('api', api);
```

---

## 5. 데이터 모델

### 5.1 TypeScript 인터페이스

```typescript
// shared/types/project.ts
export interface Project {
  version: string;
  id: string;
  title: string;
  createdAt: string;
  modifiedAt: string;
  video: VideoInfo;
  settings: ProjectSettings;
  sync?: SyncInfo;
}

export interface VideoInfo {
  path: string;
  filename: string;
  hash: string;
  durationFrames: number;
  fps: number;
  resolution: string;
}

export interface ProjectSettings {
  timecodeFormat: 'smpte' | 'milliseconds';
  defaultAdVoice: string;
  ccMaxCharsPerLine: number;
  ccMaxLines: number;
}

// shared/types/description.ts
export interface AudioDescription {
  id: string;
  tcIn: number;           // 프레임 단위
  tcOut: number;
  text: string;
  type: ADType;
  voice: string;
  status: Status;
  createdAt: string;
  modifiedAt: string;
}

export type ADType = 'scene' | 'character' | 'text' | 'action' | 'other';
export type Status = 'draft' | 'review' | 'approved';

// shared/types/caption.ts
export interface Caption {
  id: string;
  tcIn: number;
  tcOut: number;
  text: string;
  speakerId: string | null;
  position: Position;
  align: Alignment;
  type: CaptionType;
  style: CaptionStyle;
  createdAt: string;
  modifiedAt: string;
}

export type Position = 'top' | 'center' | 'bottom';
export type Alignment = 'left' | 'center' | 'right';
export type CaptionType = 'dialogue' | 'effect' | 'music' | 'narrator';

export interface CaptionStyle {
  color: string;
  background: string;
}

// shared/types/speaker.ts
export interface Speaker {
  id: string;
  name: string;
  color: string;
}
```

### 5.2 프로젝트 파일 구조 (.afproj)

```json
{
  "version": "1.0",
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "프로젝트명",
    "createdAt": "2026-01-13T09:00:00Z",
    "modifiedAt": "2026-01-13T15:30:00Z"
  },
  "video": {
    "path": "/path/to/video.mov",
    "filename": "video.mov",
    "hash": "sha256:abc123...",
    "durationFrames": 172800,
    "fps": 24,
    "resolution": "1920x1080"
  },
  "settings": {
    "timecodeFormat": "smpte",
    "defaultAdVoice": "ko-KR-Standard-A",
    "ccMaxCharsPerLine": 42,
    "ccMaxLines": 2
  },
  "descriptions": [...],
  "captions": [...],
  "speakers": [...]
}
```

---

## 6. 보안 고려사항

### 6.1 Context Isolation

```typescript
// main/index.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,      // 필수
    nodeIntegration: false,      // 필수
    sandbox: true,               // 권장
    preload: path.join(__dirname, 'preload.js'),
  },
});
```

### 6.2 IPC 보안

```typescript
// main/ipc/fileHandlers.ts
ipcMain.handle(FileChannels.READ_PROJECT, async (event, filePath: string) => {
  // 경로 검증
  if (!isValidPath(filePath)) {
    throw new Error('Invalid file path');
  }

  // 확장자 검증
  if (!filePath.endsWith('.afproj')) {
    throw new Error('Invalid file type');
  }

  // 파일 읽기
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
});
```

---

## 7. 성능 최적화 전략

### 7.1 비디오 메모리 관리
- 프록시 비디오 사용 (대용량 파일)
- 청크 기반 파형 렌더링
- 오프스크린 캔버스 활용

### 7.2 상태 업데이트 최적화
- Zustand selector를 통한 필요한 상태만 구독
- React.memo 및 useMemo 활용
- 디바운싱/스로틀링 적용

### 7.3 렌더링 최적화
- 가상 스크롤링 (긴 스크립트 리스트)
- 캔버스 기반 타임라인 렌더링
- requestAnimationFrame 활용

---

*이 문서는 개발 진행에 따라 업데이트됩니다.*
