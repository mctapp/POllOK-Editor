import { BrowserWindow, ipcMain, dialog } from 'electron';
import { IpcChannels } from '../../shared/types';
import { SUPPORTED_VIDEO_FORMATS, PROJECT_FILE_FILTER } from '../../shared/constants';
import fs from 'fs/promises';
import crypto from 'crypto';

export function setupIpcHandlers(mainWindow: BrowserWindow) {
  // 윈도우 컨트롤
  ipcMain.on(IpcChannels.WINDOW_MINIMIZE, () => {
    mainWindow.minimize();
  });

  ipcMain.on(IpcChannels.WINDOW_MAXIMIZE, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on(IpcChannels.WINDOW_CLOSE, () => {
    mainWindow.close();
  });

  ipcMain.handle(IpcChannels.WINDOW_IS_MAXIMIZED, () => {
    return mainWindow.isMaximized();
  });

  // 파일 선택: 비디오
  ipcMain.handle(IpcChannels.FILE_SELECT_VIDEO, async () => {
    const extensions = SUPPORTED_VIDEO_FORMATS.flatMap((f) => f.extensions);
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '영상 파일 선택',
      filters: [
        { name: 'Video Files', extensions },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // 파일 선택: 프로젝트
  ipcMain.handle(IpcChannels.FILE_SELECT_PROJECT, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '프로젝트 열기',
      filters: [PROJECT_FILE_FILTER, { name: 'All Files', extensions: ['*'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // 프로젝트 저장
  ipcMain.handle(
    IpcChannels.FILE_SAVE_PROJECT,
    async (_, data: { path?: string; content: string }) => {
      let filePath = data.path;

      if (!filePath) {
        const result = await dialog.showSaveDialog(mainWindow, {
          title: '프로젝트 저장',
          filters: [PROJECT_FILE_FILTER],
          defaultPath: 'untitled.afproj',
        });

        if (result.canceled || !result.filePath) {
          return null;
        }

        filePath = result.filePath;
      }

      try {
        await fs.writeFile(filePath, data.content, 'utf-8');
        return filePath;
      } catch (error) {
        console.error('Failed to save project:', error);
        throw error;
      }
    }
  );

  // 프로젝트 읽기
  ipcMain.handle(IpcChannels.FILE_READ_PROJECT, async (_, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read project:', error);
      throw error;
    }
  });

  // 파일 해시 계산
  ipcMain.handle(IpcChannels.FILE_CALCULATE_HASH, async (_, filePath: string) => {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return `sha256:${hashSum.digest('hex')}`;
    } catch (error) {
      console.error('Failed to calculate hash:', error);
      throw error;
    }
  });

  // 내보내기 경로 선택
  ipcMain.handle(
    IpcChannels.EXPORT_SELECT_PATH,
    async (_, options: { defaultPath: string; filters: Electron.FileFilter[] }) => {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: '내보내기',
        defaultPath: options.defaultPath,
        filters: options.filters,
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      return result.filePath;
    }
  );

  // 파일 내보내기 (쓰기)
  ipcMain.handle(
    IpcChannels.EXPORT_WRITE_FILE,
    async (_, data: { path: string; content: string }) => {
      try {
        await fs.writeFile(data.path, data.content, 'utf-8');
        return true;
      } catch (error) {
        console.error('Failed to export file:', error);
        throw error;
      }
    }
  );

  // 녹음 파일 저장
  ipcMain.handle(
    IpcChannels.RECORDING_SAVE,
    async (_, data: { cardId: string; audioData: number[]; projectPath?: string; sampleRate?: number }) => {
      try {
        const path = await import('path');
        let recordingsDir: string;

        if (data.projectPath) {
          // 프로젝트 파일과 같은 이름의 폴더 생성
          const projectDir = path.dirname(data.projectPath);
          const projectName = path.basename(data.projectPath, '.afproj');
          recordingsDir = path.join(projectDir, projectName, 'recordings');
        } else {
          // 프로젝트가 저장되지 않은 경우 임시 폴더 사용
          const { app } = await import('electron');
          recordingsDir = path.join(app.getPath('documents'), 'AccessON', 'recordings');
        }

        // 폴더가 없으면 생성
        await fs.mkdir(recordingsDir, { recursive: true });

        // 파일 이름 생성 (cardId + timestamp)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${data.cardId}_${timestamp}.wav`;
        const filePath = path.join(recordingsDir, fileName);

        // PCM 데이터를 WAV 파일로 변환
        const pcmData = new Float32Array(data.audioData);
        const sampleRate = data.sampleRate || 44100;
        const wavBuffer = createWavBuffer(pcmData, sampleRate);

        await fs.writeFile(filePath, wavBuffer);

        return filePath;
      } catch (error) {
        console.error('Failed to save recording:', error);
        throw error;
      }
    }
  );
}

// PCM 데이터를 WAV 버퍼로 변환
function createWavBuffer(samples: Float32Array, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataLength = samples.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const buffer = Buffer.alloc(totalLength);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset);
  offset += 4;
  buffer.writeUInt32LE(totalLength - 8, offset);
  offset += 4;
  buffer.write('WAVE', offset);
  offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset);
  offset += 4;
  buffer.writeUInt32LE(16, offset); // chunk size
  offset += 4;
  buffer.writeUInt16LE(1, offset); // audio format (PCM)
  offset += 2;
  buffer.writeUInt16LE(numChannels, offset);
  offset += 2;
  buffer.writeUInt32LE(sampleRate, offset);
  offset += 4;
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, offset); // byte rate
  offset += 4;
  buffer.writeUInt16LE(numChannels * bytesPerSample, offset); // block align
  offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset);
  offset += 2;

  // data chunk
  buffer.write('data', offset);
  offset += 4;
  buffer.writeUInt32LE(dataLength, offset);
  offset += 4;

  // Write PCM samples (convert float32 to int16)
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    buffer.writeInt16LE(Math.round(int16Sample), offset);
    offset += 2;
  }

  return buffer;
}
