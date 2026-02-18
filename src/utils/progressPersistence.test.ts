import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PuzzleProgress } from "../types/progress";

// Mock @tauri-apps/plugin-fs
const mockReadTextFile = vi.fn();
const mockWriteTextFile = vi.fn();
const mockMkdir = vi.fn();
const mockExists = vi.fn();
const mockRemove = vi.fn();

vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: (...args: unknown[]) => mockReadTextFile(...args),
  writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  exists: (...args: unknown[]) => mockExists(...args),
  remove: (...args: unknown[]) => mockRemove(...args),
  BaseDirectory: { AppData: 24 },
}));

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const { saveProgress, loadProgress, deleteProgress, puzzleIdFromPath } =
  await import("./progressPersistence");

describe("progressPersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("puzzleIdFromPath", () => {
    it("produces a consistent hash for the same path", () => {
      const id1 = puzzleIdFromPath("/path/to/puzzle.puz");
      const id2 = puzzleIdFromPath("/path/to/puzzle.puz");
      expect(id1).toBe(id2);
    });

    it("produces different hashes for different paths", () => {
      const id1 = puzzleIdFromPath("/path/to/puzzle1.puz");
      const id2 = puzzleIdFromPath("/path/to/puzzle2.puz");
      expect(id1).not.toBe(id2);
    });

    it("returns a base-36 string", () => {
      const id = puzzleIdFromPath("/some/path.puz");
      expect(id).toMatch(/^[0-9a-z]+$/);
    });

    it("handles empty string", () => {
      const id = puzzleIdFromPath("");
      expect(id).toBe("0");
    });
  });

  describe("saveProgress", () => {
    it("creates directory and writes progress file", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteTextFile.mockResolvedValue(undefined);

      const progress: PuzzleProgress = {
        puzzleId: "abc123",
        filePath: "/test.puz",
        title: "Test Puzzle",
        cellValues: ["A", "B", null],
        pencilCells: ["0,0"],
        incorrectCells: [],
        revealedCells: [],
        elapsedSeconds: 10,
        isSolved: false,
        usedHelp: false,
        lastSaved: 1234567890,
      };

      await saveProgress(progress);

      expect(mockMkdir).toHaveBeenCalledWith("progress", {
        baseDir: 24,
        recursive: true,
      });
      expect(mockWriteTextFile).toHaveBeenCalledWith(
        "progress/abc123.json",
        JSON.stringify(progress, null, 2),
        { baseDir: 24 },
      );
    });

    it("does not throw when write fails", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteTextFile.mockRejectedValue(new Error("write error"));

      const progress: PuzzleProgress = {
        puzzleId: "abc",
        filePath: "/test.puz",
        title: "T",
        cellValues: [],
        pencilCells: [],
        incorrectCells: [],
        revealedCells: [],
        elapsedSeconds: 0,
        isSolved: false,
        usedHelp: false,
        lastSaved: 0,
      };

      await expect(saveProgress(progress)).resolves.toBeUndefined();
    });
  });

  describe("loadProgress", () => {
    it("returns null when file does not exist", async () => {
      mockExists.mockResolvedValue(false);
      const result = await loadProgress("/test.puz");
      expect(result).toBeNull();
    });

    it("returns parsed progress when file exists", async () => {
      const progress: PuzzleProgress = {
        puzzleId: "test",
        filePath: "/test.puz",
        title: "Test",
        cellValues: ["A"],
        pencilCells: [],
        incorrectCells: [],
        revealedCells: [],
        elapsedSeconds: 5,
        isSolved: false,
        usedHelp: false,
        lastSaved: 123,
      };

      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue(JSON.stringify(progress));

      const result = await loadProgress("/test.puz");
      expect(result).toEqual(progress);
    });

    it("returns null when read fails", async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockRejectedValue(new Error("read error"));

      const result = await loadProgress("/test.puz");
      expect(result).toBeNull();
    });

    it("returns null on corrupted JSON", async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue("not json {{{");

      const result = await loadProgress("/test.puz");
      expect(result).toBeNull();
    });
  });

  describe("deleteProgress", () => {
    it("removes the progress file", async () => {
      mockRemove.mockResolvedValue(undefined);
      await deleteProgress("/test.puz");
      expect(mockRemove).toHaveBeenCalled();
    });

    it("does not throw when remove fails", async () => {
      mockRemove.mockRejectedValue(new Error("remove error"));
      await expect(deleteProgress("/test.puz")).resolves.toBeUndefined();
    });
  });
});
