import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronRight } from 'lucide-react';
import { useProjectStore, useUIStore } from '../../stores';

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  submenu?: MenuItem[];
  disabled?: boolean;
}

export function MenuBar() {
  const { createProject, saveProject, closeProject } = useProjectStore();
  const { setOpenDialog, setActiveTab } = useUIStore();
  const isMac = window.api.platform === 'darwin';
  const modKey = isMac ? '⌘' : 'Ctrl';

  const handleNewProject = () => {
    createProject('새 프로젝트');
  };

  const handleOpenProject = async () => {
    const path = await window.api.file.selectProject();
    if (path) {
      await useProjectStore.getState().openProject(path);
    }
  };

  const handleLoadVideo = async () => {
    const path = await window.api.file.selectVideo();
    if (path) {
      // TODO: 비디오 로드 구현
      console.log('Selected video:', path);
    }
  };

  const menuItems: Record<string, MenuItem[]> = {
    File: [
      { label: '새 프로젝트', shortcut: `${modKey}+N`, action: handleNewProject },
      { label: '프로젝트 열기...', shortcut: `${modKey}+O`, action: handleOpenProject },
      { separator: true },
      { label: '저장', shortcut: `${modKey}+S`, action: saveProject },
      {
        label: '다른 이름으로 저장...',
        shortcut: `${modKey}+Shift+S`,
        action: () => useProjectStore.getState().saveProjectAs(),
      },
      { separator: true },
      { label: '영상 불러오기...', action: handleLoadVideo },
      { separator: true },
      {
        label: '프로젝트 닫기',
        action: closeProject,
        disabled: !useProjectStore.getState().project,
      },
      { separator: true },
      {
        label: '종료',
        shortcut: isMac ? '⌘+Q' : 'Alt+F4',
        action: () => window.api.window.close(),
      },
    ],
    Edit: [
      { label: '실행 취소', shortcut: `${modKey}+Z`, disabled: true },
      { label: '다시 실행', shortcut: isMac ? '⌘+Shift+Z' : 'Ctrl+Y', disabled: true },
      { separator: true },
      { label: '잘라내기', shortcut: `${modKey}+X`, disabled: true },
      { label: '복사', shortcut: `${modKey}+C`, disabled: true },
      { label: '붙여넣기', shortcut: `${modKey}+V`, disabled: true },
      { label: '삭제', shortcut: 'Delete', disabled: true },
      { separator: true },
      { label: '전체 선택', shortcut: `${modKey}+A`, disabled: true },
    ],
    View: [
      { label: 'AD 패널', shortcut: `${modKey}+1`, action: () => setActiveTab('ad') },
      { label: 'CC 패널', shortcut: `${modKey}+2`, action: () => setActiveTab('cc') },
      { separator: true },
      { label: '확대', shortcut: `${modKey}++`, disabled: true },
      { label: '축소', shortcut: `${modKey}+-`, disabled: true },
      { label: '기본 크기', shortcut: `${modKey}+0`, disabled: true },
    ],
    Project: [
      { label: '프로젝트 설정...', action: () => setOpenDialog('settings') },
      { separator: true },
      { label: '화자 관리...', disabled: true },
      { label: 'AD 템플릿 관리...', disabled: true },
      { separator: true },
      { label: '영상 파일 재연결...', disabled: true },
    ],
    Export: [
      {
        label: '자막 형식',
        submenu: [
          { label: 'SRT (SubRip)', disabled: true },
          { label: 'VTT (WebVTT)', disabled: true },
          { label: 'STL (EBU)', disabled: true },
        ],
      },
      {
        label: '문서 형식',
        submenu: [
          { label: 'Excel (.xlsx)', disabled: true },
          { label: 'CSV', disabled: true },
        ],
      },
      { separator: true },
      {
        label: '내보내기...',
        shortcut: `${modKey}+E`,
        action: () => setOpenDialog('export'),
        disabled: true,
      },
    ],
    Help: [
      { label: '사용 가이드', disabled: true },
      { label: '키보드 단축키', shortcut: `${modKey}+/`, disabled: true },
      { separator: true },
      { label: '업데이트 확인...', disabled: true },
      { separator: true },
      { label: 'AccessFlow 정보', action: () => setOpenDialog('about') },
    ],
  };

  return (
    <div className="h-8 bg-dark-surface border-b border-dark-border flex items-center px-2 select-none">
      {Object.entries(menuItems).map(([menuName, items]) => (
        <DropdownMenu.Root key={menuName}>
          <DropdownMenu.Trigger asChild>
            <button className="px-3 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors outline-none">
              {menuName}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[200px] bg-dark-surface border border-dark-border rounded-md shadow-xl py-1 z-50"
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
                    <DropdownMenu.SubTrigger className="flex items-center justify-between px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 cursor-default outline-none data-[disabled]:opacity-50">
                      {item.label}
                      <ChevronRight className="w-4 h-4" />
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.SubContent
                        className="min-w-[160px] bg-dark-surface border border-dark-border rounded-md shadow-xl py-1"
                        sideOffset={4}
                      >
                        {item.submenu.map((subItem) => (
                          <DropdownMenu.Item
                            key={subItem.label}
                            className="px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 cursor-default outline-none data-[disabled]:opacity-50"
                            onSelect={subItem.action}
                            disabled={subItem.disabled}
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
                    className="flex items-center justify-between px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 cursor-default outline-none data-[disabled]:opacity-50"
                    onSelect={item.action}
                    disabled={item.disabled}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-gray-500 ml-4">{item.shortcut}</span>
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
