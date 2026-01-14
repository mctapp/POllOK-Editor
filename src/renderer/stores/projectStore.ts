import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Project, ProjectSettings, VideoInfo, AudioDescription, Caption, Speaker, Memo, WaveformCache } from '../../shared/types';
import { DEFAULT_PROJECT_SETTINGS } from '../../shared/constants';
import { v4 as uuidv4 } from 'uuid';

// 프로젝트 파일에 저장되는 전체 데이터 구조
export interface ProjectFileData {
  project: Project;
  descriptions: AudioDescription[];
  captions: Caption[];
  speakers: Speaker[];
  memos: Memo[];
  waveformCache?: WaveformCache;
}

// 최근 프로젝트 정보
export interface RecentProject {
  path: string;
  title: string;
  lastOpened: string;
}

const RECENT_PROJECTS_KEY = 'accesson_recent_projects';
const MAX_RECENT_PROJECTS = 10;

// 최근 프로젝트 목록 관리
export function getRecentProjects(): RecentProject[] {
  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentProject(path: string, title: string): void {
  const recents = getRecentProjects().filter((p) => p.path !== path);
  recents.unshift({
    path,
    title,
    lastOpened: new Date().toISOString(),
  });
  localStorage.setItem(
    RECENT_PROJECTS_KEY,
    JSON.stringify(recents.slice(0, MAX_RECENT_PROJECTS))
  );
}

interface ProjectState {
  // 상태
  project: Project | null;
  filePath: string | null;
  isDirty: boolean;
  lastSaved: Date | null;
  waveformCache: WaveformCache | null;

  // 액션
  createProject: (title: string) => void;
  openProject: (path: string) => Promise<void>;
  saveProject: () => Promise<void>;
  saveProjectAs: () => Promise<void>;
  closeProject: () => void;
  setDirty: (dirty: boolean) => void;
  setVideo: (video: VideoInfo) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  setWaveformCache: (cache: WaveformCache | null) => void;
}

// 다른 스토어 가져오기 (순환 참조 방지를 위해 동적 import 사용)
const getOtherStores = async () => {
  const { useADStore } = await import('./adStore');
  const { useCCStore } = await import('./ccStore');
  const { useMemoStore } = await import('./memoStore');
  const { useVideoStore } = await import('./videoStore');
  return { useADStore, useCCStore, useMemoStore, useVideoStore };
};

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set, get) => ({
    project: null,
    filePath: null,
    isDirty: false,
    lastSaved: null,
    waveformCache: null,

    createProject: (title: string) => {
      const now = new Date().toISOString();
      const project: Project = {
        version: '1.0',
        id: uuidv4(),
        title,
        createdAt: now,
        modifiedAt: now,
        video: null,
        settings: { ...DEFAULT_PROJECT_SETTINGS },
      };

      set({
        project,
        filePath: null,
        isDirty: true,
        lastSaved: null,
      });
    },

    openProject: async (path: string) => {
      try {
        const fileData = await window.api.file.readProject<ProjectFileData>(path);

        // 프로젝트 데이터 설정
        set({
          project: fileData.project,
          filePath: path,
          isDirty: false,
          lastSaved: new Date(),
        });

        // 다른 스토어 데이터 복원
        const { useADStore, useCCStore, useMemoStore, useVideoStore } = await getOtherStores();

        if (fileData.descriptions) {
          useADStore.getState().setDescriptions(fileData.descriptions);
        }
        if (fileData.captions) {
          useCCStore.getState().setCaptions(fileData.captions);
        }
        if (fileData.speakers) {
          useCCStore.getState().setSpeakers(fileData.speakers);
        }
        if (fileData.memos) {
          useMemoStore.getState().setMemos(fileData.memos);
        }

        // 비디오 로드 (프로젝트에 비디오 정보가 있는 경우)
        if (fileData.project.video?.path) {
          const videoUrl = window.api.utils.getFileUrl(fileData.project.video.path);
          useVideoStore.getState().setSource(videoUrl);
          useVideoStore.getState().setFps(fileData.project.video.fps);
          useVideoStore.getState().setDuration(fileData.project.video.durationFrames);
          useVideoStore.getState().setResolution(
            fileData.project.video.width,
            fileData.project.video.height
          );
        }

        // 웨이브폼 캐시 로드
        if (fileData.waveformCache) {
          set({ waveformCache: fileData.waveformCache });
        }

        // 최근 프로젝트에 추가
        addRecentProject(path, fileData.project.title);
      } catch (error) {
        console.error('Failed to open project:', error);
        throw error;
      }
    },

    saveProject: async () => {
      const { project, filePath, waveformCache } = get();
      if (!project) return;

      // 다른 스토어에서 데이터 가져오기
      const { useADStore, useCCStore, useMemoStore } = await getOtherStores();
      const descriptions = useADStore.getState().descriptions;
      const captions = useCCStore.getState().captions;
      const speakers = useCCStore.getState().speakers;
      const memos = useMemoStore.getState().memos;

      const fileData: ProjectFileData = {
        project: { ...project, modifiedAt: new Date().toISOString() },
        descriptions,
        captions,
        speakers,
        memos,
        waveformCache: waveformCache ?? undefined,
      };

      const content = JSON.stringify(fileData, null, 2);
      const savedPath = await window.api.file.saveProject({
        path: filePath ?? undefined,
        content,
      });

      if (savedPath) {
        // 파일명에서 프로젝트 제목 추출 (첫 저장 시)
        let newTitle = project.title;
        if (!filePath) {
          const filename = savedPath.split('/').pop() || savedPath.split('\\').pop() || '';
          newTitle = filename.replace(/\.afproj$/i, '') || project.title;
        }

        const updatedProject = {
          ...project,
          title: newTitle,
          modifiedAt: new Date().toISOString(),
        };

        // 제목이 변경된 경우 다시 저장
        if (newTitle !== project.title) {
          const updatedFileData: ProjectFileData = {
            ...fileData,
            project: updatedProject,
          };
          const updatedContent = JSON.stringify(updatedFileData, null, 2);
          await window.api.file.saveProject({
            path: savedPath,
            content: updatedContent,
          });
        }

        set({
          project: updatedProject,
          filePath: savedPath,
          isDirty: false,
          lastSaved: new Date(),
        });

        // 최근 프로젝트에 추가
        addRecentProject(savedPath, updatedProject.title);
      }
    },

    saveProjectAs: async () => {
      const { project, waveformCache } = get();
      if (!project) return;

      // 다른 스토어에서 데이터 가져오기
      const { useADStore, useCCStore, useMemoStore } = await getOtherStores();
      const descriptions = useADStore.getState().descriptions;
      const captions = useCCStore.getState().captions;
      const speakers = useCCStore.getState().speakers;
      const memos = useMemoStore.getState().memos;

      const fileData: ProjectFileData = {
        project,
        descriptions,
        captions,
        speakers,
        memos,
        waveformCache: waveformCache ?? undefined,
      };

      const content = JSON.stringify(fileData, null, 2);
      const savedPath = await window.api.file.saveProject({ content });

      if (savedPath) {
        const filename = savedPath.split('/').pop() || savedPath.split('\\').pop() || '';
        const newTitle = filename.replace(/\.afproj$/i, '') || project.title;

        const updatedProject = {
          ...project,
          title: newTitle,
          modifiedAt: new Date().toISOString(),
        };

        const updatedFileData: ProjectFileData = {
          ...fileData,
          project: updatedProject,
        };
        const updatedContent = JSON.stringify(updatedFileData, null, 2);
        await window.api.file.saveProject({
          path: savedPath,
          content: updatedContent,
        });

        set({
          project: updatedProject,
          filePath: savedPath,
          isDirty: false,
          lastSaved: new Date(),
        });

        // 최근 프로젝트에 추가
        addRecentProject(savedPath, updatedProject.title);
      }
    },

    closeProject: async () => {
      // 다른 스토어 초기화
      const { useADStore, useCCStore, useMemoStore, useVideoStore } = await getOtherStores();
      useADStore.getState().reset();
      useCCStore.getState().reset();
      useMemoStore.getState().reset();
      useVideoStore.getState().reset();

      set({
        project: null,
        filePath: null,
        isDirty: false,
        lastSaved: null,
        waveformCache: null,
      });
    },

    setDirty: (dirty: boolean) => {
      set({ isDirty: dirty });
    },

    setVideo: (video: VideoInfo) => {
      const { project } = get();
      if (!project) return;

      set({
        project: { ...project, video },
        isDirty: true,
      });
    },

    updateSettings: (settings: Partial<ProjectSettings>) => {
      const { project } = get();
      if (!project) return;

      set({
        project: {
          ...project,
          settings: { ...project.settings, ...settings },
        },
        isDirty: true,
      });
    },

    setWaveformCache: (cache: WaveformCache | null) => {
      set({ waveformCache: cache });
    },
  }))
);
