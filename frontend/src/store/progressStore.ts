import { create } from 'zustand';
import type { ProgressEvent } from '@shared/types';

const ALL_STEPS: ProgressEvent['step'][] = [
  'Cloning Repository',
  'Scanning Files',
  'Detecting Tech Stack',
  'Parsing Imports',
  'Building Dependency Graph',
  'Calculating Complexity Scores',
  'Running AI Analysis',
  'Indexing to Knowledge Base',
  'Generating Checklist',
];

interface StepState {
  step: ProgressEvent['step'];
  status: ProgressEvent['status'];
  message?: string;
}

interface ProgressStore {
  steps: StepState[];
  isComplete: boolean;
  hasError: boolean;
  updateStep: (event: ProgressEvent) => void;
  reset: () => void;
  /** For mock/demo: simulate all steps completing */
  simulateComplete: () => void;
}

const initialSteps = (): StepState[] =>
  ALL_STEPS.map((step) => ({ step, status: 'pending' as const }));

export const useProgressStore = create<ProgressStore>((set) => ({
  steps: initialSteps(),
  isComplete: false,
  hasError: false,

  updateStep: (event) =>
    set((state) => {
      const steps = state.steps.map((s) =>
        s.step === event.step
          ? { step: s.step, status: event.status, message: event.message }
          : s,
      );
      const isComplete = steps.every((s) => s.status === 'done');
      const hasError = steps.some((s) => s.status === 'error');
      return { steps, isComplete, hasError };
    }),

  reset: () => set({ steps: initialSteps(), isComplete: false, hasError: false }),

  simulateComplete: () =>
    set({
      steps: ALL_STEPS.map((step) => ({ step, status: 'done' as const })),
      isComplete: true,
      hasError: false,
    }),
}));
