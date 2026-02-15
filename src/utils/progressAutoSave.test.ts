// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Puzzle, Cell, Clue } from "../types/puzzle";
import { DEFAULT_SETTINGS } from "../types/settings";

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

// Mock progressPersistence
const mockSaveProgress = vi.fn().mockResolvedValue(undefined);
vi.mock("../utils/progressPersistence", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../utils/progressPersistence")>();
  return {
    ...actual,
    saveProgress: mockSaveProgress,
  };
});

const { usePuzzleStore } = await import("../store/puzzleStore");
const { startAutoSave, stopAutoSave } =
  await import("../utils/progressAutoSave");

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
  const L = (num?: number, sol?: string) =>
    makeCell("letter", { number: num ?? null, solution: sol ?? "A" });
  const B = () => makeCell("black");

  const grid: Cell[][] = [
    [L(1), L(2), L(3)],
    [L(4), B(), L(5)],
    [L(6), L(7), L(8)],
  ];

  const across: Clue[] = [
    { number: 1, text: "1 across", row: 0, col: 0, length: 3 },
    { number: 6, text: "6 across", row: 2, col: 0, length: 3 },
  ];

  const down: Clue[] = [
    { number: 1, text: "1 down", row: 0, col: 0, length: 3 },
  ];

  return {
    title: "Test",
    author: "",
    copyright: "",
    notes: "",
    width: 3,
    height: 3,
    grid,
    clues: { across, down },
    has_solution: true,
    is_scrambled: false,
  };
}

describe("progressAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    usePuzzleStore.setState(usePuzzleStore.getInitialState());
    mockSaveProgress.mockClear();
  });

  afterEach(() => {
    stopAutoSave();
    vi.useRealTimers();
  });

  it("saves progress when puzzle state changes", () => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    startAutoSave("/test/puzzle.puz");

    // Trigger a cell value change
    usePuzzleStore.getState().setCellValue(0, 0, "X");

    // Debounce timer (1000ms)
    vi.advanceTimersByTime(1100);

    expect(mockSaveProgress).toHaveBeenCalled();
    const saved = mockSaveProgress.mock.calls[0][0];
    expect(saved.filePath).toBe("/test/puzzle.puz");
    expect(saved.title).toBe("Test");
  });

  it("does not save when only cursor changes", () => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    startAutoSave("/test/puzzle.puz");

    usePuzzleStore.getState().setCursor(1, 0);
    vi.advanceTimersByTime(1100);

    expect(mockSaveProgress).not.toHaveBeenCalled();
  });

  it("debounces rapid changes", () => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    startAutoSave("/test/puzzle.puz");

    usePuzzleStore.getState().setCellValue(0, 0, "A");
    vi.advanceTimersByTime(500);
    usePuzzleStore.getState().setCellValue(0, 1, "B");
    vi.advanceTimersByTime(500);
    usePuzzleStore.getState().setCellValue(0, 2, "C");
    vi.advanceTimersByTime(1100);

    // Should only save once after debounce
    expect(mockSaveProgress).toHaveBeenCalledTimes(1);
  });

  it("stopAutoSave prevents further saves", () => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    startAutoSave("/test/puzzle.puz");
    stopAutoSave();

    usePuzzleStore.getState().setCellValue(0, 0, "X");
    vi.advanceTimersByTime(1100);

    expect(mockSaveProgress).not.toHaveBeenCalled();
  });

  it("startAutoSave stops previous subscription", () => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    startAutoSave("/test/first.puz");
    startAutoSave("/test/second.puz");

    usePuzzleStore.getState().setCellValue(0, 0, "X");
    vi.advanceTimersByTime(1100);

    // Should save with the second file path only
    expect(mockSaveProgress).toHaveBeenCalledTimes(1);
    expect(mockSaveProgress.mock.calls[0][0].filePath).toBe("/test/second.puz");
  });

  it("saves when isSolved changes", () => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    startAutoSave("/test/puzzle.puz");

    usePuzzleStore.setState({ isSolved: true });
    vi.advanceTimersByTime(1100);

    expect(mockSaveProgress).toHaveBeenCalled();
    expect(mockSaveProgress.mock.calls[0][0].isSolved).toBe(true);
  });

  it("does not save stale data when a different puzzle is loaded before debounce fires", () => {
    // Start with puzzle A (3x3)
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    startAutoSave("/test/puzzleA.puz");

    // User types in puzzle A, triggering a debounced save
    usePuzzleStore.getState().setCellValue(0, 0, "X");

    // Before debounce fires (1000ms), user opens puzzle B with different dimensions
    const puzzleB = makeTestPuzzle();
    puzzleB.width = 5;
    puzzleB.height = 5;
    // Expand the grid to 5x5
    const L = (num?: number) =>
      makeCell("letter", { number: num ?? null, solution: "B" });
    puzzleB.grid = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => L()),
    );

    // Close puzzle A and open puzzle B
    stopAutoSave();
    usePuzzleStore.getState().loadPuzzle(puzzleB);
    startAutoSave("/test/puzzleB.puz");

    // Now advance past the original debounce timeout
    vi.advanceTimersByTime(1100);

    // Should NOT have saved puzzle B's data under puzzle A's path
    // Any saves should be for puzzle B's path only
    for (const call of mockSaveProgress.mock.calls) {
      expect(call[0].filePath).not.toBe("/test/puzzleA.puz");
    }
  });

  it("does not save when puzzle dimensions do not match expected", () => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    startAutoSave("/test/puzzle.puz");

    // Simulate a different puzzle being swapped in without going through startAutoSave
    const differentPuzzle = makeTestPuzzle();
    differentPuzzle.width = 5;
    differentPuzzle.height = 5;
    const L = () => makeCell("letter", { solution: "B" });
    differentPuzzle.grid = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => L()),
    );
    // Force-load a different-sized puzzle into the store
    usePuzzleStore.getState().loadPuzzle(differentPuzzle);

    vi.advanceTimersByTime(1100);

    // The dimension guard should prevent saving
    expect(mockSaveProgress).not.toHaveBeenCalled();
  });
});
