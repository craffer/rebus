import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseDirectory } from "@tauri-apps/plugin-fs";

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock @tauri-apps/plugin-fs
const mockExists = vi.fn();
const mockMkdir = vi.fn();
const mockReadTextFile = vi.fn();
const mockWriteTextFile = vi.fn();

vi.mock("@tauri-apps/plugin-fs", () => ({
  BaseDirectory: { AppData: "AppData" },
  exists: (...args: unknown[]) => mockExists(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  readTextFile: (...args: unknown[]) => mockReadTextFile(...args),
  writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
}));

const { loadLibrary, saveLibrary, loadFolders, saveFolders } =
  await import("./libraryPersistence");

import type { LibraryEntry, LibraryFolder } from "../types/library";

function makeEntry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    filePath: "/path/to/puzzle.puz",
    puzzleId: "abc123",
    title: "Test Puzzle",
    author: "Test Author",
    dateOpened: 1700000000000,
    completionPercent: 50,
    isSolved: false,
    usedHelp: false,
    elapsedSeconds: 120,
    width: 15,
    height: 15,
    ...overrides,
  };
}

function makeFolder(overrides: Partial<LibraryFolder> = {}): LibraryFolder {
  return {
    id: "folder-1",
    name: "My Folder",
    createdAt: 1700000000000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── loadLibrary ────────────────────────────────────────────────────────────

describe("loadLibrary", () => {
  it("returns empty array when file does not exist", async () => {
    mockExists.mockResolvedValue(false);
    const result = await loadLibrary();
    expect(result).toEqual([]);
  });

  it("returns parsed entries when file exists with valid JSON", async () => {
    const entries = [makeEntry(), makeEntry({ filePath: "/other.puz" })];
    mockExists.mockResolvedValue(true);
    mockReadTextFile.mockResolvedValue(JSON.stringify(entries));

    const result = await loadLibrary();
    expect(result).toEqual(entries);
  });

  it("passes correct options to exists", async () => {
    mockExists.mockResolvedValue(false);
    await loadLibrary();
    expect(mockExists).toHaveBeenCalledWith("recent-files.json", {
      baseDir: BaseDirectory.AppData,
    });
  });

  it("passes correct options to readTextFile", async () => {
    mockExists.mockResolvedValue(true);
    mockReadTextFile.mockResolvedValue("[]");
    await loadLibrary();
    expect(mockReadTextFile).toHaveBeenCalledWith("recent-files.json", {
      baseDir: BaseDirectory.AppData,
    });
  });

  it("returns empty array when JSON is not an array", async () => {
    mockExists.mockResolvedValue(true);
    mockReadTextFile.mockResolvedValue('{"key": "value"}');

    const { warn } = await import("@tauri-apps/plugin-log");
    const result = await loadLibrary();
    expect(result).toEqual([]);
    // warn should not be called — not-array falls through the guard, not catch
    expect(warn).not.toHaveBeenCalled();
  });

  it("returns empty array and warns when readTextFile throws", async () => {
    mockExists.mockResolvedValue(true);
    mockReadTextFile.mockRejectedValue(new Error("disk error"));

    const { warn } = await import("@tauri-apps/plugin-log");
    const result = await loadLibrary();
    expect(result).toEqual([]);
    expect(warn).toHaveBeenCalledWith("Failed to load puzzle library");
  });

  it("returns empty array and warns when JSON is invalid", async () => {
    mockExists.mockResolvedValue(true);
    mockReadTextFile.mockResolvedValue("not-json{{");

    const { warn } = await import("@tauri-apps/plugin-log");
    const result = await loadLibrary();
    expect(result).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });
});

// ── saveLibrary ────────────────────────────────────────────────────────────

describe("saveLibrary", () => {
  it("writes entries as pretty JSON", async () => {
    mockExists.mockResolvedValue(true); // dir exists
    mockWriteTextFile.mockResolvedValue(undefined);

    const entries = [makeEntry()];
    await saveLibrary(entries);

    expect(mockWriteTextFile).toHaveBeenCalledWith(
      "recent-files.json",
      JSON.stringify(entries, null, 2),
      { baseDir: BaseDirectory.AppData },
    );
  });

  it("creates the directory if it does not exist", async () => {
    mockExists.mockResolvedValue(false);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteTextFile.mockResolvedValue(undefined);

    await saveLibrary([]);

    expect(mockMkdir).toHaveBeenCalledWith("", {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
  });

  it("does not create directory when it already exists", async () => {
    mockExists.mockResolvedValue(true);
    mockWriteTextFile.mockResolvedValue(undefined);

    await saveLibrary([]);
    expect(mockMkdir).not.toHaveBeenCalled();
  });

  it("logs error when writeTextFile throws", async () => {
    mockExists.mockResolvedValue(true);
    mockWriteTextFile.mockRejectedValue(new Error("write failed"));

    const { error } = await import("@tauri-apps/plugin-log");
    await saveLibrary([makeEntry()]);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to save puzzle library"),
    );
  });

  it("can save an empty array", async () => {
    mockExists.mockResolvedValue(true);
    mockWriteTextFile.mockResolvedValue(undefined);

    await expect(saveLibrary([])).resolves.toBeUndefined();
    expect(mockWriteTextFile).toHaveBeenCalledWith(
      "recent-files.json",
      "[]",
      expect.any(Object),
    );
  });
});

// ── loadFolders ────────────────────────────────────────────────────────────

describe("loadFolders", () => {
  it("returns empty array when file does not exist", async () => {
    mockExists.mockResolvedValue(false);
    const result = await loadFolders();
    expect(result).toEqual([]);
  });

  it("returns parsed folders when file exists", async () => {
    const folders = [makeFolder(), makeFolder({ id: "folder-2", name: "B" })];
    mockExists.mockResolvedValue(true);
    mockReadTextFile.mockResolvedValue(JSON.stringify(folders));

    const result = await loadFolders();
    expect(result).toEqual(folders);
  });

  it("passes correct filename to exists", async () => {
    mockExists.mockResolvedValue(false);
    await loadFolders();
    expect(mockExists).toHaveBeenCalledWith("library-folders.json", {
      baseDir: BaseDirectory.AppData,
    });
  });

  it("returns empty array when JSON is not an array", async () => {
    mockExists.mockResolvedValue(true);
    mockReadTextFile.mockResolvedValue('"just a string"');

    const result = await loadFolders();
    expect(result).toEqual([]);
  });

  it("returns empty array and warns when readTextFile throws", async () => {
    mockExists.mockResolvedValue(true);
    mockReadTextFile.mockRejectedValue(new Error("disk error"));

    const { warn } = await import("@tauri-apps/plugin-log");
    const result = await loadFolders();
    expect(result).toEqual([]);
    expect(warn).toHaveBeenCalledWith("Failed to load library folders");
  });
});

// ── saveFolders ────────────────────────────────────────────────────────────

describe("saveFolders", () => {
  it("writes folders as pretty JSON", async () => {
    mockExists.mockResolvedValue(true);
    mockWriteTextFile.mockResolvedValue(undefined);

    const folders = [makeFolder()];
    await saveFolders(folders);

    expect(mockWriteTextFile).toHaveBeenCalledWith(
      "library-folders.json",
      JSON.stringify(folders, null, 2),
      { baseDir: BaseDirectory.AppData },
    );
  });

  it("creates directory if it does not exist", async () => {
    mockExists.mockResolvedValue(false);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteTextFile.mockResolvedValue(undefined);

    await saveFolders([]);
    expect(mockMkdir).toHaveBeenCalledWith("", {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
  });

  it("logs error when writeTextFile throws", async () => {
    mockExists.mockResolvedValue(true);
    mockWriteTextFile.mockRejectedValue(new Error("write failed"));

    const { error } = await import("@tauri-apps/plugin-log");
    await saveFolders([makeFolder()]);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to save library folders"),
    );
  });
});
