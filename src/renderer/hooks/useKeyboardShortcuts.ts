import { useEffect, useCallback } from 'react';
import { useVideoStore, useADStore, useCCStore, useUIStore } from '../stores';

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
  const { zoomIn, zoomOut } = useUIStore();

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

        // 영상 탐색: 좌/우 = 1초, 상/하 = 5초
        case 'ArrowLeft':
          e.preventDefault();
          if (source) {
            const delta = e.shiftKey ? 1 : Math.round(fps); // 기본 1초, Shift면 1프레임
            seekToFrame(currentFrame - delta);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (source) {
            const delta = e.shiftKey ? 1 : Math.round(fps); // 기본 1초, Shift면 1프레임
            seekToFrame(currentFrame + delta);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (source) {
            const delta = Math.round(fps * 5); // 5초 앞으로
            seekToFrame(currentFrame + delta);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (source) {
            const delta = Math.round(fps * 5); // 5초 뒤로
            seekToFrame(currentFrame - delta);
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

        // 타임라인 줌
        case '+':
        case '=': // Shift 없이 + 키 누르면 = 이 들어옴
          e.preventDefault();
          zoomIn();
          break;

        case '-':
          e.preventDefault();
          zoomOut();
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
    [source, currentFrame, fps, togglePlay, setInPoint, setOutPoint, clearPoints, addDescription, addCaption, seekToFrame, zoomIn, zoomOut]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}
