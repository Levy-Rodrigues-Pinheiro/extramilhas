import { create } from 'zustand';
import type { OfferType } from '../types';

interface AppState {
  selectedPrograms: string[];
  selectedTypes: OfferType[];
  maxCpm: number | null;
  darkMode: boolean;
  searchQuery: string;

  setSelectedPrograms: (programs: string[]) => void;
  toggleProgram: (program: string) => void;
  setSelectedTypes: (types: OfferType[]) => void;
  toggleType: (type: OfferType) => void;
  setMaxCpm: (cpm: number | null) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedPrograms: [],
  selectedTypes: [],
  maxCpm: null,
  darkMode: true,
  searchQuery: '',

  setSelectedPrograms: (programs) => set({ selectedPrograms: programs }),

  toggleProgram: (program) => {
    const { selectedPrograms } = get();
    if (selectedPrograms.includes(program)) {
      set({ selectedPrograms: selectedPrograms.filter((p) => p !== program) });
    } else {
      set({ selectedPrograms: [...selectedPrograms, program] });
    }
  },

  setSelectedTypes: (types) => set({ selectedTypes: types }),

  toggleType: (type) => {
    const { selectedTypes } = get();
    if (selectedTypes.includes(type)) {
      set({ selectedTypes: selectedTypes.filter((t) => t !== type) });
    } else {
      set({ selectedTypes: [...selectedTypes, type] });
    }
  },

  setMaxCpm: (cpm) => set({ maxCpm: cpm }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  resetFilters: () =>
    set({
      selectedPrograms: [],
      selectedTypes: [],
      maxCpm: null,
      searchQuery: '',
    }),
}));
