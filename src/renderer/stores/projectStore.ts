import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Project, ProjectSettings, VideoInfo } from '../../shared/types';
import { DEFAULT_PROJECT_SETTINGS } from '../../shared/constants';
import { v4 as uuidv4 } from 'uuid';

interface ProjectState {
  // 상태
  project: Project | null;
  filePath: string | null;
  isDirty: boolean;
  lastSaved: Date | null;

  // 액션
  createProject: (title: string) => void;
  openProject: (path: string) => Promise<void>;
  saveProject: () => Promise<void>;
  saveProjectAs: () => Promise<void>;
  closeProject: () => void;
  setDirty: (dirty: boolean) => void;
  setVideo: (video: VideoInfo) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set, get) => ({
    project: null,
    filePath: null,
    isDirty: false,
    lastSaved: null,

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
        const projectData = await window.api.file.readProject<Project>(path);
        set({
          project: projectData,
          filePath: path,
          isDirty: false,
          lastSaved: new Date(),
        });
      } catch (error) {
        console.error('Failed to open project:', error);
        throw error;
      }
    },

    saveProject: async () => {
      const { project, filePath } = get();
      if (!project) return;

      const content = JSON.stringify(project, null, 2);
      const savedPath = await window.api.file.saveProject({
        path: filePath ?? undefined,
        content,
      });

      if (savedPath) {
        // 파일명에서 프로젝트 제목 추출 (첫 저장 시)
        let newTitle = project.title;
        if (!filePath) {
          // 새로 저장하는 경우 파일명을 프로젝트 제목으로 사용
          const filename = savedPath.split('/').pop() || savedPath.split('\\').pop() || '';
          newTitle = filename.replace(/\.accessflow$/i, '') || project.title;
        }

        const updatedProject = {
          ...project,
          title: newTitle,
          modifiedAt: new Date().toISOString(),
        };

        // 프로젝트 파일 다시 저장 (제목 업데이트 반영)
        if (newTitle !== project.title) {
          const updatedContent = JSON.stringify(updatedProject, null, 2);
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
      }
    },

    saveProjectAs: async () => {
      const { project } = get();
      if (!project) return;

      const content = JSON.stringify(project, null, 2);
      const savedPath = await window.api.file.saveProject({ content });

      if (savedPath) {
        // 파일명에서 프로젝트 제목 추출
        const filename = savedPath.split('/').pop() || savedPath.split('\\').pop() || '';
        const newTitle = filename.replace(/\.accessflow$/i, '') || project.title;

        const updatedProject = {
          ...project,
          title: newTitle,
          modifiedAt: new Date().toISOString(),
        };

        // 프로젝트 파일 다시 저장 (제목 업데이트 반영)
        const updatedContent = JSON.stringify(updatedProject, null, 2);
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
      }
    },

    closeProject: () => {
      set({
        project: null,
        filePath: null,
        isDirty: false,
        lastSaved: null,
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
  }))
);
