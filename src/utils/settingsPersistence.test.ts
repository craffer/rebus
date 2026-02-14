import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_SETTINGS } from "../types/settings";
import type { Settings } from "../types/settings";

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock @tauri-apps/plugin-fs
const mockReadTextFile = vi.fn();
const mockWriteTextFile = vi.fn();
const mockMkdir = vi.fn();
const mockExists = vi.fn();

vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: (...args: unknown[]) => mockReadTextFile(...args),
  writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  exists: (...args: unknown[]) => mockExists(...args),
  BaseDirectory: { AppConfig: 26 },
}));

// Import after mocks are set up
const { loadSettings, saveSettings, deepMerge } =
  await import("./settingsPersistence");

describe("settingsPersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadSettings", () => {
    it("returns defaults when settings file does not exist", async () => {
      mockExists.mockResolvedValue(false);

      const result = await loadSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
      expect(mockReadTextFile).not.toHaveBeenCalled();
    });

    it("returns parsed settings when file exists", async () => {
      const saved: Settings = {
        ...DEFAULT_SETTINGS,
        navigation: {
          ...DEFAULT_SETTINGS.navigation,
          skip_filled_cells: "none",
        },
      };
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue(JSON.stringify(saved));

      const result = await loadSettings();
      expect(result.navigation.skip_filled_cells).toBe("none");
      // Other settings should still have defaults
      expect(result.navigation.arrow_key_behavior).toBe("stay");
    });

    it("deep-merges saved settings with defaults for schema evolution", async () => {
      // Simulate an old saved file that's missing some keys
      const oldSaved = {
        navigation: {
          arrow_key_behavior: "move",
          // missing scroll_clue_to_top and other newer keys
        },
        feedback: {
          play_sound_on_solve: false,
        },
        // missing appearance entirely
      };
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue(JSON.stringify(oldSaved));

      const result = await loadSettings();
      // Saved values preserved
      expect(result.navigation.arrow_key_behavior).toBe("move");
      expect(result.feedback.play_sound_on_solve).toBe(false);
      // Missing keys get defaults
      expect(result.navigation.scroll_clue_to_top).toBe(true);
      expect(result.appearance).toEqual(DEFAULT_SETTINGS.appearance);
    });

    it("returns defaults on corrupted JSON", async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue("not valid json {{{");

      const result = await loadSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it("returns defaults when readTextFile throws", async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockRejectedValue(new Error("read error"));

      const result = await loadSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe("saveSettings", () => {
    it("creates directory and writes settings file", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteTextFile.mockResolvedValue(undefined);

      await saveSettings(DEFAULT_SETTINGS);

      expect(mockMkdir).toHaveBeenCalledWith("", {
        baseDir: 26,
        recursive: true,
      });
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        "settings.json",
        JSON.stringify(DEFAULT_SETTINGS, null, 2),
        { baseDir: 26 },
      );
    });

    it("does not throw when write fails", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteTextFile.mockRejectedValue(new Error("write error"));

      // Should not throw
      await expect(saveSettings(DEFAULT_SETTINGS)).resolves.toBeUndefined();
    });
  });

  describe("deepMerge", () => {
    it("fills in missing keys from defaults", () => {
      const defaults = { a: 1, b: { c: 2, d: 3 } };
      const saved = { a: 10, b: { c: 20 } };
      const result = deepMerge(defaults, saved);
      expect(result).toEqual({ a: 10, b: { c: 20, d: 3 } });
    });

    it("returns defaults when saved is empty", () => {
      const defaults = { a: 1, b: 2 };
      const result = deepMerge(defaults, {});
      expect(result).toEqual(defaults);
    });

    it("does not mutate original objects", () => {
      const defaults = { a: { b: 1 } };
      const saved = { a: { b: 2 } };
      const result = deepMerge(defaults, saved);
      expect(result.a.b).toBe(2);
      expect(defaults.a.b).toBe(1);
    });
  });
});
