import { useState, useEffect } from 'react';
import { FolderOpen, Clock, FilePlus, Pencil, ClipboardCheck } from 'lucide-react';
import { useProjectStore, getRecentProjects, type RecentProject } from '../stores/projectStore';
import { useUIStore } from '../stores';
import type { AppMode } from '../../shared/types';

export function StartScreen() {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const { openProject, createProject } = useProjectStore();
  const { appMode, setAppMode } = useUIStore();

  useEffect(() => {
    setRecentProjects(getRecentProjects());
  }, []);

  const mostRecent = recentProjects[0];

  const handleContinue = async () => {
    if (mostRecent) {
      try {
        await openProject(mostRecent.path);
      } catch (error) {
        console.error('프로젝트를 열 수 없습니다:', error);
        // 최근 프로젝트 목록에서 제거하고 새로 시작
        const updated = recentProjects.filter((p) => p.path !== mostRecent.path);
        localStorage.setItem('accesson_recent_projects', JSON.stringify(updated));
        setRecentProjects(updated);
      }
    }
  };

  const handleOpenProject = async () => {
    const path = await window.api.file.selectProject();
    if (path) {
      try {
        await openProject(path);
      } catch (error) {
        console.error('프로젝트를 열 수 없습니다:', error);
      }
    }
  };

  const handleNewProject = () => {
    createProject('새 프로젝트');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '오늘';
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-dark-bg">
      <div className="max-w-lg w-full mx-4">
        {/* 로고/타이틀 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">AccessON</h1>
          <p className="text-gray-400">AD/CC Script Editor</p>
        </div>

        {/* 최근 프로젝트가 있는 경우 */}
        {mostRecent ? (
          <div className="space-y-4">
            {/* 이어서 작업 */}
            <div className="bg-dark-surface border border-dark-border rounded-lg p-6">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Clock className="w-4 h-4" />
                <span>최근 프로젝트</span>
              </div>
              <h2 className="text-xl font-medium text-white mb-1">{mostRecent.title}</h2>
              <p className="text-sm text-gray-500 mb-4">{formatDate(mostRecent.lastOpened)}</p>
              <button
                onClick={handleContinue}
                className="w-full py-3 bg-brand-brown hover:bg-brand-brown/80 text-white rounded-lg font-medium transition-colors"
              >
                이어서 작업
              </button>
            </div>

            {/* 다른 프로젝트 열기 */}
            <div className="flex gap-3">
              <button
                onClick={handleOpenProject}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-dark-surface border border-dark-border hover:border-gray-500 text-gray-300 rounded-lg transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                다른 프로젝트 열기
              </button>
              <button
                onClick={handleNewProject}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-dark-surface border border-dark-border hover:border-gray-500 text-gray-300 rounded-lg transition-colors"
              >
                <FilePlus className="w-4 h-4" />
                새 프로젝트
              </button>
            </div>

            {/* 모드 선택 */}
            <div className="mt-4 p-4 bg-dark-surface border border-dark-border rounded-lg">
              <p className="text-xs text-gray-500 mb-3">작업 모드</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setAppMode('writer')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors ${
                    appMode === 'writer'
                      ? 'bg-brand-brown text-white'
                      : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white hover:border-gray-500'
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                  작가 모드
                </button>
                <button
                  onClick={() => setAppMode('reviewer')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors ${
                    appMode === 'reviewer'
                      ? 'bg-brand-brown text-white'
                      : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white hover:border-gray-500'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  감수자 모드
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                {appMode === 'writer' ? '스크립트를 작성합니다' : '스크립트에 피드백을 남깁니다'}
              </p>
            </div>
          </div>
        ) : (
          /* 최근 프로젝트가 없는 경우 */
          <div className="space-y-4">
            <button
              onClick={handleNewProject}
              className="w-full flex items-center justify-center gap-2 py-4 bg-brand-brown hover:bg-brand-brown/80 text-white rounded-lg font-medium transition-colors"
            >
              <FilePlus className="w-5 h-5" />
              새 프로젝트 시작
            </button>
            <button
              onClick={handleOpenProject}
              className="w-full flex items-center justify-center gap-2 py-4 bg-dark-surface border border-dark-border hover:border-gray-500 text-gray-300 rounded-lg transition-colors"
            >
              <FolderOpen className="w-5 h-5" />
              기존 프로젝트 열기
            </button>

            {/* 모드 선택 */}
            <div className="mt-4 p-4 bg-dark-surface border border-dark-border rounded-lg">
              <p className="text-xs text-gray-500 mb-3">작업 모드</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setAppMode('writer')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors ${
                    appMode === 'writer'
                      ? 'bg-brand-brown text-white'
                      : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white hover:border-gray-500'
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                  작가 모드
                </button>
                <button
                  onClick={() => setAppMode('reviewer')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors ${
                    appMode === 'reviewer'
                      ? 'bg-brand-brown text-white'
                      : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white hover:border-gray-500'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  감수자 모드
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                {appMode === 'writer' ? '스크립트를 작성합니다' : '스크립트에 피드백을 남깁니다'}
              </p>
            </div>
          </div>
        )}

        {/* 최근 프로젝트 목록 (있는 경우) */}
        {recentProjects.length > 1 && (
          <div className="mt-8">
            <h3 className="text-sm text-gray-500 mb-3">최근 프로젝트</h3>
            <div className="space-y-1">
              {recentProjects.slice(1, 5).map((project) => (
                <button
                  key={project.path}
                  onClick={async () => {
                    try {
                      await openProject(project.path);
                    } catch {
                      // 열 수 없으면 목록에서 제거
                      const updated = recentProjects.filter((p) => p.path !== project.path);
                      localStorage.setItem('accesson_recent_projects', JSON.stringify(updated));
                      setRecentProjects(updated);
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-dark-surface rounded-lg text-left transition-colors group"
                >
                  <span className="text-gray-300 group-hover:text-white truncate">
                    {project.title}
                  </span>
                  <span className="text-xs text-gray-600 group-hover:text-gray-400 flex-shrink-0 ml-2">
                    {formatDate(project.lastOpened)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
