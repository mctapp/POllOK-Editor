# Sprint 1: 프로젝트 초기 설정

## 목표
Electron + React + TypeScript 기반 프로젝트 설정 및 기본 인프라 구축

---

## 1. 프로젝트 초기화

### 1.1 Electron-Vite 프로젝트 생성

```bash
# 프로젝트 디렉토리에서 실행
npm create electron-vite@latest . -- --template react-ts

# 또는 수동 설정
npm init -y
npm install electron electron-vite vite react react-dom
npm install -D typescript @types/react @types/react-dom
```

### 1.2 필수 패키지 설치

```bash
# UI 프레임워크
npm install tailwindcss postcss autoprefixer
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-tooltip @radix-ui/react-slider
npm install lucide-react

# 상태 관리
npm install zustand

# 비디오 플레이어
npm install video.js @types/video.js

# 파형 시각화
npm install wavesurfer.js

# TTS
npm install say

# 데이터베이스
npm install better-sqlite3
npm install -D @types/better-sqlite3

# 유틸리티
npm install uuid date-fns
npm install -D @types/uuid

# 내보내기
npm install exceljs

# 빌드 도구
npm install -D electron-builder

# 테스트
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
```

### 1.3 TailwindCSS 설정

```bash
npx tailwindcss init -p
```

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        dark: {
          bg: '#1a1a1a',
          surface: '#2d2d2d',
          border: '#404040',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
```

---

## 2. TypeScript 설정

### 2.1 tsconfig.json (루트)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./src/shared/*"],
      "@renderer/*": ["./src/renderer/*"],
      "@main/*": ["./src/main/*"]
    }
  },
  "include": ["src"],
  "references": [
    { "path": "./tsconfig.node.json" }
  ]
}
```

### 2.2 tsconfig.node.json

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": [
    "vite.config.ts",
    "electron-builder.yml",
    "scripts/**/*"
  ]
}
```

---

## 3. Vite 설정

### 3.1 vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron', 'better-sqlite3'],
            },
          },
        },
      },
      {
        entry: 'src/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist/preload',
          },
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@main': path.resolve(__dirname, './src/main'),
    },
  },
  build: {
    outDir: 'dist/renderer',
  },
});
```

---

## 4. Electron Builder 설정

### 4.1 electron-builder.yml

```yaml
appId: com.accessflow.app
productName: AccessFlow
copyright: Copyright 2026

directories:
  output: release
  buildResources: resources

files:
  - dist/**/*
  - package.json

mac:
  category: public.app-category.video
  icon: resources/icons/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: resources/entitlements.mac.plist
  entitlementsInherit: resources/entitlements.mac.plist
  target:
    - target: dmg
      arch: [x64, arm64]

win:
  icon: resources/icons/icon.ico
  target:
    - target: nsis
      arch: [x64]

nsis:
  oneClick: false
  perMachine: true
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: true

linux:
  icon: resources/icons
  category: AudioVideo
  target:
    - AppImage
    - deb

publish:
  provider: github
  owner: your-username
  repo: accessflow
```

---

## 5. 기본 파일 구조 생성

### 5.1 Main Process Entry

```typescript
// src/main/index.ts
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    frame: false, // 커스텀 타이틀바 사용
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

### 5.2 Preload Script

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // 윈도우 컨트롤
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // 파일 작업
  file: {
    selectVideo: () => ipcRenderer.invoke('file:selectVideo'),
    selectProject: () => ipcRenderer.invoke('file:selectProject'),
    saveProject: (data: unknown) => ipcRenderer.invoke('file:saveProject', data),
    readProject: (path: string) => ipcRenderer.invoke('file:readProject', path),
  },

  // 이벤트
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
    return () => ipcRenderer.removeListener(channel, callback);
  },
};

contextBridge.exposeInMainWorld('api', api);

// TypeScript 타입 정의
declare global {
  interface Window {
    api: typeof api;
  }
}
```

### 5.3 React Entry

```typescript
// src/renderer/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 5.4 App Component

```typescript
// src/renderer/App.tsx
import { MainLayout } from './components/layout/MainLayout';

function App() {
  return (
    <div className="h-screen bg-dark-bg text-white">
      <MainLayout />
    </div>
  );
}

export default App;
```

### 5.5 Global Styles

```css
/* src/renderer/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #1a1a1a;
  color: #ffffff;
  -webkit-font-smoothing: antialiased;
}

/* 스크롤바 스타일 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #2d2d2d;
}

::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #666;
}

/* 선택 불가 (드래그 방지) */
.no-select {
  user-select: none;
  -webkit-user-select: none;
}

/* 타임코드 폰트 */
.font-timecode {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-variant-numeric: tabular-nums;
}
```

---

## 6. package.json 스크립트

```json
{
  "name": "accessflow",
  "version": "0.1.0",
  "description": "AD/CC Script Editor",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "dist": "npm run build && electron-builder",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:win": "npm run build && electron-builder --win",
    "dist:linux": "npm run build && electron-builder --linux"
  },
  "author": "",
  "license": "MIT"
}
```

---

## 7. ESLint 설정

```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

---

## 8. Prettier 설정

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

---

## 9. Git 설정

### 9.1 .gitignore

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
release/
out/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Test
coverage/
.nyc_output/

# Environment
.env
.env.local
.env.*.local

# Electron
*.asar

# SQLite
*.db
*.sqlite
```

---

## 10. 완료 체크리스트

- [ ] 프로젝트 디렉토리 구조 생성 완료
- [ ] 모든 필수 패키지 설치 완료
- [ ] TypeScript 설정 완료
- [ ] Vite 설정 완료
- [ ] TailwindCSS 설정 완료
- [ ] ESLint/Prettier 설정 완료
- [ ] 기본 Main Process 실행 확인
- [ ] 기본 Renderer 화면 표시 확인
- [ ] 개발 서버 (npm run dev) 정상 작동
- [ ] 빌드 (npm run build) 정상 완료

---

## 다음 단계

Sprint 2에서는 다음을 구현합니다:
- 커스텀 타이틀바
- 메뉴바
- 기본 레이아웃 (3-패널 구조)
- 상태바
