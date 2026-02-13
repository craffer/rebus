import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Settings } from "../types/settings";
import { DEFAULT_SETTINGS } from "../types/settings";

interface SettingsState {
  settings: Settings;
  updateNavigation: (updates: Partial<Settings["navigation"]>) => void;
  updateFeedback: (updates: Partial<Settings["feedback"]>) => void;
  updateAppearance: (updates: Partial<Settings["appearance"]>) => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  immer((set) => ({
    settings: DEFAULT_SETTINGS,

    updateNavigation: (updates) => {
      set((state) => {
        Object.assign(state.settings.navigation, updates);
      });
    },

    updateFeedback: (updates) => {
      set((state) => {
        Object.assign(state.settings.feedback, updates);
      });
    },

    updateAppearance: (updates) => {
      set((state) => {
        Object.assign(state.settings.appearance, updates);
      });
    },

    resetToDefaults: () => {
      set((state) => {
        state.settings = DEFAULT_SETTINGS;
      });
    },
  })),
);
