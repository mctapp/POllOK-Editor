# AccessFlow 개발 로드맵

## 개요

이 문서는 AD/CC Script Editor (AccessFlow)의 단계별 개발 계획을 정의합니다.

---

## Phase 1: MVP 개발 (12주)

### Sprint 1-2: 프로젝트 기반 구축

#### 목표
Electron + React + TypeScript 기반 프로젝트 설정 및 기본 앱 프레임 구현

#### 작업 항목

**1.1 프로젝트 초기화**
- [ ] Electron + Vite + React + TypeScript 보일러플레이트 생성
- [ ] TailwindCSS 설정
- [ ] ESLint + Prettier 설정
- [ ] 프로젝트 디렉토리 구조 생성

**1.2 기본 앱 프레임**
- [ ] 커스텀 타이틀바 구현 (Windows/Mac 통합)
- [ ] 메뉴바 구현 (File, Edit, View, Project, Export, Help)
- [ ] 기본 레이아웃 컴포넌트 (3-패널 구조)
- [ ] 상태바 컴포넌트

**1.3 개발 인프라**
- [ ] GitHub Actions CI/CD 설정
- [ ] 이슈/PR 템플릿 작성
- [ ] electron-builder 설정

#### 기술 스택
```
- electron: ^28.0.0
- electron-vite: ^2.0.0
- react: ^18.2.0
- typescript: ^5.3.0
- tailwindcss: ^3.4.0
- @radix-ui/react-*: 최신
```

---

### Sprint 3-4: 비디오 플레이어 모듈

#### 목표
로컬 영상 파일을 프레임 정확도로 재생하는 플레이어 구현

#### 작업 항목

**3.1 기본 비디오 플레이어**
- [ ] video.js 통합 및 기본 설정
- [ ] 로컬 파일 로딩 (MOV, MP4, MKV, AVI, WebM)
- [ ] 기본 재생 컨트롤 (재생/일시정지/정지)
- [ ] 볼륨 조절

**3.2 타임코드 시스템**
- [ ] SMPTE 타임코드 유틸리티 함수 구현
  - `framesToTimecode(frames, fps)`
  - `timecodeToFrames(tc, fps)`
  - `formatTimecode(frames, fps, format)`
- [ ] 타임코드 표시 컴포넌트
- [ ] FPS 자동 감지

**3.3 프레임 정확 탐색**
- [ ] 프레임 단위 이동 (←/→)
- [ ] 초 단위 이동 (Shift + ←/→)
- [ ] 타임코드 직접 입력 이동
- [ ] 재생 속도 조절 (0.5x ~ 2.0x)

**3.4 구간 반복**
- [ ] In/Out 포인트 설정 (I/O 키)
- [ ] 구간 반복 재생
- [ ] 구간 클리어

#### 핵심 컴포넌트
```
src/renderer/components/VideoPlayer/
├── VideoPlayer.tsx          # 메인 플레이어 컴포넌트
├── VideoControls.tsx        # 재생 컨트롤
├── TimecodeDisplay.tsx      # 타임코드 표시
├── SpeedControl.tsx         # 속도 조절
└── hooks/
    ├── useVideoPlayer.ts    # 플레이어 로직
    └── useTimecode.ts       # 타임코드 유틸리티
```

---

### Sprint 5-6: 타임라인 & 에디터 UI

#### 목표
파형 시각화 및 AD/CC 이벤트를 편집할 수 있는 타임라인 구현

#### 작업 항목

**5.1 파형 시각화**
- [ ] wavesurfer.js 통합
- [ ] 오디오 파형 추출 및 렌더링
- [ ] 줌 인/아웃 기능
- [ ] 파형 위 현재 위치 표시

**5.2 타임라인 트랙**
- [ ] AD 트랙 (상단)
- [ ] CC 트랙 (하단)
- [ ] 이벤트 블록 렌더링
- [ ] 현재 재생 위치 인디케이터

**5.3 이벤트 편집**
- [ ] 이벤트 드래그로 이동
- [ ] 이벤트 리사이즈 (시작/끝 조정)
- [ ] 이벤트 선택 및 다중 선택
- [ ] 이벤트 삭제

**5.4 타임라인 네비게이션**
- [ ] 클릭으로 재생 위치 이동
- [ ] 드래그로 스크롤
- [ ] 키보드 단축키 지원

#### 핵심 컴포넌트
```
src/renderer/components/Timeline/
├── Timeline.tsx             # 메인 타임라인
├── Waveform.tsx            # 파형 시각화
├── Track.tsx               # 트랙 컨테이너
├── EventBlock.tsx          # 이벤트 블록
├── Playhead.tsx            # 재생 위치 인디케이터
└── TimeRuler.tsx           # 시간 눈금
```

---

### Sprint 7-8: AD 스크립트 기능

#### 목표
화면해설(AD) 작성을 위한 완전한 에디터 구현

#### 작업 항목

**7.1 AD 입력 UI**
- [ ] AD 리스트 패널
- [ ] AD 항목 카드 컴포넌트
- [ ] 새 AD 추가 (Cmd/Ctrl + D)
- [ ] 실시간 스팟팅 (재생 중 In/Out 기록)

**7.2 AD 편집**
- [ ] 해설 텍스트 입력
- [ ] 타임코드 수동 조정
- [ ] 해설 타입 선택 (장면, 인물, 자막읽기 등)
- [ ] 해설 템플릿 적용

**7.3 TTS 미리듣기**
- [ ] OS 기본 TTS 엔진 연동 (say.js)
- [ ] 해설 미리듣기 버튼
- [ ] TTS 음성 선택
- [ ] 해설 길이 vs 가용 시간 비교 표시

**7.4 해설 검증**
- [ ] 대화 구간과 겹침 경고
- [ ] TTS 길이 초과 경고
- [ ] 필수 필드 검증

#### 데이터 구조
```typescript
interface AudioDescription {
  id: string;
  tcIn: number;        // 프레임 단위
  tcOut: number;
  text: string;
  type: 'scene' | 'character' | 'text' | 'action' | 'other';
  voice: string;
  status: 'draft' | 'review' | 'approved';
  createdAt: Date;
  modifiedAt: Date;
}
```

---

### Sprint 9-10: CC 자막 기능

#### 목표
자막(CC) 작성을 위한 완전한 에디터 구현

#### 작업 항목

**9.1 CC 입력 UI**
- [ ] CC 리스트 패널
- [ ] CC 항목 카드 컴포넌트
- [ ] 새 CC 추가 (Cmd/Ctrl + T)
- [ ] 실시간 스팟팅

**9.2 화자 관리**
- [ ] 화자 목록 관리
- [ ] 화자별 색상 지정
- [ ] 화자 빠른 선택 (단축키)

**9.3 자막 스타일**
- [ ] 위치 선택 (상/중/하)
- [ ] 정렬 선택 (좌/중/우)
- [ ] 자동 줄바꿈 (글자 수 제한)
- [ ] 최대 라인 수 제한

**9.4 특수 표기**
- [ ] 효과음 템플릿 ([음악], [박수] 등)
- [ ] 음악 가사 표기
- [ ] 화자 동시 발화 처리

#### 데이터 구조
```typescript
interface Caption {
  id: string;
  tcIn: number;
  tcOut: number;
  text: string;
  speakerId: string | null;
  position: 'top' | 'center' | 'bottom';
  align: 'left' | 'center' | 'right';
  type: 'dialogue' | 'effect' | 'music' | 'narrator';
  style: CaptionStyle;
  createdAt: Date;
  modifiedAt: Date;
}

interface Speaker {
  id: string;
  name: string;
  color: string;
}
```

---

### Sprint 11: 프로젝트 관리 & 내보내기

#### 목표
프로젝트 저장/로드 및 다양한 형식으로 내보내기

#### 작업 항목

**11.1 프로젝트 파일**
- [ ] .afproj 파일 형식 정의
- [ ] 프로젝트 생성 (새 프로젝트)
- [ ] 프로젝트 저장 (Cmd/Ctrl + S)
- [ ] 프로젝트 열기

**11.2 영상 파일 관리**
- [ ] 영상 파일 경로 참조 저장
- [ ] SHA-256 해시 계산 및 저장
- [ ] 영상 파일 위치 변경 시 재연결

**11.3 자동 저장**
- [ ] 30초 간격 자동 저장
- [ ] 백업 파일 생성 (.afproj.bak)
- [ ] 복구 기능

**11.4 내보내기 - 자막 형식**
- [ ] SRT (SubRip)
- [ ] VTT (WebVTT)
- [ ] STL (EBU)
- [ ] SCC (Scenarist) - 선택

**11.5 내보내기 - 문서 형식**
- [ ] Excel (.xlsx)
- [ ] CSV
- [ ] Word (.docx) - 선택

---

### Sprint 12: 테스트 & 배포

#### 목표
크로스 플랫폼 빌드 및 첫 릴리스

#### 작업 항목

**12.1 테스트**
- [ ] 단위 테스트 (Vitest)
- [ ] 컴포넌트 테스트 (React Testing Library)
- [ ] E2E 테스트 (Playwright) - 핵심 시나리오만
- [ ] Mac 수동 테스트
- [ ] Windows 수동 테스트

**12.2 빌드 & 패키징**
- [ ] Mac DMG 빌드
- [ ] Windows NSIS 인스톨러 빌드
- [ ] 코드 서명 설정

**12.3 릴리스**
- [ ] v0.1.0 태그 및 릴리스 노트
- [ ] GitHub Releases 배포
- [ ] 자동 업데이트 설정 (electron-updater)

---

## Phase 2: 기능 확장 (Week 13-20)

### Sprint 13-14: 고급 내보내기
- DaVinci Resolve EDL/XML
- Premiere Pro XML
- Final Cut Pro X FCPXML
- ESEF (방송용)

### Sprint 15-16: 온라인 동기화 기반
- Firebase/Supabase 연동
- 사용자 인증
- 오프라인 큐잉

### Sprint 17-18: 협업 기능
- 코멘트 시스템
- 작업 상태 관리
- 실시간 동기화

### Sprint 19-20: 고급 기능 & 안정화
- AI 해설 추천 (선택)
- 성능 최적화
- v1.0.0 릴리스

---

## 마일스톤 요약

| 버전 | 스프린트 | 주요 기능 |
|------|----------|----------|
| v0.1.0-alpha | 6 | 비디오 재생 + 타임라인 |
| v0.1.0-beta | 10 | AD/CC 작성 완료 |
| v0.1.0 | 12 | MVP - 내보내기 포함 |
| v0.2.0 | 16 | 온라인 동기화 |
| v1.0.0 | 20 | 협업 기능 완성 |

---

## 키보드 단축키 정의

| 기능 | Mac | Windows |
|------|-----|---------|
| 재생/일시정지 | `Space` | `Space` |
| 1프레임 뒤로 | `←` | `←` |
| 1프레임 앞으로 | `→` | `→` |
| 1초 뒤로 | `Shift+←` | `Shift+←` |
| 1초 앞으로 | `Shift+→` | `Shift+→` |
| In 포인트 | `I` | `I` |
| Out 포인트 | `O` | `O` |
| 새 AD | `Cmd+D` | `Ctrl+D` |
| 새 CC | `Cmd+T` | `Ctrl+T` |
| 저장 | `Cmd+S` | `Ctrl+S` |
| 내보내기 | `Cmd+E` | `Ctrl+E` |
| 실행 취소 | `Cmd+Z` | `Ctrl+Z` |
| 다시 실행 | `Cmd+Shift+Z` | `Ctrl+Y` |

---

*이 문서는 개발 진행에 따라 업데이트됩니다.*
