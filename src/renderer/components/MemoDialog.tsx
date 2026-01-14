import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useMemoStore } from '../stores';

interface MemoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  cardType: 'ad' | 'cc';
  memoId?: string; // 편집 시 전달
}

export function MemoDialog({ isOpen, onClose, cardId, cardType, memoId }: MemoDialogProps) {
  const { memos, addMemo, updateMemo } = useMemoStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  const existingMemo = memoId ? memos.find((m) => m.id === memoId) : null;

  useEffect(() => {
    if (isOpen) {
      if (existingMemo) {
        setTitle(existingMemo.title);
        setContent(existingMemo.content);
      } else {
        setTitle('');
        setContent('');
      }
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [isOpen, existingMemo]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;

    if (existingMemo) {
      updateMemo(existingMemo.id, { title, content });
    } else {
      addMemo({ title, content, cardId, cardType });
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-dark-bg border border-dark-border rounded-lg w-[400px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
          <h3 className="text-sm font-medium text-white">
            {existingMemo ? '메모 편집' : '새 메모'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">제목</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="메모 제목"
              className="w-full px-3 py-2 text-sm bg-dark-surface border border-dark-border rounded focus:border-accent-yellow focus:outline-none text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="메모 내용을 입력하세요..."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-dark-surface border border-dark-border rounded focus:border-accent-yellow focus:outline-none text-white resize-none"
            />
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-dark-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-4 py-1.5 text-sm bg-accent-yellow text-dark-bg rounded hover:bg-accent-yellow/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {existingMemo ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
