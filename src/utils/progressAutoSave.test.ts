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
const { startAutoSave, stopAutoSave } = await import(
  "../utils/progressAutoSave"
);

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
    expect(mockSaveProgress.mock.calls[0][0].filePath).toBe(
      "/test/second.puz",
    );
  });

  it("saves when isSolved changes", () => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    startAutoSave("/test/puzzle.puz");

    usePuzzleStore.setState({ isSolved: true });
    vi.advanceTimersByTime(1100);

    expect(mockSaveProgress).toHaveBeenCalled();
    expect(mockSaveProgress.mock.calls[0][0].isSolved).toBe(true);
  });
});
