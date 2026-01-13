import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Clock, User, CheckSquare, Square } from 'lucide-react';
import type { Caption } from '../../../shared/types';
import { useCCStore, useVideoStore } from '../../stores';
import { CC_TYPE_OPTIONS } from '../../../shared/constants';

interface CCCardProps {
  caption: Caption;
}

export function CCCard({ caption }: CCCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editText, setEditText] = useState(caption.text);
  const [editTcIn, setEditTcIn] = useState('');
  const [editTcOut, setEditTcOut] = useState('');
  const [isEditingTimecode, setIsEditingTimecode] = useState(false);

  const {
    selectedIds,
    editingId,
    selectCaption,
    updateCaption,
    deleteCaption,
    setEditingId,
    speakers,
  } = useCCStore();
  const { fps, seekToFrame } = useVideoStore();

  const isSelected = selectedIds.includes(caption.id);
  const isEditing = editingId === caption.id;
  const speaker = speakers.find((s) => s.id === caption.speakerId);

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

  const handleTimecodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTimecodesSave();
    } else if (e.key === 'Escape') {
      setIsEditingTimecode(false);
    }
  };

  const handleToggleReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateCaption(caption.id, { needsReview: !caption.needsReview });
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
    <div
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        isSelected
          ? 'bg-accent-green/20 border-accent-green'
          : caption.needsReview
          ? 'bg-dark-surface border-accent-yellow/50'
          : 'bg-dark-surface border-dark-border hover:border-gray-500'
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
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
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editTcIn}
                onChange={(e) => setEditTcIn(e.target.value)}
                onKeyDown={handleTimecodeKeyDown}
                onBlur={handleTimecodesSave}
                className="w-24 font-timecode text-xs bg-dark-bg border border-accent-green rounded px-1 py-0.5 text-white focus:outline-none"
                autoFocus
              />
              <span className="text-gray-600">→</span>
              <input
                type="text"
                value={editTcOut}
                onChange={(e) => setEditTcOut(e.target.value)}
                onKeyDown={handleTimecodeKeyDown}
                onBlur={handleTimecodesSave}
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
        <span className="text-xs px-2 py-0.5 bg-accent-green/30 rounded text-accent-green">{typeLabel}</span>
      </div>

      {/* 화자 */}
      {speaker && (
        <div className="flex items-center gap-1.5 mb-2">
          <User className="w-3 h-3" style={{ color: speaker.color }} />
          <span className="text-xs font-medium" style={{ color: speaker.color }}>
            {speaker.name}
          </span>
        </div>
      )}

      {/* 내용 */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-dark-bg border border-dark-border rounded p-2 text-sm text-white resize-none focus:border-accent-green focus:outline-none"
          rows={2}
          placeholder="자막 텍스트를 입력하세요... (Shift+Enter로 줄바꿈)"
        />
      ) : (
        <p className="text-sm text-gray-200 mb-3 whitespace-pre-wrap">
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

      {/* 푸터 */}
      <div className="flex items-center justify-between">
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
  );
}
