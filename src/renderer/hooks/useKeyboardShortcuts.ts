import { useEffect, useCallback } from 'react';
import { useVideoStore, useADStore, useCCStore, useUIStore, useSettingsStore } from '../stores';

interface KeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;

  const {
    source,
    currentFrame,
    fps,
    togglePlay,
    setInPoint,
    setOutPoint,
    clearPoints,
    seekToFrame,
  } = useVideoStore();

  const { addDescription } = useADStore();
  const { addCaption } = useCCStore();
  const { zoomIn, zoomOut, setActiveTab, toggleFeedbackPanel, toggleSoMode, soMode } = useUIStore();
  const { shortcuts } = useSettingsStore();

  /**
   * 키 이벤트와 단축키 문자열 비교
   * 단축키 형식: "Ctrl+Shift+A", "Space", "ArrowLeft" 등
   */
  const matchesShortcut = useCallback((e: KeyboardEvent, shortcut: string): boolean => {
    const parts = shortcut.split('+');
    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1);

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    // 수정자 키 확인
    const requiresCtrl = modifiers.includes('Ctrl') || modifiers.includes('Cmd');
    const requiresShift = modifiers.includes('Shift');
    const requiresAlt = modifiers.includes('Alt');

    const hasCtrl = isMac ? e.metaKey : e.ctrlKey;
    const hasShift = e.shiftKey;
    const hasAlt = e.altKey;

    if (requiresCtrl !== hasCtrl) return false;
    if (requiresShift !== hasShift) return false;
    if (requiresAlt !== hasAlt) return false;

    // 키 비교 (대소문자 무시)
    const eventKey = e.key === ' ' ? 'Space' : e.key;
    return eventKey.toLowerCase() === key.toLowerCase() || eventKey === key;
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 입력 필드에서는 단축키 무시
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // 재생/일시정지 (SO 모드에서는 SO 모드 자체 핸들러가 처리)
      if (matchesShortcut(e, shortcuts.playPause)) {
        e.preventDefault();
        if (source && !soMode) togglePlay();
        return;
      }

      // 1초 뒤로
      if (matchesShortcut(e, shortcuts.seekBackward1s)) {
        e.preventDefault();
        if (source) seekToFrame(currentFrame - Math.round(fps));
        return;
      }

      // 1초 앞으로
      if (matchesShortcut(e, shortcuts.seekForward1s)) {
        e.preventDefault();
        if (source) seekToFrame(currentFrame + Math.round(fps));
        return;
      }

      // 5초 뒤로
      if (matchesShortcut(e, shortcuts.seekBackward5s)) {
        e.preventDefault();
        if (source) seekToFrame(currentFrame - Math.round(fps * 5));
        return;
      }

      // 5초 앞으로
      if (matchesShortcut(e, shortcuts.seekForward5s)) {
        e.preventDefault();
        if (source) seekToFrame(currentFrame + Math.round(fps * 5));
        return;
      }

      // 1프레임 뒤로
      if (matchesShortcut(e, shortcuts.seekBackward1Frame)) {
        e.preventDefault();
        if (source) seekToFrame(currentFrame - 1);
        return;
      }

      // 1프레임 앞으로
      if (matchesShortcut(e, shortcuts.seekForward1Frame)) {
        e.preventDefault();
        if (source) seekToFrame(currentFrame + 1);
        return;
      }

      // 타임라인 확대
      if (matchesShortcut(e, shortcuts.zoomIn)) {
        e.preventDefault();
        zoomIn();
        return;
      }

      // 타임라인 축소
      if (matchesShortcut(e, shortcuts.zoomOut)) {
        e.preventDefault();
        zoomOut();
        return;
      }

      // AD 카드 추가
      if (matchesShortcut(e, shortcuts.addADCard)) {
        e.preventDefault();
        if (source) {
          addDescription({
            tcIn: currentFrame,
            tcOut: currentFrame + Math.round(fps * 3),
            text: '',
            type: 'scene',
            voice: '',
          });
        }
        return;
      }

      // CC 카드 추가
      if (matchesShortcut(e, shortcuts.addCCCard)) {
        e.preventDefault();
        if (source) {
          addCaption({
            tcIn: currentFrame,
            tcOut: currentFrame + Math.round(fps * 3),
            text: '',
            speakerId: null,
            position: 'bottom',
            align: 'center',
            type: 'dialogue',
          });
        }
        return;
      }

      // In/Out 포인트 (고정 단축키)
      if (e.key.toLowerCase() === 'i' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (source) setInPoint();
        return;
      }

      if (e.key.toLowerCase() === 'o' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (source) setOutPoint();
        return;
      }

      // Escape - 포인트 초기화
      if (e.key === 'Escape') {
        e.preventDefault();
        clearPoints();
        return;
      }

      // SO 모드 토글
      if (matchesShortcut(e, shortcuts.toggleSoMode)) {
        e.preventDefault();
        toggleSoMode();
        return;
      }

      // 탭 전환 (Ctrl/Cmd + 1, 2, 3)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const hasModKey = isMac ? e.metaKey : e.ctrlKey;

      if (hasModKey && e.key === '1') {
        e.preventDefault();
        setActiveTab('ad');
        return;
      }

      if (hasModKey && e.key === '2') {
        e.preventDefault();
        setActiveTab('cc');
        return;
      }

      if (hasModKey && e.key === '3') {
        e.preventDefault();
        setActiveTab('memo');
        return;
      }

      // 피드백 패널 토글 (Ctrl/Cmd + 4)
      if (hasModKey && e.key === '4') {
        e.preventDefault();
        toggleFeedbackPanel();
        return;
      }
    },
    [
      source,
      currentFrame,
      fps,
      togglePlay,
      setInPoint,
      setOutPoint,
      clearPoints,
      addDescription,
      addCaption,
      seekToFrame,
      zoomIn,
      zoomOut,
      setActiveTab,
      toggleFeedbackPanel,
      toggleSoMode,
      soMode,
      shortcuts,
      matchesShortcut,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}
