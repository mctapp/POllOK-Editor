# Sprint 2: 기본 앱 프레임 & 레이아웃

## 목표
커스텀 타이틀바, 메뉴바, 3-패널 레이아웃, 상태바 구현

---

## 1. 커스텀 타이틀바

### 1.1 TitleBar 컴포넌트

```typescript
// src/renderer/components/layout/TitleBar.tsx
import { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await window.api.window.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();

    return window.api.on('window:maximized-changed', (maximized: boolean) => {
      setIsMaximized(maximized);
    });
  }, []);

  return (
    <div className="h-8 bg-dark-surface flex items-center justify-between select-none">
      {/* 드래그 영역 */}
      <div className="flex-1 h-full app-drag-region flex items-center px-3">
        <span className="text-xs text-gray-400">
          AccessFlow - project_name.afproj
        </span>
      </div>

      {/* 윈도우 컨트롤 (Windows/Linux) */}
      {process.platform !== 'darwin' && (
        <div className="flex h-full">
          <button
            onClick={() => window.api.window.minimize()}
            className="w-12 h-full flex items-center justify-center hover:bg-gray-600 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.api.window.maximize()}
            className="w-12 h-full flex items-center justify-center hover:bg-gray-600 transition-colors"
          >
            {isMaximized ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => window.api.window.close()}
            className="w-12 h-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
```

### 1.2 Mac 트래픽 라이트 처리

```css
/* Mac용 트래픽 라이트 영역 확보 */
.app-drag-region {
  -webkit-app-region: drag;
}

/* Mac에서 왼쪽 여백 추가 */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  .mac-traffic-light-padding {
    padding-left: 78px;
  }
}
```

### 1.3 Main Process 윈도우 이벤트

```typescript
// src/main/ipc/windowHandlers.ts
import { ipcMain, BrowserWindow } from 'electron';

export function setupWindowHandlers(mainWindow: BrowserWindow) {
  ipcMain.on('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow.isMaximized();
  });

  // 최대화 상태 변경 알림
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized-changed', false);
  });
}
```

---

## 2. 메뉴바

### 2.1 MenuBar 컴포넌트

```typescript
// src/renderer/components/layout/MenuBar.tsx
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronRight } from 'lucide-react';

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  submenu?: MenuItem[];
  disabled?: boolean;
}

const menuItems: Record<string, MenuItem[]> = {
  File: [
    { label: '새 프로젝트', shortcut: 'Ctrl+N', action: () => {} },
    { label: '프로젝트 열기...', shortcut: 'Ctrl+O', action: () => {} },
    { separator: true },
    { label: '저장', shortcut: 'Ctrl+S', action: () => {} },
    { label: '다른 이름으로 저장...', shortcut: 'Ctrl+Shift+S', action: () => {} },
    { separator: true },
    { label: '영상 불러오기...', action: () => {} },
    { separator: true },
    { label: '종료', shortcut: 'Alt+F4', action: () => window.api.window.close() },
  ],
  Edit: [
    { label: '실행 취소', shortcut: 'Ctrl+Z', action: () => {} },
    { label: '다시 실행', shortcut: 'Ctrl+Y', action: () => {} },
    { separator: true },
    { label: '잘라내기', shortcut: 'Ctrl+X', action: () => {} },
    { label: '복사', shortcut: 'Ctrl+C', action: () => {} },
    { label: '붙여넣기', shortcut: 'Ctrl+V', action: () => {} },
    { label: '삭제', shortcut: 'Delete', action: () => {} },
    { separator: true },
    { label: '전체 선택', shortcut: 'Ctrl+A', action: () => {} },
  ],
  View: [
    { label: 'AD 패널', shortcut: 'Ctrl+1', action: () => {} },
    { label: 'CC 패널', shortcut: 'Ctrl+2', action: () => {} },
    { label: '타임라인', shortcut: 'Ctrl+3', action: () => {} },
    { separator: true },
    { label: '확대', shortcut: 'Ctrl++', action: () => {} },
    { label: '축소', shortcut: 'Ctrl+-', action: () => {} },
    { label: '기본 크기', shortcut: 'Ctrl+0', action: () => {} },
    { separator: true },
    { label: '전체 화면', shortcut: 'F11', action: () => {} },
  ],
  Project: [
    { label: '프로젝트 설정...', action: () => {} },
    { separator: true },
    { label: '화자 관리...', action: () => {} },
    { label: 'AD 템플릿 관리...', action: () => {} },
    { separator: true },
    { label: '영상 파일 재연결...', action: () => {} },
  ],
  Export: [
    {
      label: '자막 형식',
      submenu: [
        { label: 'SRT (SubRip)', action: () => {} },
        { label: 'VTT (WebVTT)', action: () => {} },
        { label: 'STL (EBU)', action: () => {} },
        { label: 'SCC (Scenarist)', action: () => {} },
        { label: 'TTML', action: () => {} },
      ],
    },
    {
      label: '문서 형식',
      submenu: [
        { label: 'Excel (.xlsx)', action: () => {} },
        { label: 'CSV', action: () => {} },
        { label: 'Word (.docx)', action: () => {} },
      ],
    },
    { separator: true },
    { label: '일괄 내보내기...', shortcut: 'Ctrl+E', action: () => {} },
  ],
  Help: [
    { label: '사용 가이드', action: () => {} },
    { label: '키보드 단축키', shortcut: 'Ctrl+/', action: () => {} },
    { separator: true },
    { label: '업데이트 확인...', action: () => {} },
    { separator: true },
    { label: 'AccessFlow 정보', action: () => {} },
  ],
};

export function MenuBar() {
  return (
    <div className="h-8 bg-dark-surface border-b border-dark-border flex items-center px-2 select-none">
      {Object.entries(menuItems).map(([menuName, items]) => (
        <DropdownMenu.Root key={menuName}>
          <DropdownMenu.Trigger asChild>
            <button className="px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors">
              {menuName}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[200px] bg-dark-surface border border-dark-border rounded-md shadow-lg py-1 z-50"
              sideOffset={4}
            >
              {items.map((item, index) =>
                item.separator ? (
                  <DropdownMenu.Separator
                    key={index}
                    className="h-px bg-dark-border my-1"
                  />
                ) : item.submenu ? (
                  <DropdownMenu.Sub key={item.label}>
                    <DropdownMenu.SubTrigger className="flex items-center justify-between px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 cursor-default outline-none">
                      {item.label}
                      <ChevronRight className="w-4 h-4" />
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.SubContent
                        className="min-w-[160px] bg-dark-surface border border-dark-border rounded-md shadow-lg py-1"
                        sideOffset={4}
                      >
                        {item.submenu.map((subItem) => (
                          <DropdownMenu.Item
                            key={subItem.label}
                            className="px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 cursor-default outline-none"
                            onSelect={subItem.action}
                          >
                            {subItem.label}
                          </DropdownMenu.Item>
                        ))}
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Sub>
                ) : (
                  <DropdownMenu.Item
                    key={item.label}
                    className="flex items-center justify-between px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 cursor-default outline-none disabled:opacity-50"
                    onSelect={item.action}
                    disabled={item.disabled}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-gray-500 ml-4">
                        {item.shortcut}
                      </span>
                    )}
                  </DropdownMenu.Item>
                )
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ))}
    </div>
  );
}
```

---

## 3. 메인 레이아웃

### 3.1 MainLayout 컴포넌트

```typescript
// src/renderer/components/layout/MainLayout.tsx
import { useState, useCallback } from 'react';
import { TitleBar } from './TitleBar';
import { MenuBar } from './MenuBar';
import { StatusBar } from './StatusBar';
import { PanelSplitter } from './PanelSplitter';
import { VideoPanel } from '../panels/VideoPanel';
import { ScriptPanel } from '../panels/ScriptPanel';
import { TimelinePanel } from '../panels/TimelinePanel';

export function MainLayout() {
  const [leftPanelWidth, setLeftPanelWidth] = useState(480);
  const [timelineHeight, setTimelineHeight] = useState(200);

  const handleLeftResize = useCallback((delta: number) => {
    setLeftPanelWidth((prev) => Math.max(300, Math.min(800, prev + delta)));
  }, []);

  const handleTimelineResize = useCallback((delta: number) => {
    setTimelineHeight((prev) => Math.max(100, Math.min(400, prev - delta)));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      {/* 타이틀바 */}
      <TitleBar />

      {/* 메뉴바 */}
      <MenuBar />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단: 비디오 + 스크립트 패널 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 왼쪽: 비디오 플레이어 */}
          <div style={{ width: leftPanelWidth }} className="flex-shrink-0">
            <VideoPanel />
          </div>

          {/* 수직 분할선 */}
          <PanelSplitter direction="vertical" onResize={handleLeftResize} />

          {/* 오른쪽: 스크립트 에디터 */}
          <div className="flex-1 overflow-hidden">
            <ScriptPanel />
          </div>
        </div>

        {/* 수평 분할선 */}
        <PanelSplitter direction="horizontal" onResize={handleTimelineResize} />

        {/* 하단: 타임라인 */}
        <div style={{ height: timelineHeight }} className="flex-shrink-0">
          <TimelinePanel />
        </div>
      </div>

      {/* 상태바 */}
      <StatusBar />
    </div>
  );
}
```

### 3.2 PanelSplitter 컴포넌트

```typescript
// src/renderer/components/layout/PanelSplitter.tsx
import { useCallback, useState, useRef, useEffect } from 'react';

interface PanelSplitterProps {
  direction: 'vertical' | 'horizontal';
  onResize: (delta: number) => void;
}

export function PanelSplitter({ direction, onResize }: PanelSplitterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = direction === 'vertical' ? e.clientX : e.clientY;
  }, [direction]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'vertical' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      startPosRef.current = currentPos;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, onResize]);

  return (
    <div
      className={`
        ${direction === 'vertical' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
        bg-dark-border hover:bg-primary-500 transition-colors
        ${isDragging ? 'bg-primary-500' : ''}
      `}
      onMouseDown={handleMouseDown}
    />
  );
}
```

---

## 4. 상태바

### 4.1 StatusBar 컴포넌트

```typescript
// src/renderer/components/layout/StatusBar.tsx
import { useProjectStore } from '@renderer/stores/projectStore';
import { useADStore } from '@renderer/stores/adStore';
import { useCCStore } from '@renderer/stores/ccStore';
import { Cloud, CloudOff, HardDrive } from 'lucide-react';

export function StatusBar() {
  const { isDirty, lastSaved } = useProjectStore();
  const descriptions = useADStore((state) => state.descriptions);
  const captions = useCCStore((state) => state.captions);

  const formatLastSaved = () => {
    if (!lastSaved) return '저장된 적 없음';
    const diff = Date.now() - lastSaved.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '방금 저장됨';
    if (minutes < 60) return `${minutes}분 전 저장됨`;
    const hours = Math.floor(minutes / 60);
    return `${hours}시간 전 저장됨`;
  };

  return (
    <div className="h-6 bg-dark-surface border-t border-dark-border flex items-center justify-between px-3 text-xs text-gray-400 select-none">
      {/* 왼쪽: 상태 */}
      <div className="flex items-center gap-4">
        <span className={isDirty ? 'text-yellow-400' : ''}>
          {isDirty ? '변경됨' : 'Ready'}
        </span>
        <span className="text-gray-500">|</span>
        <span>{formatLastSaved()}</span>
      </div>

      {/* 가운데: 통계 */}
      <div className="flex items-center gap-4">
        <span>AD: {descriptions.length}개</span>
        <span>CC: {captions.length}개</span>
      </div>

      {/* 오른쪽: 연결 상태 */}
      <div className="flex items-center gap-2">
        <HardDrive className="w-3.5 h-3.5" />
        <span>오프라인</span>
      </div>
    </div>
  );
}
```

---

## 5. 패널 컴포넌트 (플레이스홀더)

### 5.1 VideoPanel

```typescript
// src/renderer/components/panels/VideoPanel.tsx
export function VideoPanel() {
  return (
    <div className="h-full bg-black flex flex-col">
      {/* 비디오 영역 */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 text-sm">
          영상 파일을 불러오세요
        </div>
      </div>

      {/* 컨트롤 영역 */}
      <div className="h-20 bg-dark-surface border-t border-dark-border p-2">
        <div className="flex items-center justify-center gap-4">
          <button className="text-gray-400 hover:text-white">◀◀</button>
          <button className="text-gray-400 hover:text-white">◀</button>
          <button className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center">
            ▶
          </button>
          <button className="text-gray-400 hover:text-white">▶</button>
          <button className="text-gray-400 hover:text-white">▶▶</button>
        </div>
        <div className="text-center mt-2 font-timecode text-sm text-gray-400">
          00:00:00:00
        </div>
      </div>
    </div>
  );
}
```

### 5.2 ScriptPanel

```typescript
// src/renderer/components/panels/ScriptPanel.tsx
import { useState } from 'react';

type TabType = 'ad' | 'cc';

export function ScriptPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('ad');

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      {/* 탭 헤더 */}
      <div className="flex items-center border-b border-dark-border">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'ad'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('ad')}
        >
          AD (화면해설)
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'cc'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('cc')}
        >
          CC (자막)
        </button>
        <div className="flex-1" />
        <button className="px-3 py-1 mr-2 text-sm bg-primary-600 hover:bg-primary-500 rounded transition-colors">
          + 추가
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'ad' ? (
          <div className="text-gray-500 text-sm text-center py-8">
            화면해설 항목이 없습니다.
            <br />
            <span className="text-xs">Ctrl+D로 새 항목을 추가하세요.</span>
          </div>
        ) : (
          <div className="text-gray-500 text-sm text-center py-8">
            자막 항목이 없습니다.
            <br />
            <span className="text-xs">Ctrl+T로 새 항목을 추가하세요.</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5.3 TimelinePanel

```typescript
// src/renderer/components/panels/TimelinePanel.tsx
export function TimelinePanel() {
  return (
    <div className="h-full bg-dark-surface flex flex-col">
      {/* 타임라인 헤더 */}
      <div className="h-6 border-b border-dark-border flex items-center px-2">
        <span className="text-xs text-gray-500">Timeline</span>
      </div>

      {/* 타임라인 콘텐츠 */}
      <div className="flex-1 relative">
        {/* 파형 영역 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-600 text-sm">
            영상을 불러오면 타임라인이 표시됩니다
          </span>
        </div>

        {/* 재생 위치 인디케이터 */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-red-500" />
      </div>

      {/* 타임 룰러 */}
      <div className="h-5 border-t border-dark-border bg-dark-bg flex items-center px-2">
        <div className="flex-1 flex justify-between text-xs text-gray-600 font-timecode">
          <span>00:00</span>
          <span>01:00</span>
          <span>02:00</span>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. 완료 체크리스트

- [ ] TitleBar 컴포넌트 구현
- [ ] 윈도우 컨트롤 (최소화/최대화/닫기) 동작 확인
- [ ] Mac 트래픽 라이트 영역 처리
- [ ] MenuBar 컴포넌트 구현
- [ ] 드롭다운 메뉴 동작 확인
- [ ] 서브메뉴 동작 확인
- [ ] MainLayout 3-패널 구조 구현
- [ ] PanelSplitter 드래그 리사이즈 동작 확인
- [ ] StatusBar 구현
- [ ] 패널 플레이스홀더 구현

---

## 다음 단계

Sprint 3-4에서는 다음을 구현합니다:
- video.js 통합
- 로컬 영상 파일 재생
- SMPTE 타임코드 표시
- 프레임 단위 탐색
