import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { info } from "@tauri-apps/plugin-log";
import type { Settings } from "../types/settings";
import { DEFAULT_SETTINGS } from "../types/settings";
import { loadSettings, saveSettings } from "../utils/settingsPersistence";

interface SettingsState {
  settings: Settings;
  _loaded: boolean;
  _initSettings: () => Promise<void>;
  updateNavigation: (updates: Partial<Settings["navigation"]>) => void;
  updateFeedback: (updates: Partial<Settings["feedback"]>) => void;
  updateAppearance: (updates: Partial<Settings["appearance"]>) => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  immer((set) => ({
    settings: DEFAULT_SETTINGS,
    _loaded: false,

    _initSettings: async () => {
      const settings = await loadSettings();
      set((state) => {
        state.settings = settings;
        state._loaded = true;
      });
      info("Settings loaded");
    },

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

// Auto-save settings to disk on change (debounced)
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

useSettingsStore.subscribe((state, prevState) => {
  if (state.settings !== prevState.settings && state._loaded) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveSettings(state.settings);
    }, 500);
  }
});
