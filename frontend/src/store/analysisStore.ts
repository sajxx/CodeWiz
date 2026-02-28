import { create } from 'zustand';
import type { AnalysisResult } from '@shared/types';

export type ActivePanel =
  | 'progress'
  | 'overview'
  | 'dependency-graph'
  | 'core-components'
  | 'execution-flow'
  | 'complexity-scores'
  | 'checklist';

interface AnalysisStore {
  sessionId: string | null;
  result: AnalysisResult | null;
  activePanel: ActivePanel;
  /** For core components drill-down */
  selectedModuleId: string | null;
  /** Checklist checked items (resets on refresh) */
  checkedItems: Record<string, boolean>;

  setSessionId: (id: string) => void;
  setResult: (result: AnalysisResult) => void;
  setActivePanel: (panel: ActivePanel) => void;
  setSelectedModuleId: (id: string | null) => void;
  toggleChecklistItem: (id: string) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  sessionId: null,
  result: null,
  activePanel: 'progress',
  selectedModuleId: null,
  checkedItems: {},

  setSessionId: (id) => set({ sessionId: id }),
  setResult: (result) => set({ result }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setSelectedModuleId: (id) => set({ selectedModuleId: id }),
  toggleChecklistItem: (id) =>
    set((state) => ({
      checkedItems: { ...state.checkedItems, [id]: !state.checkedItems[id] },
    })),
  reset: () =>
    set({
      sessionId: null,
      result: null,
      activePanel: 'progress',
      selectedModuleId: null,
      checkedItems: {},
    }),
}));
