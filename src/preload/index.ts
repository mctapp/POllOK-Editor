import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from '../shared/types';

// API 정의
const api = {
  // 윈도우 컨트롤
  window: {
    minimize: () => ipcRenderer.send(IpcChannels.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.send(IpcChannels.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.send(IpcChannels.WINDOW_CLOSE),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke(IpcChannels.WINDOW_IS_MAXIMIZED),
  },

  // 파일 작업
  file: {
    selectVideo: (): Promise<string | null> => ipcRenderer.invoke(IpcChannels.FILE_SELECT_VIDEO),
    selectProject: (): Promise<string | null> =>
      ipcRenderer.invoke(IpcChannels.FILE_SELECT_PROJECT),
    saveProject: (data: { path?: string; content: string }): Promise<string | null> =>
      ipcRenderer.invoke(IpcChannels.FILE_SAVE_PROJECT, data),
    readProject: <T>(path: string): Promise<T> =>
      ipcRenderer.invoke(IpcChannels.FILE_READ_PROJECT, path),
    calculateHash: (path: string): Promise<string> =>
      ipcRenderer.invoke(IpcChannels.FILE_CALCULATE_HASH, path),
  },

  // 내보내기
  export: {
    selectPath: (options: {
      defaultPath: string;
      filters: { name: string; extensions: string[] }[];
    }): Promise<string | null> => ipcRenderer.invoke(IpcChannels.EXPORT_SELECT_PATH, options),
  },

  // 이벤트 리스너
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const listener = (_: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // 플랫폼 정보
  platform: process.platform,

  // 유틸리티
  utils: {
    // 파일 경로를 local-file:// URL로 변환 (커스텀 프로토콜)
    getFileUrl: (filePath: string): string => {
      // Windows 경로 처리
      const normalizedPath = filePath.replace(/\\/g, '/');
      return `local-file://${encodeURIComponent(normalizedPath)}`;
    },
  },
};

// API를 window 객체에 노출
contextBridge.exposeInMainWorld('api', api);

// TypeScript 타입 정의
export type ApiType = typeof api;
