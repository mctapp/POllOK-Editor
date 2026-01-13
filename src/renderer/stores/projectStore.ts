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

      const updatedProject = {
        ...project,
        modifiedAt: new Date().toISOString(),
      };

      const content = JSON.stringify(updatedProject, null, 2);
      const savedPath = await window.api.file.saveProject({
        path: filePath ?? undefined,
        content,
      });

      if (savedPath) {
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

      const updatedProject = {
        ...project,
        modifiedAt: new Date().toISOString(),
      };

      const content = JSON.stringify(updatedProject, null, 2);
      const savedPath = await window.api.file.saveProject({ content });

      if (savedPath) {
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
