import { create } from 'zustand';
import * as XLSX from 'xlsx';
import type { GuideItem } from '../../shared/types';

interface GuideState {
  guides: GuideItem[];
  isLoaded: boolean;
  selectedCode: string | null;
  loadGuides: () => Promise<void>;
  getGuideByCode: (code: string) => GuideItem | undefined;
  getGuidesByMajorCategory: (category: string) => GuideItem[];
  getMajorCategories: () => string[];
  selectGuide: (code: string | null) => void;
}

export const useGuideStore = create<GuideState>((set, get) => ({
  guides: [],
  isLoaded: false,
  selectedCode: null,

  loadGuides: async () => {
    try {
      // guide 폴더에서 엑셀 파일 로드 (publicDir이 guide 폴더로 설정됨)
      const response = await fetch('/AD-Guide-V1.2.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

      // 첫 행은 헤더이므로 제외
      const guides: GuideItem[] = [];
      let currentCategory = '';
      let currentMajorCategory = '';

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue; // 코드가 없으면 스킵

        // 유개념과 대분류는 병합 셀이므로 이전 값 유지
        if (row[1]) currentCategory = String(row[1]).replace(/\r\n/g, ' ');
        if (row[2]) currentMajorCategory = String(row[2]).replace(/\r\n/g, ' ');

        guides.push({
          code: String(row[0] || ''),
          category: currentCategory,
          majorCategory: currentMajorCategory,
          minorCategory: String(row[3] || ''),
          principle: String(row[4] || ''),
          violationProblem: String(row[5] || ''),
          correctExample: String(row[6] || ''),
          wrongExample: String(row[7] || ''),
        });
      }

      set({ guides, isLoaded: true });
    } catch (error) {
      console.error('가이드 로드 실패:', error);
      set({ guides: [], isLoaded: true });
    }
  },

  getGuideByCode: (code: string) => {
    return get().guides.find((g) => g.code === code);
  },

  getGuidesByMajorCategory: (category: string) => {
    return get().guides.filter((g) => g.majorCategory === category);
  },

  getMajorCategories: () => {
    const categories = new Set<string>();
    get().guides.forEach((g) => {
      if (g.majorCategory) categories.add(g.majorCategory);
    });
    return Array.from(categories);
  },

  selectGuide: (code: string | null) => {
    set({ selectedCode: code });
  },
}));
