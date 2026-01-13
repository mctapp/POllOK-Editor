import { useState } from 'react';
import { Pencil, Trash2, Clock, User } from 'lucide-react';
import type { Caption } from '../../../shared/types';
import { useCCStore, useVideoStore } from '../../stores';
import { CC_TYPE_OPTIONS } from '../../../shared/constants';

interface CCCardProps {
  caption: Caption;
}

export function CCCard({ caption }: CCCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(caption.text);
  const { selectedIds, selectCaption, updateCaption, deleteCaption, speakers } = useCCStore();
  const { fps, setCurrentFrame } = useVideoStore();

  const isSelected = selectedIds.includes(caption.id);
  const speaker = speakers.find((s) => s.id === caption.speakerId);

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

  const getDuration = () => {
    const durationFrames = caption.tcOut - caption.tcIn;
    const durationSeconds = durationFrames / fps;
    return durationSeconds.toFixed(1);
  };

  const typeLabel = CC_TYPE_OPTIONS.find((opt) => opt.value === caption.type)?.label ?? '대사';

  const handleClick = (e: React.MouseEvent) => {
    selectCaption(caption.id, e.ctrlKey || e.metaKey);
  };

  const handleDoubleClick = () => {
    setCurrentFrame(caption.tcIn);
  };

  const handleSave = () => {
    updateCaption(caption.id, { text: editText });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(caption.text);
      setIsEditing(false);
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
    <div
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        isSelected
          ? 'bg-primary-900/30 border-primary-500'
          : 'bg-dark-surface border-dark-border hover:border-gray-500'
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-timecode text-xs text-gray-400">
            {formatTimecode(caption.tcIn)}
          </span>
          <span className="text-gray-600">→</span>
          <span className="font-timecode text-xs text-gray-400">
            {formatTimecode(caption.tcOut)}
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 bg-dark-bg rounded text-gray-400">
          {typeLabel}
        </span>
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
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="w-full bg-dark-bg border border-dark-border rounded p-2 text-sm text-white resize-none focus:border-primary-500 focus:outline-none"
          rows={2}
          autoFocus
        />
      ) : (
        <p className="text-sm text-gray-200 mb-3">
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
              setIsEditing(true);
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
