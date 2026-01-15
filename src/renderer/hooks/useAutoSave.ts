import { useEffect, useRef } from 'react';
import { useProjectStore } from '../stores';

const AUTO_SAVE_INTERVAL = 3 * 60 * 1000; // 3분

/**
 * 자동 저장 훅
 * 프로젝트가 열려 있고 변경 사항이 있으면 3분마다 자동 저장
 */
export function useAutoSave() {
  const { project, filePath, isDirty } = useProjectStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSaveRef = useRef<number>(Date.now());

  useEffect(() => {
    // 프로젝트가 없거나 파일 경로가 없으면 자동 저장 안함
    if (!project || !filePath) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 이미 인터벌이 있으면 중복 설정 안함
    if (intervalRef.current) {
      return;
    }

    // 자동 저장 인터벌 설정
    intervalRef.current = setInterval(() => {
      const state = useProjectStore.getState();

      // 변경 사항이 있고, 마지막 저장 후 충분한 시간이 지났으면 저장
      if (state.isDirty && state.filePath) {
        const now = Date.now();
        if (now - lastSaveRef.current >= AUTO_SAVE_INTERVAL - 1000) {
          console.log('[AutoSave] 자동 저장 실행');
          state.saveProject();
          lastSaveRef.current = now;
        }
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [project, filePath]);

  // 수동 저장 시 마지막 저장 시간 업데이트
  useEffect(() => {
    if (!isDirty) {
      lastSaveRef.current = Date.now();
    }
  }, [isDirty]);
}
