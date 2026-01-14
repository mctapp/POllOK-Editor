import { MainLayout } from './components/layout/MainLayout';
import { StartScreen } from './components/StartScreen';
import { useKeyboardShortcuts } from './hooks';
import { useProjectStore } from './stores';

function App() {
  // 전역 키보드 단축키 활성화
  useKeyboardShortcuts();

  const { project } = useProjectStore();

  // 프로젝트가 없으면 시작 화면 표시
  if (!project) {
    return <StartScreen />;
  }

  return (
    <div className="h-screen bg-dark-bg text-white overflow-hidden">
      <MainLayout />
    </div>
  );
}

export default App;
