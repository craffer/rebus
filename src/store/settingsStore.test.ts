import { describe, it, expect, beforeEach, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../types/settings";
import type { Settings } from "../types/settings";

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock settings persistence
const mockLoadSettings = vi.fn<() => Promise<Settings>>();
const mockSaveSettings = vi.fn<(s: Settings) => Promise<void>>();

vi.mock("../utils/settingsPersistence", () => ({
  loadSettings: () => mockLoadSettings(),
  saveSettings: (s: Settings) => mockSaveSettings(s),
  deepMerge: vi.fn(),
}));

const { useSettingsStore } = await import("./settingsStore");

describe("settingsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      settings: structuredClone(DEFAULT_SETTINGS),
      _loaded: false,
    });
  });

  describe("_initSettings", () => {
    it("loads settings from disk", async () => {
      const custom: Settings = {
        ...DEFAULT_SETTINGS,
        navigation: {
          ...DEFAULT_SETTINGS.navigation,
          arrow_key_behavior: "move",
        },
      };
      mockLoadSettings.mockResolvedValue(custom);

      await useSettingsStore.getState()._initSettings();

      const state = useSettingsStore.getState();
      expect(state.settings.navigation.arrow_key_behavior).toBe("move");
      expect(state._loaded).toBe(true);
    });
  });

  describe("updateNavigation", () => {
    it("updates a single navigation setting", () => {
      useSettingsStore
        .getState()
        .updateNavigation({ arrow_key_behavior: "move" });
      expect(
        useSettingsStore.getState().settings.navigation.arrow_key_behavior,
      ).toBe("move");
    });

    it("preserves other navigation settings", () => {
      useSettingsStore
        .getState()
        .updateNavigation({ arrow_key_behavior: "move" });
      expect(
        useSettingsStore.getState().settings.navigation.spacebar_behavior,
      ).toBe("clear_advance");
    });

    it("can update multiple navigation settings at once", () => {
      useSettingsStore.getState().updateNavigation({
        arrow_key_behavior: "move",
        spacebar_behavior: "toggle_direction",
      });
      const nav = useSettingsStore.getState().settings.navigation;
      expect(nav.arrow_key_behavior).toBe("move");
      expect(nav.spacebar_behavior).toBe("toggle_direction");
    });
  });

  describe("updateFeedback", () => {
    it("updates feedback settings", () => {
      useSettingsStore
        .getState()
        .updateFeedback({ play_sound_on_solve: false });
      expect(
        useSettingsStore.getState().settings.feedback.play_sound_on_solve,
      ).toBe(false);
    });

    it("preserves other feedback settings", () => {
      useSettingsStore
        .getState()
        .updateFeedback({ play_sound_on_solve: false });
      expect(useSettingsStore.getState().settings.feedback.show_timer).toBe(
        true,
      );
    });
  });

  describe("updateAppearance", () => {
    it("updates appearance settings", () => {
      useSettingsStore.getState().updateAppearance({ theme: "dark" });
      expect(useSettingsStore.getState().settings.appearance.theme).toBe(
        "dark",
      );
    });

    it("preserves other appearance settings", () => {
      useSettingsStore.getState().updateAppearance({ theme: "dark" });
      expect(
        useSettingsStore.getState().settings.appearance.highlight_color,
      ).toBe("#3478F6");
    });
  });

  describe("resetToDefaults", () => {
    it("resets all settings to defaults", () => {
      useSettingsStore
        .getState()
        .updateNavigation({ arrow_key_behavior: "move" });
      useSettingsStore.getState().updateAppearance({ theme: "dark" });
      useSettingsStore
        .getState()
        .updateFeedback({ play_sound_on_solve: false });

      useSettingsStore.getState().resetToDefaults();
      expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
    });
  });
});
