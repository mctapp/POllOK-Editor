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
} from 'lucide-react';
import type { Caption } from '../../../shared/types';
import { useCCStore, useVideoStore, useMemoStore, useUIStore, useSettingsStore } from '../../stores';
import { CC_TYPE_OPTIONS } from '../../../shared/constants';
import { MemoDialog } from '../MemoDialog';

interface CCCardProps {
  caption: Caption;
}

export function CCCard({ caption }: CCCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timecodeContainerRef = useRef<HTMLDivElement>(null);
  const versionDropdownRef = useRef<HTMLDivElement>(null);
  const [editText, setEditText] = useState(caption.text);
  const [editTcIn, setEditTcIn] = useState('');
  const [editTcOut, setEditTcOut] = useState('');
  const [isEditingTimecode, setIsEditingTimecode] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showMemoDialog, setShowMemoDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { getMemosForCard } = useMemoStore();
  const { setActiveTab } = useUIStore();
  const cardMemos = getMemosForCard(caption.id, 'cc');
  const memoCount = cardMemos.length;

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
    selectCaption,
    updateCaption,
    deleteCaption,
    setEditingId,
  } = useCCStore();
  const { fps, seekToFrame } = useVideoStore();
  const { script } = useSettingsStore();

  const isSelected = selectedIds.includes(caption.id);
  const isEditing = editingId === caption.id;
  const isActive = isSelected || isEditing || isHovered;

  // 편집 모드 진입 시 textarea에 포커스
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // 텍스트 동기화
  useEffect(() => {
    setEditText(caption.text);
  }, [caption.text]);

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
    const durationFrames = caption.tcOut - caption.tcIn;
    const durationSeconds = durationFrames / fps;
    return durationSeconds.toFixed(1);
  };

  const typeLabel = CC_TYPE_OPTIONS.find((opt) => opt.value === caption.type)?.label ?? '대사';

  const handleClick = (e: React.MouseEvent) => {
    selectCaption(caption.id, e.ctrlKey || e.metaKey);
    seekToFrame(caption.tcIn);
  };

  const handleDoubleClick = () => {
    setEditingId(caption.id);
  };

  const handleSave = () => {
    updateCaption(caption.id, { text: editText });
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(caption.text);
      setEditingId(null);
    }
  };

  const handleTimecodeEdit = () => {
    setEditTcIn(formatTimecode(caption.tcIn));
    setEditTcOut(formatTimecode(caption.tcOut));
    setIsEditingTimecode(true);
  };

  const handleTimecodesSave = () => {
    const newTcIn = parseTimecode(editTcIn);
    const newTcOut = parseTimecode(editTcOut);

    if (newTcIn !== null && newTcOut !== null && newTcIn < newTcOut) {
      updateCaption(caption.id, { tcIn: newTcIn, tcOut: newTcOut });
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
    if (!caption.text.trim()) return;

    const newVersion = {
      text: caption.text,
      savedAt: new Date().toISOString(),
    };

    const versions = caption.versions || [];
    updateCaption(caption.id, {
      versions: [...versions, newVersion],
    });
  };

  // 버전 복원
  const handleRestoreVersion = (e: React.MouseEvent, versionText: string) => {
    e.stopPropagation();
    updateCaption(caption.id, { text: versionText });
    setEditText(versionText);
    setShowVersions(false);
  };

  const handleToggleReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateCaption(caption.id, { needsReview: !caption.needsReview });
  };

  // 메모 아이콘 클릭 - 메모탭으로 이동
  const handleMemoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (memoCount > 0) {
      setActiveTab('memo');
    } else {
      setShowMemoDialog(true);
    }
  };

  const getTypeIcon = () => {
    switch (caption.type) {
      case 'effect':
        return '🔊';
      case 'music':
        return '🎵';
      case 'narrator':
        return '🎙️';
      default:
        return null;
    }
  };

  return (
    <>
      <MemoDialog
        isOpen={showMemoDialog}
        onClose={() => setShowMemoDialog(false)}
        cardId={caption.id}
        cardType="cc"
      />
      <div
        className={`group p-3 rounded-lg border transition-colors cursor-pointer ${
          isSelected
            ? 'bg-accent-green/20 border-accent-green'
            : caption.needsReview
            ? 'bg-dark-surface border-accent-yellow/50'
            : 'bg-dark-surface border-dark-border hover:border-gray-500'
        }`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 헤더 - 활성 상태일 때만 표시 */}
        <div
          className={`flex items-center justify-between overflow-hidden transition-all duration-200 ease-in-out ${
            isActive ? 'opacity-100 max-h-12 mb-2' : 'opacity-0 max-h-0 mb-0'
          }`}
        >
          <div className="flex items-center gap-2">
            {/* 검토 체크박스 */}
            <button
              onClick={handleToggleReview}
              className={`transition-colors ${
                caption.needsReview ? 'text-accent-yellow' : 'text-gray-600 hover:text-gray-400'
              }`}
              title={caption.needsReview ? '검토 완료로 표시' : '검토 필요로 표시'}
            >
              {caption.needsReview ? (
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
                  className="w-24 font-timecode text-xs bg-dark-bg border border-accent-green rounded px-1 py-0.5 text-white focus:outline-none"
                  autoFocus
                />
                <span className="text-gray-600">→</span>
                <input
                  type="text"
                  value={editTcOut}
                  onChange={(e) => setEditTcOut(e.target.value)}
                  onKeyDown={handleTimecodeKeyDown}
                  onBlur={handleTimecodeBlur}
                  className="w-24 font-timecode text-xs bg-dark-bg border border-accent-green rounded px-1 py-0.5 text-white focus:outline-none"
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
                  {formatTimecode(caption.tcIn)}
                </span>
                <span className="text-gray-600">→</span>
                <span className="font-timecode text-xs text-gray-400">
                  {formatTimecode(caption.tcOut)}
                </span>
              </div>
            )}
          </div>
          <span className="text-xs px-2 py-0.5 bg-accent-green/30 rounded text-accent-green">
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
            className="w-full bg-dark-bg border border-dark-border rounded p-2 text-white resize-none focus:border-accent-green focus:outline-none"
            style={{ fontSize: `${script.fontSize}px` }}
            rows={2}
            placeholder="자막 텍스트를 입력하세요... (Shift+Enter로 줄바꿈)"
          />
        ) : (
          <p className="text-gray-200 whitespace-pre-wrap" style={{ fontSize: `${script.fontSize}px` }}>
            {getTypeIcon() && <span className="mr-1">{getTypeIcon()}</span>}
            {caption.type !== 'dialogue' && caption.text ? (
              <span className="text-gray-400">[{caption.text}]</span>
            ) : (
              caption.text || (
                <span className="text-gray-500 italic">자막 텍스트를 입력하세요</span>
              )
            )}
          </p>
        )}

        {/* 푸터 - 활성 상태일 때만 표시 */}
        <div
          className={`flex items-center justify-between overflow-hidden transition-all duration-200 ease-in-out ${
            isActive ? 'opacity-100 max-h-12 mt-2' : 'opacity-0 max-h-0 mt-0'
          }`}
        >
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getDuration()}초
            </span>
            <span className="px-1.5 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
              {caption.position === 'top' ? '상단' : caption.position === 'center' ? '중앙' : '하단'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* 메모 버튼 */}
            <button
              onClick={handleMemoClick}
              className={`p-1.5 transition-colors ${
                memoCount > 0
                  ? 'text-accent-yellow hover:text-accent-yellow/80'
                  : 'text-gray-500 hover:text-white'
              }`}
              title={memoCount > 0 ? `메모 ${memoCount}개` : '메모 추가'}
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
                  caption.versions?.length
                    ? 'text-accent-yellow hover:text-accent-yellow/80'
                    : 'text-gray-500 hover:text-white'
                }`}
                title={`버전 기록 ${caption.versions?.length ? `(${caption.versions.length})` : ''}`}
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
                      className="text-xs px-2 py-0.5 bg-accent-green hover:bg-accent-green/80 text-white rounded transition-colors"
                      disabled={!caption.text.trim()}
                    >
                      현재 버전 저장
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {caption.versions?.length ? (
                      caption.versions.map((version, index) => (
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
                setEditingId(caption.id);
              }}
              className="p-1.5 text-gray-500 hover:text-white transition-colors"
              title="편집"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteCaption(caption.id);
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
