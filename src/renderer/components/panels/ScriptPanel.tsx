import { Plus } from 'lucide-react';
import { useUIStore, useADStore, useCCStore, useVideoStore, useProjectStore } from '../../stores';
import { ADCard } from './ADCard';
import { CCCard } from './CCCard';

export function ScriptPanel() {
  const { activeTab, setActiveTab } = useUIStore();
  const { project } = useProjectStore();
  const { descriptions, addDescription } = useADStore();
  const { captions, addCaption } = useCCStore();
  const { currentFrame } = useVideoStore();

  const handleAddAD = () => {
    addDescription({
      tcIn: currentFrame,
      tcOut: currentFrame + 72, // 기본 3초 (24fps 기준)
      text: '',
      type: 'scene',
    });
  };

  const handleAddCC = () => {
    addCaption({
      tcIn: currentFrame,
      tcOut: currentFrame + 72, // 기본 3초
      text: '',
      type: 'dialogue',
    });
  };

  if (!project) {
    return (
      <div className="h-full flex flex-col bg-dark-bg items-center justify-center">
        <p className="text-gray-500 text-sm">프로젝트를 생성하거나 열어주세요</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      {/* 탭 헤더 */}
      <div className="flex items-center border-b border-dark-border bg-dark-surface">
        <button
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === 'ad'
              ? 'text-primary-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('ad')}
        >
          AD ({descriptions.length})
          {activeTab === 'ad' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
          )}
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === 'cc'
              ? 'text-primary-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('cc')}
        >
          CC ({captions.length})
          {activeTab === 'cc' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400" />
          )}
        </button>

        <div className="flex-1" />

        <button
          onClick={activeTab === 'ad' ? handleAddAD : handleAddCC}
          className="flex items-center gap-1.5 px-3 py-1.5 mr-2 text-sm bg-primary-600 hover:bg-primary-500 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          추가
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'ad' ? (
          descriptions.length > 0 ? (
            descriptions.map((desc) => <ADCard key={desc.id} description={desc} />)
          ) : (
            <EmptyState type="ad" onAdd={handleAddAD} />
          )
        ) : captions.length > 0 ? (
          captions.map((caption) => <CCCard key={caption.id} caption={caption} />)
        ) : (
          <EmptyState type="cc" onAdd={handleAddCC} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ type, onAdd }: { type: 'ad' | 'cc'; onAdd: () => void }) {
  const isMac = window.api.platform === 'darwin';
  const modKey = isMac ? '⌘' : 'Ctrl';
  const shortcut = type === 'ad' ? `${modKey}+D` : `${modKey}+T`;
  const label = type === 'ad' ? '화면해설' : '자막';

  return (
    <div className="text-center py-12">
      <p className="text-gray-500 text-sm mb-2">{label} 항목이 없습니다.</p>
      <p className="text-gray-600 text-xs mb-4">{shortcut}로 새 항목을 추가하세요.</p>
      <button onClick={onAdd} className="btn-secondary text-sm">
        <Plus className="w-4 h-4 inline mr-1" />새 {label} 추가
      </button>
    </div>
  );
}
