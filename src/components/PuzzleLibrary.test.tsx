import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import PuzzleLibrary from "./PuzzleLibrary";
import { useLibraryStore } from "../store/libraryStore";
import type { LibraryEntry, LibraryFolder } from "../types/library";

// Mock libraryStore
vi.mock("../store/libraryStore", () => ({
  useLibraryStore: vi.fn(),
  getEntryStatus: vi.fn((entry: LibraryEntry) =>
    entry.isSolved
      ? "completed"
      : entry.completionPercent > 0
        ? "in_progress"
        : "not_started",
  ),
  getDisplayTitle: vi.fn(
    (entry: LibraryEntry) => entry.customTitle || entry.title,
  ),
  filterAndSortEntries: vi.fn((entries) => entries),
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

function makeFolder(overrides: Partial<LibraryFolder> = {}): LibraryFolder {
  return {
    id: "folder-1",
    name: "Test Folder",
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("PuzzleLibrary drag-drop", () => {
  const mockMoveEntry = vi.fn();
  const mockOnOpenPuzzle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useLibraryStore as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector: (state: any) => any) => {
        const state = {
          entries: [],
          folders: [],
          loaded: true,
          sortField: "dateOpened" as const,
          sortOrder: "desc" as const,
          filterStatus: "all" as const,
          currentFolderId: undefined,
          setSortField: vi.fn(),
          setSortOrder: vi.fn(),
          setFilterStatus: vi.fn(),
          removeEntry: vi.fn(),
          renameEntry: vi.fn(),
          moveEntry: mockMoveEntry,
          addFolder: vi.fn(),
          renameFolder: vi.fn(),
          removeFolder: vi.fn(),
          setCurrentFolder: vi.fn(),
        };
        return selector(state);
      },
    );
  });

  it("moves a puzzle into a folder on mouse drag-drop", () => {
    const entry = makeEntry({ filePath: "/test.puz" });
    const folder = makeFolder({ id: "folder-1", name: "My Folder" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useLibraryStore as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector: (state: any) => any) => {
        const state = {
          entries: [entry],
          folders: [folder],
          loaded: true,
          sortField: "dateOpened" as const,
          sortOrder: "desc" as const,
          filterStatus: "all" as const,
          currentFolderId: undefined,
          setSortField: vi.fn(),
          setSortOrder: vi.fn(),
          setFilterStatus: vi.fn(),
          removeEntry: vi.fn(),
          renameEntry: vi.fn(),
          moveEntry: mockMoveEntry,
          addFolder: vi.fn(),
          renameFolder: vi.fn(),
          removeFolder: vi.fn(),
          setCurrentFolder: vi.fn(),
        };
        return selector(state);
      },
    );

    const { container } = render(
      <PuzzleLibrary onOpenPuzzle={mockOnOpenPuzzle} loading={false} />,
    );

    const cards = container.querySelectorAll("div[role='button']");
    const folderCard = cards[0]; // Folder is first
    const puzzleCard = cards[1]; // Puzzle is second

    // Simulate drag: mousedown on puzzle, mousemove to exceed threshold, mouseup on folder
    fireEvent.mouseDown(puzzleCard, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 110, clientY: 110 }); // Move > 5px to activate drag
    fireEvent.mouseMove(folderCard); // Move over folder
    fireEvent.mouseUp(folderCard); // Drop on folder

    expect(mockMoveEntry).toHaveBeenCalledWith("/test.puz", "folder-1");
  });

  it("does not move puzzle if drag threshold is not exceeded", () => {
    const entry = makeEntry({ filePath: "/test.puz" });
    const folder = makeFolder({ id: "folder-1", name: "My Folder" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useLibraryStore as any).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector: (state: any) => any) => {
        const state = {
          entries: [entry],
          folders: [folder],
          loaded: true,
          sortField: "dateOpened" as const,
          sortOrder: "desc" as const,
          filterStatus: "all" as const,
          currentFolderId: undefined,
          setSortField: vi.fn(),
          setSortOrder: vi.fn(),
          setFilterStatus: vi.fn(),
          removeEntry: vi.fn(),
          renameEntry: vi.fn(),
          moveEntry: mockMoveEntry,
          addFolder: vi.fn(),
          renameFolder: vi.fn(),
          removeFolder: vi.fn(),
          setCurrentFolder: vi.fn(),
        };
        return selector(state);
      },
    );

    const { container } = render(
      <PuzzleLibrary onOpenPuzzle={mockOnOpenPuzzle} loading={false} />,
    );

    const cards = container.querySelectorAll("div[role='button']");
    const folderCard = cards[0]; // Folder is first
    const puzzleCard = cards[1]; // Puzzle is second

    // Simulate small movement (below threshold)
    fireEvent.mouseDown(puzzleCard, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 102, clientY: 102 }); // Move < 5px
    fireEvent.mouseUp(folderCard);

    expect(mockMoveEntry).not.toHaveBeenCalled();
  });
});
