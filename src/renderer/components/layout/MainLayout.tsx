import { useCallback, useRef } from 'react';
import { TitleBar } from './TitleBar';
import { MenuBar } from './MenuBar';
import { StatusBar } from './StatusBar';
import { PanelSplitter } from './PanelSplitter';
import { VideoPanel } from '../panels/VideoPanel';
import { ScriptPanel } from '../panels/ScriptPanel';
import { TimelinePanel } from '../panels/TimelinePanel';
import { FeedbackPanel } from '../panels/FeedbackPanel';
import { useUIStore } from '../../stores';

export function MainLayout() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    leftPanelWidth,
    timelineHeight,
    isTimelineCollapsed,
    showFeedbackPanel,
    setLeftPanelWidth,
    setTimelineHeight,
  } = useUIStore();

  const handleLeftResize = useCallback(
    (delta: number) => {
      // 컨테이너 너비를 기준으로 퍼센트 변환
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
      const deltaPercent = (delta / containerWidth) * 100;
      setLeftPanelWidth(leftPanelWidth + deltaPercent);
    },
    [leftPanelWidth, setLeftPanelWidth]
  );

  const handleTimelineResize = useCallback(
    (delta: number) => {
      setTimelineHeight(timelineHeight - delta);
    },
    [timelineHeight, setTimelineHeight]
  );

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      {/* 타이틀바 */}
      <TitleBar />

      {/* 메뉴바 */}
      <MenuBar />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단: 비디오 + 스크립트 패널 */}
        <div ref={containerRef} className="flex-1 flex overflow-hidden">
          {/* 왼쪽: 비디오 플레이어 (70%) */}
          <div style={{ flexBasis: `${leftPanelWidth}%`, minWidth: '40%', maxWidth: '85%' }} className="flex-shrink-0 overflow-hidden">
            <VideoPanel />
          </div>

          {/* 수직 분할선 */}
          <PanelSplitter direction="vertical" onResize={handleLeftResize} />

          {/* 오른쪽: 스크립트 에디터 (30%) */}
          <div className="flex-1 flex overflow-hidden" style={{ minWidth: '15%' }}>
            <div className={`${showFeedbackPanel ? 'flex-1' : 'w-full'} overflow-hidden`}>
              <ScriptPanel />
            </div>

            {/* 피드백 패널 */}
            {showFeedbackPanel && (
              <div className="w-72 flex-shrink-0 overflow-hidden">
                <FeedbackPanel />
              </div>
            )}
          </div>
        </div>

        {/* 타임라인 (isTimelineCollapsed가 false일 때만 표시) */}
        {!isTimelineCollapsed && (
          <>
            {/* 수평 분할선 */}
            <PanelSplitter direction="horizontal" onResize={handleTimelineResize} />

            {/* 하단: 타임라인 */}
            <div style={{ height: timelineHeight }} className="flex-shrink-0 overflow-hidden">
              <TimelinePanel />
            </div>
          </>
        )}
      </div>

      {/* 상태바 */}
      <StatusBar />
    </div>
  );
}
