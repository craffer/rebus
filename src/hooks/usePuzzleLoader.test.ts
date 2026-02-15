// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "../types/settings";
import type { Puzzle, Cell, Clue } from "../types/puzzle";

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock settings persistence
vi.mock("../utils/settingsPersistence", () => ({
  loadSettings: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
  saveSettings: vi.fn(),
  deepMerge: vi.fn(),
}));

// Mock @tauri-apps/plugin-dialog
const mockOpen = vi.fn();
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => mockOpen(...args),
}));

// Mock @tauri-apps/api/core
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock progressPersistence
const mockLoadProgress = vi.fn();
vi.mock("../utils/progressPersistence", () => ({
  loadProgress: (...args: unknown[]) => mockLoadProgress(...args),
  puzzleIdFromPath: vi.fn().mockReturnValue("test-id"),
  saveProgress: vi.fn(),
  deleteProgress: vi.fn(),
}));

// Mock progressAutoSave
const mockStartAutoSave = vi.fn().mockReturnValue(() => {});
const mockStopAutoSave = vi.fn();
vi.mock("../utils/progressAutoSave", () => ({
  startAutoSave: (...args: unknown[]) => mockStartAutoSave(...args),
  stopAutoSave: () => mockStopAutoSave(),
}));

const { usePuzzleStore } = await import("../store/puzzleStore");
const { usePuzzleLoader } = await import("./usePuzzleLoader");

function makeCell(kind: "black" | "letter", overrides?: Partial<Cell>): Cell {
  return {
    kind,
    number: null,
    solution: null,
    rebus_solution: null,
    player_value: null,
    is_circled: false,
    was_incorrect: false,
    is_revealed: false,
    ...overrides,
  };
}

function makeTestPuzzle(): Puzzle {
  const L = (num?: number) =>
    makeCell("letter", { number: num ?? null, solution: "A" });

  const grid: Cell[][] = [[L(1)]];
  const across: Clue[] = [
    { number: 1, text: "Clue", row: 0, col: 0, length: 1 },
  ];
  const down: Clue[] = [{ number: 1, text: "Clue", row: 0, col: 0, length: 1 }];

  return {
    title: "Test",
    author: "",
    copyright: "",
    notes: "",
    width: 1,
    height: 1,
    grid,
    clues: { across, down },
    has_solution: true,
    is_scrambled: false,
  };
}

describe("usePuzzleLoader", () => {
  beforeEach(() => {
    usePuzzleStore.setState(usePuzzleStore.getInitialState());
    mockOpen.mockReset();
    mockInvoke.mockReset();
    mockLoadProgress.mockReset();
    mockStartAutoSave.mockReset();
    mockStopAutoSave.mockReset();
  });

  it("returns initial state with no error and not loading", () => {
    const { result } = renderHook(() => usePuzzleLoader());
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.openPuzzleFile).toBe("function");
  });

  it("does nothing when user cancels file dialog", async () => {
    mockOpen.mockResolvedValue(null);
    const { result } = renderHook(() => usePuzzleLoader());

    await act(async () => {
      await result.current.openPuzzleFile();
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("loads puzzle and starts auto-save on success", async () => {
    const puzzle = makeTestPuzzle();
    mockOpen.mockResolvedValue("/test/puzzle.puz");
    mockInvoke.mockResolvedValue(puzzle);
    mockLoadProgress.mockResolvedValue(null);

    const { result } = renderHook(() => usePuzzleLoader());

    await act(async () => {
      await result.current.openPuzzleFile();
    });

    expect(mockStopAutoSave).toHaveBeenCalled();
    expect(mockInvoke).toHaveBeenCalledWith("open_puzzle", {
      filePath: "/test/puzzle.puz",
    });
    expect(mockStartAutoSave).toHaveBeenCalledWith("/test/puzzle.puz");
    expect(usePuzzleStore.getState().puzzle).not.toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("restores progress if saved progress exists", async () => {
    const puzzle = makeTestPuzzle();
    mockOpen.mockResolvedValue("/test/puzzle.puz");
    mockInvoke.mockResolvedValue(puzzle);
    mockLoadProgress.mockResolvedValue({
      puzzleId: "test-id",
      filePath: "/test/puzzle.puz",
      title: "Test",
      cellValues: ["X"],
      pencilCells: [],
      incorrectCells: [],
      revealedCells: [],
      elapsedSeconds: 42,
      isSolved: false,
      lastSaved: Date.now(),
    });

    const { result } = renderHook(() => usePuzzleLoader());

    await act(async () => {
      await result.current.openPuzzleFile();
    });

    expect(mockLoadProgress).toHaveBeenCalledWith("/test/puzzle.puz");
  });

  it("sets error when invoke fails", async () => {
    mockOpen.mockResolvedValue("/test/puzzle.puz");
    mockInvoke.mockRejectedValue(new Error("Parse failed"));

    const { result } = renderHook(() => usePuzzleLoader());

    await act(async () => {
      await result.current.openPuzzleFile();
    });

    expect(result.current.error).toBe("Parse failed");
    expect(result.current.loading).toBe(false);
  });

  it("sets error for non-Error rejection", async () => {
    mockOpen.mockResolvedValue("/test/puzzle.puz");
    mockInvoke.mockRejectedValue("string error");

    const { result } = renderHook(() => usePuzzleLoader());

    await act(async () => {
      await result.current.openPuzzleFile();
    });

    expect(result.current.error).toBe("string error");
  });
});
