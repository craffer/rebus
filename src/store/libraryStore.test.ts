import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useLibraryStore,
  getEntryStatus,
  filterAndSortEntries,
} from "./libraryStore";
import type { LibraryEntry } from "../types/library";

// Mock Tauri plugins so the store doesn't try to hit the filesystem or logger
vi.mock("../utils/libraryPersistence", () => ({
  loadLibrary: vi.fn().mockResolvedValue([]),
  saveLibrary: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

function makeEntry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    filePath: "/puzzles/test.puz",
    puzzleId: "abc123",
    title: "Test Puzzle",
    author: "Author",
    dateOpened: Date.now(),
    completionPercent: 0,
    isSolved: false,
    elapsedSeconds: 0,
    width: 15,
    height: 15,
    ...overrides,
  };
}

describe("getEntryStatus", () => {
  it("returns 'not_started' for 0% completion", () => {
    expect(getEntryStatus(makeEntry())).toBe("not_started");
  });

  it("returns 'in_progress' for partial completion", () => {
    expect(getEntryStatus(makeEntry({ completionPercent: 42 }))).toBe(
      "in_progress",
    );
  });

  it("returns 'completed' when solved", () => {
    expect(
      getEntryStatus(makeEntry({ completionPercent: 100, isSolved: true })),
    ).toBe("completed");
  });

  it("returns 'completed' even at partial % if isSolved is true", () => {
    // Edge case: revealed puzzle might have isSolved=true
    expect(
      getEntryStatus(makeEntry({ completionPercent: 50, isSolved: true })),
    ).toBe("completed");
  });
});

describe("libraryStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useLibraryStore.setState({
      entries: [],
      loaded: false,
      sortField: "dateOpened",
      sortOrder: "desc",
      filterStatus: "all",
    });
  });

  it("starts with empty entries", () => {
    expect(useLibraryStore.getState().entries).toEqual([]);
  });

  it("addOrUpdateEntry adds a new entry", () => {
    const entry = makeEntry();
    useLibraryStore.getState().addOrUpdateEntry(entry);
    expect(useLibraryStore.getState().entries).toHaveLength(1);
    expect(useLibraryStore.getState().entries[0].title).toBe("Test Puzzle");
  });

  it("addOrUpdateEntry updates existing entry by filePath", () => {
    const entry = makeEntry({ completionPercent: 10 });
    useLibraryStore.getState().addOrUpdateEntry(entry);

    const updated = makeEntry({ completionPercent: 50 });
    useLibraryStore.getState().addOrUpdateEntry(updated);

    expect(useLibraryStore.getState().entries).toHaveLength(1);
    expect(useLibraryStore.getState().entries[0].completionPercent).toBe(50);
  });

  it("addOrUpdateEntry does not duplicate entries with different data", () => {
    useLibraryStore.getState().addOrUpdateEntry(makeEntry({ title: "V1" }));
    useLibraryStore.getState().addOrUpdateEntry(makeEntry({ title: "V2" })); // same filePath
    expect(useLibraryStore.getState().entries).toHaveLength(1);
    expect(useLibraryStore.getState().entries[0].title).toBe("V2");
  });

  it("adds multiple entries with different filePaths", () => {
    useLibraryStore
      .getState()
      .addOrUpdateEntry(makeEntry({ filePath: "/a.puz" }));
    useLibraryStore
      .getState()
      .addOrUpdateEntry(makeEntry({ filePath: "/b.puz" }));
    expect(useLibraryStore.getState().entries).toHaveLength(2);
  });

  it("removeEntry removes by filePath", () => {
    useLibraryStore
      .getState()
      .addOrUpdateEntry(makeEntry({ filePath: "/a.puz" }));
    useLibraryStore
      .getState()
      .addOrUpdateEntry(makeEntry({ filePath: "/b.puz" }));
    useLibraryStore.getState().removeEntry("/a.puz");
    expect(useLibraryStore.getState().entries).toHaveLength(1);
    expect(useLibraryStore.getState().entries[0].filePath).toBe("/b.puz");
  });

  it("removeEntry is a no-op for unknown filePath", () => {
    useLibraryStore
      .getState()
      .addOrUpdateEntry(makeEntry({ filePath: "/a.puz" }));
    useLibraryStore.getState().removeEntry("/nonexistent.puz");
    expect(useLibraryStore.getState().entries).toHaveLength(1);
  });
});

describe("filterAndSortEntries", () => {
  const entries: LibraryEntry[] = [
    makeEntry({
      filePath: "/a.puz",
      title: "Bravo",
      dateOpened: 1000,
      completionPercent: 0,
      isSolved: false,
    }),
    makeEntry({
      filePath: "/b.puz",
      title: "Alpha",
      dateOpened: 3000,
      completionPercent: 50,
      isSolved: false,
    }),
    makeEntry({
      filePath: "/c.puz",
      title: "Charlie",
      dateOpened: 2000,
      completionPercent: 100,
      isSolved: true,
    }),
  ];

  it("returns all entries when filter is 'all'", () => {
    const result = filterAndSortEntries(entries, "all", "dateOpened", "desc");
    expect(result).toHaveLength(3);
  });

  it("filters by 'in_progress'", () => {
    const result = filterAndSortEntries(
      entries,
      "in_progress",
      "dateOpened",
      "desc",
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Alpha");
  });

  it("filters by 'not_started'", () => {
    const result = filterAndSortEntries(
      entries,
      "not_started",
      "dateOpened",
      "desc",
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Bravo");
  });

  it("filters by 'completed'", () => {
    const result = filterAndSortEntries(
      entries,
      "completed",
      "dateOpened",
      "desc",
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Charlie");
  });

  it("sorts by dateOpened descending (default)", () => {
    const result = filterAndSortEntries(entries, "all", "dateOpened", "desc");
    expect(result.map((e) => e.title)).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("sorts by dateOpened ascending", () => {
    const result = filterAndSortEntries(entries, "all", "dateOpened", "asc");
    expect(result.map((e) => e.title)).toEqual(["Bravo", "Charlie", "Alpha"]);
  });

  it("sorts by title ascending", () => {
    const result = filterAndSortEntries(entries, "all", "title", "asc");
    expect(result.map((e) => e.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorts by title descending", () => {
    const result = filterAndSortEntries(entries, "all", "title", "desc");
    expect(result.map((e) => e.title)).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("sorts by status (in_progress first, then not_started, then completed)", () => {
    const result = filterAndSortEntries(entries, "all", "status", "asc");
    expect(result.map((e) => e.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("returns empty array when filter matches nothing", () => {
    const result = filterAndSortEntries(
      [makeEntry({ completionPercent: 0, isSolved: false })],
      "completed",
      "dateOpened",
      "desc",
    );
    expect(result).toHaveLength(0);
  });
});
