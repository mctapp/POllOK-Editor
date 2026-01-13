import { MainLayout } from './components/layout/MainLayout';
import { useKeyboardShortcuts } from './hooks';

function App() {
  // 전역 키보드 단축키 활성화
  useKeyboardShortcuts();

  return (
    <div className="h-screen bg-dark-bg text-white overflow-hidden">
      <MainLayout />
    </div>
  );
}

export default App;
