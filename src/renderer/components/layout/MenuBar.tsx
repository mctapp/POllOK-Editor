import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronRight, BookMarked } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  useProjectStore,
  useUIStore,
  useADStore,
  useCCStore,
  useVideoStore,
  useExpressionStore,
} from '../../stores';
import { PreferencesDialog } from '../PreferencesDialog';
import { ExpressionDictionaryDialog } from '../ExpressionDictionaryDialog';

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  submenu?: MenuItem[];
  disabled?: boolean;
}

export function MenuBar() {
  const [showPreferences, setShowPreferences] = useState(false);
  const [showExpressionDictionary, setShowExpressionDictionary] = useState(false);
  const { project, createProject, saveProject, closeProject } = useProjectStore();
  const { expressions } = useExpressionStore();
  const {
    setOpenDialog,
    setActiveTab,
    isTimelineCollapsed,
    toggleTimeline,
    showGuidePanel,
    toggleGuidePanel,
    soMode,
    toggleSoMode,
  } = useUIStore();
  const { descriptions } = useADStore();
  const { captions } = useCCStore();
  const { fps } = useVideoStore();
  const isMac = window.api.platform === 'darwin';
  const modKey = isMac ? '⌘' : 'Ctrl';

  // 타임코드 포맷
  const formatTimecode = (frame: number) => {
    const totalSeconds = frame / fps;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const ms = Math.floor((totalSeconds % 1) * 1000);
    return { hours, minutes, seconds, ms, totalSeconds };
  };

  // SRT 형식 내보내기
  const handleExportSRT = async () => {
    if (!project || captions.length === 0) return;

    const path = await window.api.export.selectPath({
      defaultPath: `${project.title}.srt`,
      filters: [{ name: 'SRT Subtitle', extensions: ['srt'] }],
    });

    if (!path) return;

    const content = captions
      .map((cap, index) => {
        const start = formatTimecode(cap.tcIn);
        const end = formatTimecode(cap.tcOut);
        const startStr = `${String(start.hours).padStart(2, '0')}:${String(start.minutes).padStart(2, '0')}:${String(start.seconds).padStart(2, '0')},${String(start.ms).padStart(3, '0')}`;
        const endStr = `${String(end.hours).padStart(2, '0')}:${String(end.minutes).padStart(2, '0')}:${String(end.seconds).padStart(2, '0')},${String(end.ms).padStart(3, '0')}`;
        return `${index + 1}\n${startStr} --> ${endStr}\n${cap.text}\n`;
      })
      .join('\n');

    await window.api.export.writeFile({ path, content });
  };

  // VTT 형식 내보내기
  const handleExportVTT = async () => {
    if (!project || captions.length === 0) return;

    const path = await window.api.export.selectPath({
      defaultPath: `${project.title}.vtt`,
      filters: [{ name: 'WebVTT Subtitle', extensions: ['vtt'] }],
    });

    if (!path) return;

    const cues = captions
      .map((cap) => {
        const start = formatTimecode(cap.tcIn);
        const end = formatTimecode(cap.tcOut);
        const startStr = `${String(start.hours).padStart(2, '0')}:${String(start.minutes).padStart(2, '0')}:${String(start.seconds).padStart(2, '0')}.${String(start.ms).padStart(3, '0')}`;
        const endStr = `${String(end.hours).padStart(2, '0')}:${String(end.minutes).padStart(2, '0')}:${String(end.seconds).padStart(2, '0')}.${String(end.ms).padStart(3, '0')}`;
        return `${startStr} --> ${endStr}\n${cap.text}\n`;
      })
      .join('\n');

    const content = `WEBVTT\n\n${cues}`;
    await window.api.export.writeFile({ path, content });
  };

  // JSON 형식 내보내기
  const handleExportJSON = async () => {
    if (!project) return;

    const path = await window.api.export.selectPath({
      defaultPath: `${project.title}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (!path) return;

    const data = {
      project: {
        title: project.title,
        fps,
      },
      audioDescriptions: descriptions.map((desc) => ({
        id: desc.id,
        tcIn: desc.tcIn,
        tcOut: desc.tcOut,
        tcInSeconds: formatTimecode(desc.tcIn).totalSeconds,
        tcOutSeconds: formatTimecode(desc.tcOut).totalSeconds,
        text: desc.text,
        type: desc.type,
      })),
      captions: captions.map((cap) => ({
        id: cap.id,
        tcIn: cap.tcIn,
        tcOut: cap.tcOut,
        tcInSeconds: formatTimecode(cap.tcIn).totalSeconds,
        tcOutSeconds: formatTimecode(cap.tcOut).totalSeconds,
        text: cap.text,
        type: cap.type,
        speakerId: cap.speakerId,
      })),
    };

    const content = JSON.stringify(data, null, 2);
    await window.api.export.writeFile({ path, content });
  };

  // 타임코드 문자열 포맷 (HH:MM:SS:FF)
  const formatTimecodeString = (frame: number) => {
    const tc = formatTimecode(frame);
    return `${String(tc.hours).padStart(2, '0')}:${String(tc.minutes).padStart(2, '0')}:${String(tc.seconds).padStart(2, '0')}:${String(Math.floor(frame % fps)).padStart(2, '0')}`;
  };

  // CSV 형식 내보내기
  const handleExportCSV = async () => {
    if (!project) return;

    const path = await window.api.export.selectPath({
      defaultPath: `${project.title}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });

    if (!path) return;

    // CSV 헤더
    const headers = ['타입', '시작 타임코드', '종료 타임코드', '시작(초)', '종료(초)', '내용', '유형', '화자'];

    // AD 데이터
    const adRows = descriptions.map((desc) => [
      'AD',
      formatTimecodeString(desc.tcIn),
      formatTimecodeString(desc.tcOut),
      formatTimecode(desc.tcIn).totalSeconds.toFixed(3),
      formatTimecode(desc.tcOut).totalSeconds.toFixed(3),
      `"${(desc.text || '').replace(/"/g, '""')}"`,
      desc.type,
      '',
    ]);

    // CC 데이터
    const ccRows = captions.map((cap) => [
      'CC',
      formatTimecodeString(cap.tcIn),
      formatTimecodeString(cap.tcOut),
      formatTimecode(cap.tcIn).totalSeconds.toFixed(3),
      formatTimecode(cap.tcOut).totalSeconds.toFixed(3),
      `"${(cap.text || '').replace(/"/g, '""')}"`,
      cap.type,
      cap.speakerId || '',
    ]);

    // 모든 행을 타임코드 순으로 정렬
    const allRows = [...adRows, ...ccRows].sort((a, b) => {
      return parseFloat(a[3] as string) - parseFloat(b[3] as string);
    });

    // UTF-8 BOM + CSV 내용
    const bom = '\uFEFF';
    const content = bom + [headers, ...allRows].map((row) => row.join(',')).join('\n');
    await window.api.export.writeFile({ path, content });
  };

  // Excel 형식 내보내기
  const handleExportExcel = async () => {
    if (!project) return;

    const path = await window.api.export.selectPath({
      defaultPath: `${project.title}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });

    if (!path) return;

    // AD 시트 데이터
    const adData = [
      ['번호', '시작 타임코드', '종료 타임코드', '시작(초)', '종료(초)', '내용', '유형'],
      ...descriptions.map((desc, index) => [
        index + 1,
        formatTimecodeString(desc.tcIn),
        formatTimecodeString(desc.tcOut),
        formatTimecode(desc.tcIn).totalSeconds,
        formatTimecode(desc.tcOut).totalSeconds,
        desc.text || '',
        desc.type,
      ]),
    ];

    // CC 시트 데이터
    const ccData = [
      ['번호', '시작 타임코드', '종료 타임코드', '시작(초)', '종료(초)', '내용', '유형', '화자'],
      ...captions.map((cap, index) => [
        index + 1,
        formatTimecodeString(cap.tcIn),
        formatTimecodeString(cap.tcOut),
        formatTimecode(cap.tcIn).totalSeconds,
        formatTimecode(cap.tcOut).totalSeconds,
        cap.text || '',
        cap.type,
        cap.speakerId || '',
      ]),
    ];

    // 전체 데이터 시트 (타임코드 순 정렬)
    const allData = [
      ['타입', '번호', '시작 타임코드', '종료 타임코드', '시작(초)', '종료(초)', '내용', '유형', '화자'],
      ...([
        ...descriptions.map((desc, index) => ({
          type: 'AD',
          index: index + 1,
          tcIn: desc.tcIn,
          tcInStr: formatTimecodeString(desc.tcIn),
          tcOutStr: formatTimecodeString(desc.tcOut),
          tcInSec: formatTimecode(desc.tcIn).totalSeconds,
          tcOutSec: formatTimecode(desc.tcOut).totalSeconds,
          text: desc.text || '',
          subType: desc.type,
          speaker: '',
        })),
        ...captions.map((cap, index) => ({
          type: 'CC',
          index: index + 1,
          tcIn: cap.tcIn,
          tcInStr: formatTimecodeString(cap.tcIn),
          tcOutStr: formatTimecodeString(cap.tcOut),
          tcInSec: formatTimecode(cap.tcIn).totalSeconds,
          tcOutSec: formatTimecode(cap.tcOut).totalSeconds,
          text: cap.text || '',
          subType: cap.type,
          speaker: cap.speakerId || '',
        })),
      ]
        .sort((a, b) => a.tcIn - b.tcIn)
        .map((item) => [
          item.type,
          item.index,
          item.tcInStr,
          item.tcOutStr,
          item.tcInSec,
          item.tcOutSec,
          item.text,
          item.subType,
          item.speaker,
        ])),
    ];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 전체 시트
    const allSheet = XLSX.utils.aoa_to_sheet(allData);
    XLSX.utils.book_append_sheet(workbook, allSheet, '전체');

    // AD 시트
    if (descriptions.length > 0) {
      const adSheet = XLSX.utils.aoa_to_sheet(adData);
      XLSX.utils.book_append_sheet(workbook, adSheet, 'AD (음성해설)');
    }

    // CC 시트
    if (captions.length > 0) {
      const ccSheet = XLSX.utils.aoa_to_sheet(ccData);
      XLSX.utils.book_append_sheet(workbook, ccSheet, 'CC (자막)');
    }

    // 파일 저장
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const uint8Array = new Uint8Array(buffer);
    await window.api.export.writeFile({ path, content: Array.from(uint8Array), binary: true });
  };

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
      { separator: true },
      { label: '환경설정...', shortcut: `${modKey}+,`, action: () => setShowPreferences(true) },
    ],
    View: [
      { label: '음성해설 패널', shortcut: `${modKey}+1`, action: () => setActiveTab('ad') },
      { label: '자막해설 패널', shortcut: `${modKey}+2`, action: () => setActiveTab('cc') },
      { label: '메모 패널', shortcut: `${modKey}+3`, action: () => setActiveTab('memo') },
      { label: '피드백 패널', shortcut: `${modKey}+4`, action: () => setActiveTab('feedback') },
      { separator: true },
      {
        label: showGuidePanel ? '● 가이드 패널' : '◯ 가이드 패널',
        shortcut: 'F1',
        action: toggleGuidePanel,
      },
      {
        label: `표현 사전 (${expressions.length})`,
        shortcut: 'F2',
        action: () => setShowExpressionDictionary(true),
      },
      { separator: true },
      {
        label: soMode ? '● SO 모드 (Sound Only)' : '◯ SO 모드 (Sound Only)',
        shortcut: 'F3',
        action: toggleSoMode,
      },
      { separator: true },
      {
        label: '작업화면 설정',
        submenu: [
          {
            label: isTimelineCollapsed ? '◯ 영상 + 스크립트' : '● 영상 + 스크립트',
            action: () => !isTimelineCollapsed && toggleTimeline(),
          },
          {
            label: isTimelineCollapsed
              ? '● 영상 + 스크립트 + 타임라인'
              : '◯ 영상 + 스크립트 + 타임라인',
            action: () => isTimelineCollapsed && toggleTimeline(),
          },
        ],
      },
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
          {
            label: 'SRT (SubRip)',
            action: handleExportSRT,
            disabled: !project || captions.length === 0,
          },
          {
            label: 'VTT (WebVTT)',
            action: handleExportVTT,
            disabled: !project || captions.length === 0,
          },
          { label: 'STL (EBU)', disabled: true },
        ],
      },
      {
        label: '문서 형식',
        submenu: [
          { label: 'JSON', action: handleExportJSON, disabled: !project },
          {
            label: 'Excel (.xlsx)',
            action: handleExportExcel,
            disabled: !project || (descriptions.length === 0 && captions.length === 0),
          },
          {
            label: 'CSV',
            action: handleExportCSV,
            disabled: !project || (descriptions.length === 0 && captions.length === 0),
          },
        ],
      },
    ],
    Help: [
      { label: '사용 가이드', disabled: true },
      { label: '키보드 단축키', shortcut: `${modKey}+/`, disabled: true },
      { separator: true },
      { label: '업데이트 확인...', disabled: true },
      { separator: true },
      { label: 'AccessON 정보', action: () => setOpenDialog('about') },
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
                  <DropdownMenu.Separator key={index} className="h-px bg-dark-border my-1" />
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

      {/* 표현 사전 바로가기 버튼 */}
      <button
        onClick={() => setShowExpressionDictionary(true)}
        className="ml-2 px-2 py-1 text-gray-400 hover:text-accent-yellow hover:bg-gray-700 rounded transition-colors flex items-center gap-1"
        title="표현 사전 (F2)"
      >
        <BookMarked className="w-4 h-4" />
      </button>

      <PreferencesDialog isOpen={showPreferences} onClose={() => setShowPreferences(false)} />
      <ExpressionDictionaryDialog
        isOpen={showExpressionDictionary}
        onClose={() => setShowExpressionDictionary(false)}
      />
    </div>
  );
}
