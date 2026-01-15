import { useState } from 'react';
import {
  X,
  RotateCcw,
  Keyboard,
  AudioWaveform,
  LayoutPanelTop,
  Type,
  Subtitles,
} from 'lucide-react';
import {
  useSettingsStore,
  SHORTCUT_LABELS,
  DEFAULT_SHORTCUTS,
  DEFAULT_WAVEFORM,
  DEFAULT_TIMELINE,
  DEFAULT_SCRIPT,
  DEFAULT_OVERLAY,
  type KeyboardShortcuts,
} from '../stores';

interface PreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'waveform' | 'timeline' | 'script' | 'overlay' | 'shortcuts';

export function PreferencesDialog({ isOpen, onClose }: PreferencesDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('waveform');
  const [editingShortcut, setEditingShortcut] = useState<keyof KeyboardShortcuts | null>(null);

  const {
    waveform,
    timeline,
    script,
    overlay,
    shortcuts,
    setWaveformSettings,
    setTimelineSettings,
    setScriptSettings,
    setOverlaySettings,
    setShortcut,
    resetToDefaults,
  } = useSettingsStore();

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent, key: keyof KeyboardShortcuts) => {
    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    // 실제 키 추가 (수정자 키 제외)
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      if (e.key === ' ') {
        parts.push('Space');
      } else if (e.key.length === 1) {
        parts.push(e.key.toUpperCase());
      } else {
        parts.push(e.key);
      }
    }

    if (parts.length > 0) {
      setShortcut(key, parts.join('+'));
      setEditingShortcut(null);
    }
  };

  const formatShortcut = (shortcut: string) => {
    return shortcut
      .replace('ArrowLeft', '←')
      .replace('ArrowRight', '→')
      .replace('ArrowUp', '↑')
      .replace('ArrowDown', '↓')
      .replace('Space', '스페이스')
      .replace('Ctrl', '⌃')
      .replace('Shift', '⇧')
      .replace('Alt', '⌥');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-dark-bg border border-dark-border rounded-lg w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
          <h2 className="text-sm font-medium text-white">환경설정</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-dark-border">
          <button
            onClick={() => setActiveTab('waveform')}
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
              activeTab === 'waveform'
                ? 'text-accent-yellow border-b-2 border-accent-yellow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <AudioWaveform className="w-4 h-4" />
            웨이브폼
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
              activeTab === 'timeline'
                ? 'text-accent-yellow border-b-2 border-accent-yellow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutPanelTop className="w-4 h-4" />
            타임라인
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
              activeTab === 'script'
                ? 'text-accent-yellow border-b-2 border-accent-yellow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
            스크립트
          </button>
          <button
            onClick={() => setActiveTab('overlay')}
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
              activeTab === 'overlay'
                ? 'text-accent-yellow border-b-2 border-accent-yellow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Subtitles className="w-4 h-4" />
            오버레이
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
              activeTab === 'shortcuts'
                ? 'text-accent-yellow border-b-2 border-accent-yellow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            키보드 단축키
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 웨이브폼 설정 */}
          {activeTab === 'waveform' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  샘플 수 (디테일) - 현재: {waveform.samples}
                </label>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="500"
                  value={waveform.samples}
                  onChange={(e) => setWaveformSettings({ samples: Number(e.target.value) })}
                  className="w-full accent-accent-yellow"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>500 (빠름)</span>
                  <span>5000 (상세)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  분석 속도 - 현재: {waveform.analysisSpeed}x
                </label>
                <input
                  type="range"
                  min="8"
                  max="16"
                  step="2"
                  value={waveform.analysisSpeed}
                  onChange={(e) => setWaveformSettings({ analysisSpeed: Number(e.target.value) })}
                  className="w-full accent-accent-yellow"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>8x (정확)</span>
                  <span>16x (빠름)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setWaveformSettings(DEFAULT_WAVEFORM)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  기본값으로 복원
                </button>
              </div>
            </div>
          )}

          {/* 타임라인 설정 */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  AD 트랙 높이 - {Math.round(timeline.adTrackHeightRatio * 100)}%
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="0.5"
                  step="0.05"
                  value={timeline.adTrackHeightRatio}
                  onChange={(e) =>
                    setTimelineSettings({ adTrackHeightRatio: Number(e.target.value) })
                  }
                  className="w-full accent-accent-yellow"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  CC 트랙 높이 - {Math.round(timeline.ccTrackHeightRatio * 100)}%
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="0.5"
                  step="0.05"
                  value={timeline.ccTrackHeightRatio}
                  onChange={(e) =>
                    setTimelineSettings({ ccTrackHeightRatio: Number(e.target.value) })
                  }
                  className="w-full accent-accent-yellow"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  오디오 트랙 높이 - {Math.round(timeline.audioTrackHeightRatio * 100)}%
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="0.5"
                  step="0.05"
                  value={timeline.audioTrackHeightRatio}
                  onChange={(e) =>
                    setTimelineSettings({ audioTrackHeightRatio: Number(e.target.value) })
                  }
                  className="w-full accent-accent-yellow"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setTimelineSettings(DEFAULT_TIMELINE)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  기본값으로 복원
                </button>
              </div>
            </div>
          )}

          {/* 스크립트 설정 */}
          {activeTab === 'script' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  스크립트 글꼴 크기 - {script.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  step="1"
                  value={script.fontSize}
                  onChange={(e) => setScriptSettings({ fontSize: Number(e.target.value) })}
                  className="w-full accent-accent-yellow"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>12px (작게)</span>
                  <span>24px (크게)</span>
                </div>
              </div>

              {/* 미리보기 */}
              <div className="mt-4 p-3 bg-dark-surface rounded border border-dark-border">
                <p className="text-gray-400 text-xs mb-2">미리보기</p>
                <p className="text-gray-200" style={{ fontSize: `${script.fontSize}px` }}>
                  화면해설: 넓은 바다를 배경으로 주인공이 서 있다.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setScriptSettings(DEFAULT_SCRIPT)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  기본값으로 복원
                </button>
              </div>
            </div>
          )}

          {/* 오버레이 설정 */}
          {activeTab === 'overlay' && (
            <div className="space-y-6">
              {/* AD 오버레이 설정 */}
              <div>
                <h3 className="text-xs text-gray-300 font-medium mb-3">AD 오버레이 (화면해설)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">
                      글꼴 크기 - {overlay.adFontSize}px
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="32"
                      step="1"
                      value={overlay.adFontSize}
                      onChange={(e) => setOverlaySettings({ adFontSize: Number(e.target.value) })}
                      className="w-full accent-accent-yellow"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>12px</span>
                      <span>32px</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">위치</label>
                    <div className="flex gap-2">
                      {(['top', 'center', 'bottom'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setOverlaySettings({ adPosition: pos })}
                          className={`px-3 py-1.5 text-xs rounded transition-colors ${
                            overlay.adPosition === pos
                              ? 'bg-accent-yellow text-dark-bg'
                              : 'bg-dark-surface text-gray-400 hover:text-white'
                          }`}
                        >
                          {pos === 'top' ? '상단' : pos === 'center' ? '중앙' : '하단'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* CC 오버레이 설정 */}
              <div>
                <h3 className="text-xs text-gray-300 font-medium mb-3">CC 오버레이 (자막)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">
                      글꼴 크기 - {overlay.ccFontSize}px
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="32"
                      step="1"
                      value={overlay.ccFontSize}
                      onChange={(e) => setOverlaySettings({ ccFontSize: Number(e.target.value) })}
                      className="w-full accent-accent-yellow"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>12px</span>
                      <span>32px</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">위치</label>
                    <div className="flex gap-2">
                      {(['top', 'center', 'bottom'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setOverlaySettings({ ccPosition: pos })}
                          className={`px-3 py-1.5 text-xs rounded transition-colors ${
                            overlay.ccPosition === pos
                              ? 'bg-accent-yellow text-dark-bg'
                              : 'bg-dark-surface text-gray-400 hover:text-white'
                          }`}
                        >
                          {pos === 'top' ? '상단' : pos === 'center' ? '중앙' : '하단'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 미리보기 */}
              <div className="mt-4 p-4 bg-black rounded-lg relative" style={{ height: '120px' }}>
                <p className="text-gray-600 text-xs absolute top-2 left-2">미리보기</p>
                {/* AD 미리보기 */}
                <div
                  className={`absolute inset-x-4 flex justify-center ${
                    overlay.adPosition === 'top'
                      ? 'top-8'
                      : overlay.adPosition === 'center'
                        ? 'top-1/2 -translate-y-1/2'
                        : 'bottom-8'
                  }`}
                >
                  <div className="px-3 py-1 bg-brand-brown/80 rounded">
                    <p
                      className="text-white text-center font-medium"
                      style={{ fontSize: `${Math.min(overlay.adFontSize, 18)}px` }}
                    >
                      화면해설 텍스트
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setOverlaySettings(DEFAULT_OVERLAY)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  기본값으로 복원
                </button>
              </div>
            </div>
          )}

          {/* 키보드 단축키 설정 */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-2">
              {(Object.keys(SHORTCUT_LABELS) as Array<keyof KeyboardShortcuts>).map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2 border-b border-dark-border"
                >
                  <span className="text-xs text-gray-300">{SHORTCUT_LABELS[key]}</span>
                  <button
                    onClick={() => setEditingShortcut(key)}
                    onKeyDown={(e) => editingShortcut === key && handleKeyDown(e, key)}
                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                      editingShortcut === key
                        ? 'border-accent-yellow bg-accent-yellow/20 text-accent-yellow'
                        : 'border-dark-border bg-dark-surface text-gray-400 hover:text-white'
                    }`}
                  >
                    {editingShortcut === key ? '키 입력...' : formatShortcut(shortcuts[key])}
                  </button>
                </div>
              ))}

              <div className="pt-4">
                <button
                  onClick={() => {
                    Object.keys(DEFAULT_SHORTCUTS).forEach((key) => {
                      setShortcut(
                        key as keyof KeyboardShortcuts,
                        DEFAULT_SHORTCUTS[key as keyof KeyboardShortcuts]
                      );
                    });
                  }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  모든 단축키 기본값으로 복원
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-dark-border">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            모든 설정 초기화
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-accent-yellow text-dark-bg rounded hover:bg-accent-yellow/90 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
