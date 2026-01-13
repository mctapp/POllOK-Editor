import { useState } from 'react';
import { Pencil, Trash2, Volume2, Clock } from 'lucide-react';
import type { AudioDescription } from '../../../shared/types';
import { useADStore, useVideoStore } from '../../stores';
import { AD_TYPE_OPTIONS } from '../../../shared/constants';

interface ADCardProps {
  description: AudioDescription;
}

export function ADCard({ description }: ADCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(description.text);
  const { selectedIds, selectDescription, updateDescription, deleteDescription } = useADStore();
  const { fps, setCurrentFrame } = useVideoStore();

  const isSelected = selectedIds.includes(description.id);

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
    const durationFrames = description.tcOut - description.tcIn;
    const durationSeconds = durationFrames / fps;
    return durationSeconds.toFixed(1);
  };

  const typeLabel = AD_TYPE_OPTIONS.find((opt) => opt.value === description.type)?.label ?? '기타';

  const handleClick = (e: React.MouseEvent) => {
    selectDescription(description.id, e.ctrlKey || e.metaKey);
  };

  const handleDoubleClick = () => {
    setCurrentFrame(description.tcIn);
  };

  const handleSave = () => {
    updateDescription(description.id, { text: editText });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(description.text);
      setIsEditing(false);
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
            {formatTimecode(description.tcIn)}
          </span>
          <span className="text-gray-600">→</span>
          <span className="font-timecode text-xs text-gray-400">
            {formatTimecode(description.tcOut)}
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 bg-dark-bg rounded text-gray-400">
          {typeLabel}
        </span>
      </div>

      {/* 내용 */}
      {isEditing ? (
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="w-full bg-dark-bg border border-dark-border rounded p-2 text-sm text-white resize-none focus:border-primary-500 focus:outline-none"
          rows={3}
          autoFocus
        />
      ) : (
        <p className="text-sm text-gray-200 mb-3 line-clamp-3">
          {description.text || (
            <span className="text-gray-500 italic">해설 텍스트를 입력하세요</span>
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: TTS 미리듣기
            }}
            className="p-1.5 text-gray-500 hover:text-white transition-colors"
            title="TTS 미리듣기"
          >
            <Volume2 className="w-4 h-4" />
          </button>
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
  );
}
