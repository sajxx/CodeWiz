import { create } from 'zustand';
import type { ChatMessage } from '@shared/types';

interface ChatStore {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;

  addMessage: (msg: ChatMessage) => void;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isOpen: false,
  isLoading: false,

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  setIsOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ messages: [], isOpen: false, isLoading: false }),
}));
