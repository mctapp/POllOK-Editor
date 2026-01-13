# AccessFlow

시각장애인을 위한 화면해설(AD)과 청각장애인을 위한 자막(CC)을 효율적으로 작성할 수 있는 크로스 플랫폼 데스크톱 애플리케이션

## 핵심 가치

- **오프라인 우선**: 인터넷 연결 없이 완전한 작업 가능
- **가벼움**: 영상 파일 업로드 없이 로컬 파일 직접 재생
- **보안**: 영상 파일이 외부 서버에 저장되지 않음
- **협업 대비**: 향후 온라인 동기화를 위한 설계 내재

## 기술 스택

- **Frontend**: React 18, TypeScript, TailwindCSS, Radix UI
- **Backend**: Electron, Node.js
- **상태관리**: Zustand
- **비디오**: video.js
- **빌드**: Vite, electron-builder

## 개발 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 패키징
npm run dist
```

## 프로젝트 구조

```
src/
├── main/           # Electron Main Process
├── renderer/       # React Frontend
├── shared/         # 공유 타입 및 상수
└── preload/        # Preload 스크립트
```

## 문서

- [개발 로드맵](docs/DEVELOPMENT_ROADMAP.md)
- [아키텍처 설계](docs/ARCHITECTURE.md)
- [Sprint 1: 프로젝트 설정](docs/sprints/SPRINT_01_SETUP.md)
- [Sprint 2: 레이아웃](docs/sprints/SPRINT_02_LAYOUT.md)

## 라이선스

MIT License
