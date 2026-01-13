import { useEffect, useCallback } from 'react';
import { useVideoStore, useADStore, useCCStore } from '../stores';

interface KeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;

  const {
    source,
    currentFrame,
    duration,
    fps,
    togglePlay,
    setInPoint,
    setOutPoint,
    clearPoints,
  } = useVideoStore();

  const { addDescription } = useADStore();
  const { addCaption } = useCCStore();

  // 프레임 탐색 (비디오 요소 직접 제어는 VideoPanel에서 수행)
  const seekToFrame = useCallback(
    (frame: number) => {
      const video = document.querySelector('video');
      if (!video) return;
      const clampedFrame = Math.max(0, Math.min(duration, frame));
      video.currentTime = clampedFrame / fps;
    },
    [duration, fps]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 입력 필드에서는 단축키 무시
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      switch (e.key) {
        // 재생/일시정지
        case ' ':
          e.preventDefault();
          if (source) {
            togglePlay();
          }
          break;

        // 프레임 탐색 (1프레임)
        case 'ArrowLeft':
          e.preventDefault();
          if (source) {
            const delta = e.shiftKey ? Math.round(fps) : 1; // Shift면 1초
            seekToFrame(currentFrame - delta);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (source) {
            const delta = e.shiftKey ? Math.round(fps) : 1; // Shift면 1초
            seekToFrame(currentFrame + delta);
          }
          break;

        // In/Out 포인트
        case 'i':
        case 'I':
          if (!cmdOrCtrl && source) {
            e.preventDefault();
            setInPoint();
          }
          break;

        case 'o':
        case 'O':
          if (!cmdOrCtrl && source) {
            e.preventDefault();
            setOutPoint();
          }
          break;

        // In/Out 포인트 초기화
        case 'Escape':
          e.preventDefault();
          clearPoints();
          break;

        // 새 AD 추가 (Cmd/Ctrl + D)
        case 'd':
        case 'D':
          if (cmdOrCtrl && source) {
            e.preventDefault();
            addDescription({
              tcIn: currentFrame,
              tcOut: currentFrame + Math.round(fps * 3), // 기본 3초
              text: '',
              type: 'scene',
              voice: '',
            });
          }
          break;

        // 새 CC 추가 (Cmd/Ctrl + T)
        case 't':
        case 'T':
          if (cmdOrCtrl && source) {
            e.preventDefault();
            addCaption({
              tcIn: currentFrame,
              tcOut: currentFrame + Math.round(fps * 3), // 기본 3초
              text: '',
              speakerId: null,
              position: 'bottom',
              align: 'center',
              type: 'dialogue',
            });
          }
          break;

        // J/K/L 재생 컨트롤 (미래 확장용)
        case 'j':
        case 'J':
          // 역재생 또는 느린 재생 (추후 구현)
          break;

        case 'k':
        case 'K':
          // 정지 (추후 구현)
          break;

        case 'l':
        case 'L':
          // 빠른 재생 (추후 구현)
          break;

        default:
          break;
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
