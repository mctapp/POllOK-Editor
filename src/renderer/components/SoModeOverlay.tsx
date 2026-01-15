/**
 * SO (Sound Only) 모드 오버레이
 * 화면을 블랙아웃하고 녹음 기능을 제공합니다.
 *
 * 단축키:
 * - 스페이스바: 재생/일시정지
 * - Enter: 녹음 시작/종료
 * - ESC: SO 모드 종료
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Mic, MicOff, Volume2, EyeOff, X } from 'lucide-react';
import { useUIStore, useVideoStore, useMemoStore, useProjectStore } from '../stores';
import { formatTimecodeFromFrame } from '../lib/timecode';

export function SoModeOverlay() {
  const { soMode, soRecording, toggleSoMode, setSoRecording } = useUIStore();
  const { currentFrame, fps, isPlaying, togglePlay } = useVideoStore();
  const { addMemo, updateMemo } = useMemoStore();
  const { filePath: projectPath } = useProjectStore();

  const [_recordingStartFrame, setRecordingStartFrame] = useState<number | null>(null);
  const [_currentMemoId, setCurrentMemoId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 타임코드 포맷
  const formatTimecode = useCallback(
    (frame: number) => {
      if (!fps) return '00:00:00:00';
      return formatTimecodeFromFrame(frame, fps);
    },
    [fps]
  );

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 녹음 시작 시점의 타임코드 저장
      const startFrame = currentFrame;
      setRecordingStartFrame(startFrame);

      // 빈 메모 미리 생성
      const newMemoId = addMemo({
        title: `SO 메모 - ${formatTimecode(startFrame)}`,
        content: '',
        cardType: 'so',
        cardId: '',
        timecode: startFrame,
      });
      setCurrentMemoId(newMemoId);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioData = Array.from(new Uint8Array(arrayBuffer));

        try {
          // 녹음 파일 저장
          const cardId = `so-${startFrame}-${Date.now()}`;
          const filePath = await window.api.saveRecording(
            cardId,
            audioData,
            projectPath || undefined
          );

          // 메모에 오디오 파일 경로 추가
          if (filePath && newMemoId) {
            updateMemo(newMemoId, { audioFile: filePath });
          }
        } catch (error) {
          console.error('SO 녹음 파일 저장 실패:', error);
        }

        stream.getTracks().forEach((track) => track.stop());
        setSoRecording(false);
        setRecordingStartFrame(null);
        setCurrentMemoId(null);
      };

      mediaRecorder.start();
      setSoRecording(true);
    } catch (error) {
      console.error('마이크 접근 실패:', error);
    }
  }, [currentFrame, projectPath, addMemo, updateMemo, setSoRecording, formatTimecode]);

  // 녹음 종료
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    if (!soMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          // 스페이스바: 재생/일시정지
          e.preventDefault();
          togglePlay();
          break;
        case 'Enter':
          // Enter: 녹음 시작/종료
          e.preventDefault();
          if (soRecording) {
            stopRecording();
          } else {
            startRecording();
          }
          break;
        case 'Escape':
          // ESC: SO 모드 종료
          e.preventDefault();
          if (soRecording) {
            stopRecording();
          }
          toggleSoMode();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [soMode, soRecording, togglePlay, toggleSoMode, startRecording, stopRecording]);

  if (!soMode) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* 상단 정보 바 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white/80">
        <div className="flex items-center gap-4">
          <EyeOff className="w-5 h-5" />
          <span className="text-lg font-medium">SO 모드 (Sound Only)</span>
        </div>
        <button
          onClick={toggleSoMode}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 중앙 녹음 상태 */}
      <div className="flex flex-col items-center gap-8">
        {/* 현재 타임코드 */}
        <div className="text-6xl font-mono text-white/90 tracking-wider">
          {formatTimecode(currentFrame)}
        </div>

        {/* 녹음 버튼 */}
        <button
          onClick={soRecording ? stopRecording : startRecording}
          className={`p-8 rounded-full transition-all ${
            soRecording
              ? 'bg-red-600 animate-pulse shadow-lg shadow-red-500/50'
              : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          {soRecording ? (
            <MicOff className="w-16 h-16 text-white" />
          ) : (
            <Mic className="w-16 h-16 text-white/80" />
          )}
        </button>

        {/* 상태 텍스트 */}
        <div className="text-xl text-white/70">
          {soRecording ? (
            <span className="text-red-400">녹음 중... (Enter로 종료)</span>
          ) : (
            <span>Enter 키로 녹음 시작</span>
          )}
        </div>

        {/* 재생 상태 */}
        <div className="flex items-center gap-2 text-white/50">
          <Volume2 className="w-5 h-5" />
          <span>{isPlaying ? '재생 중' : '일시정지'}</span>
          <span className="text-white/30 ml-2">(Space로 전환)</span>
        </div>
      </div>

      {/* 하단 안내 */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-center text-white/40 text-sm">
        <div className="flex justify-center gap-8">
          <span>Space: 재생/일시정지</span>
          <span>Enter: 녹음</span>
          <span>ESC: SO 모드 종료</span>
        </div>
      </div>
    </div>
  );
}
