import { app, BrowserWindow, shell, protocol } from 'electron';
import path from 'path';
import fs from 'fs';
import { setupIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;

// 로컬 파일 접근을 위한 커스텀 프로토콜 등록
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 10 },
    backgroundColor: '#1a1a1a',
    show: false, // 준비될 때까지 숨김
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // 창이 준비되면 최대화하고 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  // IPC 핸들러 설정
  setupIpcHandlers(mainWindow);

  // 개발 환경
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 최대화 상태 변경 이벤트
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', false);
  });
}

// MIME 타입 결정 함수
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// 앱 준비 완료
app.whenReady().then(() => {
  // 커스텀 프로토콜 핸들러 등록 - Range 요청 지원
  protocol.handle('local-file', async (request) => {
    const filePath = decodeURIComponent(request.url.replace('local-file://', ''));

    try {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const mimeType = getMimeType(filePath);

      // Range 헤더 확인
      const rangeHeader = request.headers.get('range');

      if (rangeHeader) {
        // Range 요청 처리 (예: "bytes=0-1023")
        const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
        if (match) {
          const start = match[1] ? parseInt(match[1], 10) : 0;
          const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
          const chunkSize = end - start + 1;

          // 파일 스트림 생성
          const stream = fs.createReadStream(filePath, { start, end });

          // Node.js ReadStream을 Web ReadableStream으로 변환
          const webStream = new ReadableStream({
            start(controller) {
              stream.on('data', (chunk: Buffer) => {
                controller.enqueue(new Uint8Array(chunk));
              });
              stream.on('end', () => {
                controller.close();
              });
              stream.on('error', (err) => {
                controller.error(err);
              });
            },
            cancel() {
              stream.destroy();
            },
          });

          return new Response(webStream, {
            status: 206,
            headers: {
              'Content-Type': mimeType,
              'Content-Length': chunkSize.toString(),
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
            },
          });
        }
      }

      // Range 요청이 없는 경우 전체 파일 반환
      const stream = fs.createReadStream(filePath);
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          stream.on('end', () => {
            controller.close();
          });
          stream.on('error', (err) => {
            controller.error(err);
          });
        },
        cancel() {
          stream.destroy();
        },
      });

      return new Response(webStream, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
        },
      });
    } catch (error) {
      console.error('Protocol handler error:', error);
      return new Response('File not found', { status: 404 });
    }
  });

  createWindow();
});

// 모든 창이 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS에서 dock 클릭 시 창 생성
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 보안: 렌더러에서 새 창 생성 방지
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event) => {
    event.preventDefault();
  });
});
