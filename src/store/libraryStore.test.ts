import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useLibraryStore,
  getEntryStatus,
  getDisplayTitle,
  filterAndSortEntries,
} from "./libraryStore";
import type { LibraryEntry } from "../types/library";

// Mock Tauri plugins so the store doesn't try to hit the filesystem or logger
vi.mock("../utils/libraryPersistence", () => ({
  loadLibrary: vi.fn().mockResolvedValue([]),
  saveLibrary: vi.fn().mockResolvedValue(undefined),
  loadFolders: vi.fn().mockResolvedValue([]),
  saveFolders: vi.fn().mockResolvedValue(undefined),
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
    usedHelp: false,
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

describe("getDisplayTitle", () => {
  it("returns the original title when no custom title is set", () => {
    expect(getDisplayTitle(makeEntry({ title: "Original" }))).toBe("Original");
  });

  it("returns the custom title when set", () => {
    expect(
      getDisplayTitle(makeEntry({ title: "Original", customTitle: "My Name" })),
    ).toBe("My Name");
  });

  it("returns the original title when custom title is empty string", () => {
    expect(
      getDisplayTitle(makeEntry({ title: "Original", customTitle: "" })),
    ).toBe("Original");
  });
});

describe("libraryStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useLibraryStore.setState({
      entries: [],
      folders: [],
      loaded: false,
      sortField: "dateOpened",
      sortOrder: "desc",
      filterStatus: "all",
      currentFolderId: undefined,
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

  describe("renameEntry", () => {
    it("sets a custom title on an entry", () => {
      useLibraryStore.getState().addOrUpdateEntry(makeEntry());
      useLibraryStore.getState().renameEntry("/puzzles/test.puz", "My Puzzle");
      const entry = useLibraryStore.getState().entries[0];
      expect(entry.customTitle).toBe("My Puzzle");
    });

    it("clears custom title when given empty string", () => {
      useLibraryStore
        .getState()
        .addOrUpdateEntry(makeEntry({ customTitle: "Custom" }));
      useLibraryStore.getState().renameEntry("/puzzles/test.puz", "");
      const entry = useLibraryStore.getState().entries[0];
      expect(entry.customTitle).toBeUndefined();
    });

    it("is a no-op for unknown filePath", () => {
      useLibraryStore.getState().addOrUpdateEntry(makeEntry());
      useLibraryStore.getState().renameEntry("/unknown.puz", "New Name");
      expect(useLibraryStore.getState().entries[0].customTitle).toBeUndefined();
    });
  });

  describe("moveEntry", () => {
    it("moves an entry to a folder", () => {
      useLibraryStore.getState().addOrUpdateEntry(makeEntry());
      useLibraryStore.getState().moveEntry("/puzzles/test.puz", "folder-1");
      expect(useLibraryStore.getState().entries[0].folderId).toBe("folder-1");
    });

    it("moves an entry back to root", () => {
      useLibraryStore
        .getState()
        .addOrUpdateEntry(makeEntry({ folderId: "folder-1" }));
      useLibraryStore.getState().moveEntry("/puzzles/test.puz", undefined);
      expect(useLibraryStore.getState().entries[0].folderId).toBeUndefined();
    });
  });

  describe("folder management", () => {
    it("addFolder creates a new folder", () => {
      const folder = useLibraryStore.getState().addFolder("My Folder");
      expect(folder.name).toBe("My Folder");
      expect(folder.id).toMatch(/^folder-/);
      expect(useLibraryStore.getState().folders).toHaveLength(1);
    });

    it("addFolder creates a folder with parentId", () => {
      const parent = useLibraryStore.getState().addFolder("Parent");
      const child = useLibraryStore.getState().addFolder("Child", parent.id);
      expect(child.parentId).toBe(parent.id);
      expect(useLibraryStore.getState().folders).toHaveLength(2);
    });

    it("renameFolder updates the folder name", () => {
      const folder = useLibraryStore.getState().addFolder("Old Name");
      useLibraryStore.getState().renameFolder(folder.id, "New Name");
      expect(useLibraryStore.getState().folders[0].name).toBe("New Name");
    });

    it("removeFolder deletes the folder and moves entries to root", () => {
      const folder = useLibraryStore.getState().addFolder("To Delete");
      useLibraryStore
        .getState()
        .addOrUpdateEntry(makeEntry({ folderId: folder.id }));

      useLibraryStore.getState().removeFolder(folder.id);

      expect(useLibraryStore.getState().folders).toHaveLength(0);
      expect(useLibraryStore.getState().entries[0].folderId).toBeUndefined();
    });

    it("removeFolder resets currentFolderId if viewing the deleted folder", () => {
      const folder = useLibraryStore.getState().addFolder("Will Delete");
      useLibraryStore.getState().setCurrentFolder(folder.id);
      expect(useLibraryStore.getState().currentFolderId).toBe(folder.id);

      useLibraryStore.getState().removeFolder(folder.id);
      expect(useLibraryStore.getState().currentFolderId).toBeUndefined();
    });

    it("setCurrentFolder updates the current folder", () => {
      const folder = useLibraryStore.getState().addFolder("Browse");
      useLibraryStore.getState().setCurrentFolder(folder.id);
      expect(useLibraryStore.getState().currentFolderId).toBe(folder.id);

      useLibraryStore.getState().setCurrentFolder(undefined);
      expect(useLibraryStore.getState().currentFolderId).toBeUndefined();
    });
  });
});

describe("filterAndSortEntries", () => {
  // All entries at root level (no folderId)
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

  it("returns all root entries when filter is 'all'", () => {
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

  it("sorts by title using customTitle when set", () => {
    const entriesWithCustom = [
      makeEntry({ filePath: "/a.puz", title: "Zebra", customTitle: "AAA" }),
      makeEntry({ filePath: "/b.puz", title: "Alpha" }),
    ];
    const result = filterAndSortEntries(
      entriesWithCustom,
      "all",
      "title",
      "asc",
    );
    expect(result.map((e) => e.filePath)).toEqual(["/a.puz", "/b.puz"]);
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

  it("filters entries by folderId", () => {
    const folderEntries = [
      makeEntry({ filePath: "/a.puz", folderId: "folder-1" }),
      makeEntry({ filePath: "/b.puz", folderId: undefined }),
      makeEntry({ filePath: "/c.puz", folderId: "folder-1" }),
    ];
    const rootResult = filterAndSortEntries(
      folderEntries,
      "all",
      "dateOpened",
      "desc",
    );
    expect(rootResult).toHaveLength(1);
    expect(rootResult[0].filePath).toBe("/b.puz");

    const folderResult = filterAndSortEntries(
      folderEntries,
      "all",
      "dateOpened",
      "desc",
      "folder-1",
    );
    expect(folderResult).toHaveLength(2);
  });

  it("sorts by manual order ascending", () => {
    const manualEntries = [
      makeEntry({ filePath: "/a.puz", title: "Third", manualOrder: 2 }),
      makeEntry({ filePath: "/b.puz", title: "First", manualOrder: 0 }),
      makeEntry({ filePath: "/c.puz", title: "Second", manualOrder: 1 }),
    ];
    const result = filterAndSortEntries(manualEntries, "all", "manual", "asc");
    expect(result.map((e) => e.title)).toEqual(["First", "Second", "Third"]);
  });

  it("sorts by manual order with undefined treated as 0", () => {
    const manualEntries = [
      makeEntry({ filePath: "/a.puz", title: "B", manualOrder: 1 }),
      makeEntry({ filePath: "/b.puz", title: "A" }), // no manualOrder
    ];
    const result = filterAndSortEntries(manualEntries, "all", "manual", "asc");
    expect(result.map((e) => e.title)).toEqual(["A", "B"]);
  });
});

describe("reorderEntry", () => {
  beforeEach(() => {
    useLibraryStore.setState({
      entries: [],
      folders: [],
      loaded: false,
      sortField: "manual",
      sortOrder: "asc",
      filterStatus: "all",
      currentFolderId: undefined,
    });
  });

  it("reorders an entry before a target", () => {
    const store = useLibraryStore.getState();
    store.addOrUpdateEntry(
      makeEntry({
        filePath: "/a.puz",
        title: "A",
        dateOpened: 3000,
        manualOrder: 0,
      }),
    );
    store.addOrUpdateEntry(
      makeEntry({
        filePath: "/b.puz",
        title: "B",
        dateOpened: 2000,
        manualOrder: 1,
      }),
    );
    store.addOrUpdateEntry(
      makeEntry({
        filePath: "/c.puz",
        title: "C",
        dateOpened: 1000,
        manualOrder: 2,
      }),
    );

    // Move C before A
    useLibraryStore.getState().reorderEntry("/c.puz", "/a.puz", "before");

    const entries = useLibraryStore.getState().entries;
    const sorted = [...entries]
      .filter((e) => e.folderId === undefined)
      .sort((a, b) => (a.manualOrder ?? 0) - (b.manualOrder ?? 0));
    expect(sorted.map((e) => e.title)).toEqual(["C", "A", "B"]);
  });

  it("reorders an entry after a target", () => {
    const store = useLibraryStore.getState();
    store.addOrUpdateEntry(
      makeEntry({
        filePath: "/a.puz",
        title: "A",
        dateOpened: 3000,
        manualOrder: 0,
      }),
    );
    store.addOrUpdateEntry(
      makeEntry({
        filePath: "/b.puz",
        title: "B",
        dateOpened: 2000,
        manualOrder: 1,
      }),
    );
    store.addOrUpdateEntry(
      makeEntry({
        filePath: "/c.puz",
        title: "C",
        dateOpened: 1000,
        manualOrder: 2,
      }),
    );

    // Move A after C
    useLibraryStore.getState().reorderEntry("/a.puz", "/c.puz", "after");

    const entries = useLibraryStore.getState().entries;
    const sorted = [...entries]
      .filter((e) => e.folderId === undefined)
      .sort((a, b) => (a.manualOrder ?? 0) - (b.manualOrder ?? 0));
    expect(sorted.map((e) => e.title)).toEqual(["B", "C", "A"]);
  });

  it("is a no-op when dragging onto self", () => {
    const store = useLibraryStore.getState();
    store.addOrUpdateEntry(
      makeEntry({ filePath: "/a.puz", title: "A", manualOrder: 0 }),
    );
    store.addOrUpdateEntry(
      makeEntry({ filePath: "/b.puz", title: "B", manualOrder: 1 }),
    );

    useLibraryStore.getState().reorderEntry("/a.puz", "/a.puz", "before");

    const entries = useLibraryStore.getState().entries;
    const a = entries.find((e) => e.filePath === "/a.puz");
    expect(a?.manualOrder).toBe(0);
  });

  it("initializes manualOrder from dateOpened when entries lack it", () => {
    const store = useLibraryStore.getState();
    store.addOrUpdateEntry(
      makeEntry({ filePath: "/a.puz", title: "A", dateOpened: 1000 }),
    );
    store.addOrUpdateEntry(
      makeEntry({ filePath: "/b.puz", title: "B", dateOpened: 3000 }),
    );
    store.addOrUpdateEntry(
      makeEntry({ filePath: "/c.puz", title: "C", dateOpened: 2000 }),
    );

    // Move A after B — this should first initialize manualOrder from dateOpened desc
    useLibraryStore.getState().reorderEntry("/a.puz", "/b.puz", "after");

    const entries = useLibraryStore.getState().entries;
    // All entries should now have manualOrder defined
    for (const e of entries) {
      expect(e.manualOrder).toBeDefined();
    }
  });
});
