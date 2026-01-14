import { useState, useEffect, useRef } from 'react';
import {
  Pencil,
  Trash2,
  Clock,
  CheckSquare,
  Square,
  History,
  RotateCcw,
  StickyNote,
  Mic,
  Play,
  StopCircle,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import type { AudioDescription } from '../../../shared/types';
import { useADStore, useVideoStore, useMemoStore, useUIStore, useProjectStore } from '../../stores';
import { AD_TYPE_OPTIONS } from '../../../shared/constants';
import { MemoDialog } from '../MemoDialog';

interface ADCardProps {
  description: AudioDescription;
}

export function ADCard({ description }: ADCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timecodeContainerRef = useRef<HTMLDivElement>(null);
  const versionDropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [editText, setEditText] = useState(description.text);
  const [editTcIn, setEditTcIn] = useState('');
  const [editTcOut, setEditTcOut] = useState('');
  const [isEditingTimecode, setIsEditingTimecode] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showMemoDialog, setShowMemoDialog] = useState(false);
  const [showMemos, setShowMemos] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // 버전 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    if (!showVersions) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (versionDropdownRef.current && !versionDropdownRef.current.contains(e.target as Node)) {
        setShowVersions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVersions]);

  const {
    selectedIds,
    editingId,
    selectDescription,
    updateDescription,
    deleteDescription,
    setEditingId,
  } = useADStore();
  const { fps, seekToFrame } = useVideoStore();
  const { memos, getMemosForCard } = useMemoStore();
  const { setActiveTab } = useUIStore();
  const { filePath: projectPath } = useProjectStore();

  const cardMemos = getMemosForCard(description.id, 'ad');
  const memoCount = cardMemos.length;
  const isSelected = selectedIds.includes(description.id);
  const isEditing = editingId === description.id;
  const hasRecording = !!description.audioFile;

  // 편집 모드 진입 시 textarea에 포커스
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // 텍스트 동기화
  useEffect(() => {
    setEditText(description.text);
  }, [description.text]);

  const formatTimecode = (frame: number) => {
    const totalSeconds = frame / fps;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const frames = Math.floor(frame % fps);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames
      .toString()
      .padStart(2, '0')}`;
  };

  const parseTimecode = (tc: string): number | null => {
    const parts = tc.split(':').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return null;
    const [hours, minutes, seconds, frames] = parts;
    return Math.floor((hours * 3600 + minutes * 60 + seconds) * fps + frames);
  };

  const getDuration = () => {
    const durationFrames = description.tcOut - description.tcIn;
    const durationSeconds = durationFrames / fps;
    return durationSeconds.toFixed(1);
  };

  const typeLabel = AD_TYPE_OPTIONS.find((opt) => opt.value === description.type)?.label ?? '기타';

  const handleClick = (e: React.MouseEvent) => {
    selectDescription(description.id, e.ctrlKey || e.metaKey);
    seekToFrame(description.tcIn);
  };

  const handleDoubleClick = () => {
    setEditingId(description.id);
  };

  const handleSave = () => {
    updateDescription(description.id, { text: editText });
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(description.text);
      setEditingId(null);
    }
  };

  const handleTimecodeEdit = () => {
    setEditTcIn(formatTimecode(description.tcIn));
    setEditTcOut(formatTimecode(description.tcOut));
    setIsEditingTimecode(true);
  };

  const handleTimecodesSave = () => {
    const newTcIn = parseTimecode(editTcIn);
    const newTcOut = parseTimecode(editTcOut);

    if (newTcIn !== null && newTcOut !== null && newTcIn < newTcOut) {
      updateDescription(description.id, { tcIn: newTcIn, tcOut: newTcOut });
    }
    setIsEditingTimecode(false);
  };

  const handleTimecodeBlur = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (timecodeContainerRef.current?.contains(relatedTarget)) {
      return;
    }
    handleTimecodesSave();
  };

  const handleTimecodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTimecodesSave();
    } else if (e.key === 'Escape') {
      setIsEditingTimecode(false);
    }
  };

  // 버전 저장
  const handleSaveVersion = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!description.text.trim()) return;

    const newVersion = {
      text: description.text,
      savedAt: new Date().toISOString(),
    };

    const versions = description.versions || [];
    updateDescription(description.id, {
      versions: [...versions, newVersion],
    });
  };

  // 버전 복원
  const handleRestoreVersion = (e: React.MouseEvent, versionText: string) => {
    e.stopPropagation();
    updateDescription(description.id, { text: versionText });
    setEditText(versionText);
    setShowVersions(false);
  };

  const handleToggleReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateDescription(description.id, { needsReview: !description.needsReview });
  };

  // 녹음 버튼 클릭
  const handleRecordClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isRecording) {
      // 녹음 중지
      stopRecording();
    } else if (hasRecording) {
      // 기존 녹음이 있으면 확인 다이얼로그
      setShowConfirmDialog(true);
    } else {
      // 새 녹음 시작
      startRecording();
    }
  };

  // 녹음 시작
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Web Audio API를 사용하여 원시 PCM 데이터 캡처
      const audioContext = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Float32Array 복사
        audioChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (error) {
      console.error('마이크 접근 실패:', error);
    }
  };

  // 녹음 중지
  const stopRecording = async () => {
    if (!audioContextRef.current) return;

    const sampleRate = audioContextRef.current.sampleRate;

    // 프로세서 연결 해제
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // AudioContext 닫기
    await audioContextRef.current.close();
    audioContextRef.current = null;

    // 미디어 스트림 정리
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // 모든 청크를 하나의 배열로 합치기
    const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedData = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      combinedData.set(chunk, offset);
      offset += chunk.length;
    }

    try {
      const filePath = await window.api.saveRecording(
        description.id,
        Array.from(combinedData),
        projectPath || undefined,
        sampleRate
      );
      if (filePath) {
        updateDescription(description.id, { audioFile: filePath });
      }
    } catch (error) {
      console.error('녹음 파일 저장 실패:', error);
    }

    setIsRecording(false);
  };

  // 재녹음 확인
  const handleConfirmRerecord = () => {
    setShowConfirmDialog(false);
    updateDescription(description.id, { audioFile: undefined });
    startRecording();
  };

  // 녹음 재생
  const handlePlayRecording = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!description.audioFile) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      const audioUrl = window.api.utils.getFileUrl(description.audioFile);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        console.error('오디오 재생 실패');
        setIsPlaying(false);
      };

      audio.play();
      setIsPlaying(true);
    }
  };

  const handleOpenMemo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMemoDialog(true);
  };

  // 메모 클릭 시 메모 탭으로 이동
  const handleMemoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTab('memo');
  };

  return (
    <>
      <MemoDialog
        isOpen={showMemoDialog}
        onClose={() => setShowMemoDialog(false)}
        cardId={description.id}
        cardType="ad"
      />

      {/* 재녹음 확인 다이얼로그 */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirmDialog(false);
          }}
        >
          <div
            className="bg-dark-bg border border-dark-border rounded-lg p-4 max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-white mb-4">
              기존 녹음 파일을 삭제하고 다시 녹음하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
              >
                취소
              </button>
              <button
                onClick={handleConfirmRerecord}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
              >
                삭제하고 다시 녹음
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`p-3 rounded-lg border transition-colors cursor-pointer ${
          isSelected
            ? 'bg-brand-brown/20 border-brand-brown'
            : description.needsReview
            ? 'bg-dark-surface border-accent-yellow/50'
            : 'bg-dark-surface border-dark-border hover:border-gray-500'
        }`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* 재생/녹음 버튼 */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={handlePlayRecording}
                disabled={!hasRecording}
                className={`p-1 rounded transition-colors ${
                  isPlaying
                    ? 'text-accent-green bg-accent-green/20'
                    : hasRecording
                    ? 'text-accent-green hover:bg-accent-green/20'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
                title={hasRecording ? (isPlaying ? '정지' : '녹음 재생') : '녹음 없음'}
              >
                <Play className="w-4 h-4" />
              </button>
              <button
                onClick={handleRecordClick}
                className={`p-1 rounded transition-colors ${
                  isRecording
                    ? 'text-red-500 bg-red-500/20 animate-pulse'
                    : 'text-gray-400 hover:text-white hover:bg-dark-bg'
                }`}
                title={isRecording ? '녹음 중지' : hasRecording ? '다시 녹음' : '녹음 시작'}
              >
                {isRecording ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {/* 검토 체크박스 */}
            <button
              onClick={handleToggleReview}
              className={`transition-colors ${
                description.needsReview ? 'text-accent-yellow' : 'text-gray-600 hover:text-gray-400'
              }`}
              title={description.needsReview ? '검토 완료로 표시' : '검토 필요로 표시'}
            >
              {description.needsReview ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>

            {isEditingTimecode ? (
              <div
                ref={timecodeContainerRef}
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={editTcIn}
                  onChange={(e) => setEditTcIn(e.target.value)}
                  onKeyDown={handleTimecodeKeyDown}
                  onBlur={handleTimecodeBlur}
                  className="w-24 font-timecode text-xs bg-dark-bg border border-brand-brown rounded px-1 py-0.5 text-white focus:outline-none"
                  autoFocus
                />
                <span className="text-gray-600">→</span>
                <input
                  type="text"
                  value={editTcOut}
                  onChange={(e) => setEditTcOut(e.target.value)}
                  onKeyDown={handleTimecodeKeyDown}
                  onBlur={handleTimecodeBlur}
                  className="w-24 font-timecode text-xs bg-dark-bg border border-brand-brown rounded px-1 py-0.5 text-white focus:outline-none"
                />
              </div>
            ) : (
              <div
                className="flex items-center gap-2 hover:bg-dark-bg/50 rounded px-1 -mx-1 cursor-text"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTimecodeEdit();
                }}
              >
                <span className="font-timecode text-xs text-gray-400">
                  {formatTimecode(description.tcIn)}
                </span>
                <span className="text-gray-600">→</span>
                <span className="font-timecode text-xs text-gray-400">
                  {formatTimecode(description.tcOut)}
                </span>
              </div>
            )}
          </div>
          <span className="text-xs px-2 py-0.5 bg-brand-brown/30 rounded text-brand-brown">
            {typeLabel}
          </span>
        </div>

        {/* 내용 */}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-dark-bg border border-dark-border rounded p-2 text-sm text-white resize-none focus:border-brand-brown focus:outline-none"
            rows={3}
            placeholder="해설 텍스트를 입력하세요... (Shift+Enter로 줄바꿈)"
          />
        ) : (
          <p className="text-sm text-gray-200 mb-2 whitespace-pre-wrap">
            {description.text || (
              <span className="text-gray-500 italic">해설 텍스트를 입력하세요</span>
            )}
          </p>
        )}

        {/* 녹음 파일 정보 */}
        {hasRecording && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-accent-green/10 rounded text-xs text-accent-green">
            <Mic className="w-3 h-3" />
            <span>가이드 녹음 있음</span>
          </div>
        )}

        {/* 메모 섹션 */}
        {memoCount > 0 && (
          <div className="mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMemos(!showMemos);
              }}
              className="flex items-center gap-1 text-xs text-accent-yellow hover:text-accent-yellow/80"
            >
              {showMemos ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <StickyNote className="w-3 h-3" />
              <span>메모 ({memoCount})</span>
            </button>
            {showMemos && (
              <div className="mt-1 pl-4 space-y-1">
                {cardMemos.slice(0, 3).map((memo) => (
                  <div
                    key={memo.id}
                    onClick={handleMemoClick}
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-white cursor-pointer"
                  >
                    {memo.completed ? (
                      <Check className="w-3 h-3 text-accent-green" />
                    ) : (
                      <div className="w-3 h-3 border border-gray-500 rounded-sm" />
                    )}
                    <span className={memo.completed ? 'line-through text-gray-600' : ''}>
                      {memo.title}
                    </span>
                  </div>
                ))}
                {memoCount > 3 && (
                  <button
                    onClick={handleMemoClick}
                    className="text-xs text-gray-500 hover:text-accent-yellow"
                  >
                    +{memoCount - 3}개 더 보기
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 푸터 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getDuration()}초
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${
                description.status === 'approved'
                  ? 'bg-green-900/50 text-green-400'
                  : description.status === 'review'
                  ? 'bg-yellow-900/50 text-yellow-400'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {description.status === 'approved'
                ? '승인됨'
                : description.status === 'review'
                ? '검토 중'
                : '초안'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* 메모 추가 버튼 */}
            <button
              onClick={handleOpenMemo}
              className={`p-1.5 transition-colors relative ${
                memoCount > 0
                  ? 'text-accent-yellow hover:text-accent-yellow/80'
                  : 'text-gray-500 hover:text-white'
              }`}
              title="메모 추가"
            >
              <StickyNote className="w-4 h-4" />
            </button>
            <div className="relative" ref={versionDropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVersions(!showVersions);
                }}
                className={`p-1.5 transition-colors ${
                  description.versions?.length
                    ? 'text-accent-yellow hover:text-accent-yellow/80'
                    : 'text-gray-500 hover:text-white'
                }`}
                title={`버전 기록 ${description.versions?.length ? `(${description.versions.length})` : ''}`}
              >
                <History className="w-4 h-4" />
              </button>
              {showVersions && (
                <div
                  className="absolute bottom-full right-0 mb-1 w-64 bg-dark-bg border border-dark-border rounded-lg shadow-xl z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2 border-b border-dark-border flex items-center justify-between">
                    <span className="text-xs text-gray-400">버전 기록</span>
                    <button
                      onClick={handleSaveVersion}
                      className="text-xs px-2 py-0.5 bg-brand-brown hover:bg-brand-brown/80 text-white rounded transition-colors"
                      disabled={!description.text.trim()}
                    >
                      현재 버전 저장
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {description.versions?.length ? (
                      description.versions.map((version, index) => (
                        <div
                          key={index}
                          className="p-2 hover:bg-dark-surface border-b border-dark-border/50 last:border-0"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">
                              {new Date(version.savedAt).toLocaleString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <button
                              onClick={(e) => handleRestoreVersion(e, version.text)}
                              className="text-xs text-accent-yellow hover:text-white flex items-center gap-0.5"
                            >
                              <RotateCcw className="w-3 h-3" />
                              복원
                            </button>
                          </div>
                          <p className="text-xs text-gray-300 line-clamp-2">{version.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-xs text-gray-500 text-center">
                        저장된 버전이 없습니다
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(description.id);
              }}
              className="p-1.5 text-gray-500 hover:text-white transition-colors"
              title="편집"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteDescription(description.id);
              }}
              className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
