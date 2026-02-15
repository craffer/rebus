// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Puzzle, Cell, Clue } from "../types/puzzle";
import { DEFAULT_SETTINGS } from "../types/settings";

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock settings persistence (needed by settingsStore import chain)
vi.mock("../utils/settingsPersistence", () => ({
  loadSettings: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
  saveSettings: vi.fn(),
  deepMerge: vi.fn(),
}));

const { usePuzzleStore } = await import("../store/puzzleStore");
const { useSettingsStore } = await import("../store/settingsStore");
const { useKeyboardNavigation } = await import("./useKeyboardNavigation");

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
    [L(1), L(2), L(3), L(4), L(5)],
    [L(6), B(), L(7), B(), L(8)],
    [L(9), L(10), L(11), L(12), L(13)],
    [L(14), B(), L(15), B(), L(16)],
    [L(17), L(18), L(19), L(20), L(21)],
  ];

  const across: Clue[] = [
    { number: 1, text: "1 across", row: 0, col: 0, length: 5 },
    { number: 6, text: "6 across", row: 1, col: 0, length: 1 },
    { number: 9, text: "9 across", row: 2, col: 0, length: 5 },
    { number: 17, text: "17 across", row: 4, col: 0, length: 5 },
  ];

  const down: Clue[] = [
    { number: 1, text: "1 down", row: 0, col: 0, length: 5 },
    { number: 3, text: "3 down", row: 0, col: 2, length: 5 },
    { number: 5, text: "5 down", row: 0, col: 4, length: 5 },
  ];

  return {
    title: "Test Puzzle",
    author: "Test",
    copyright: "",
    notes: "",
    width: 5,
    height: 5,
    grid,
    clues: { across, down },
    has_solution: true,
    is_scrambled: false,
  };
}

function pressKey(key: string, opts?: Partial<KeyboardEventInit>) {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, ...opts }),
  );
}

let cleanup: (() => void) | undefined;

describe("useKeyboardNavigation", () => {
  beforeEach(() => {
    usePuzzleStore.setState(usePuzzleStore.getInitialState());
    useSettingsStore.setState({
      settings: structuredClone(DEFAULT_SETTINGS),
      _loaded: true,
    });
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    const { unmount } = renderHook(() => useKeyboardNavigation());
    cleanup = unmount;
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  // ── letter input ──────────────────────────────────────────────────

  it("types a letter into the current cell", () => {
    pressKey("a");
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].player_value).toBe("A");
  });

  it("auto-advances cursor after typing", () => {
    pressKey("a");
    expect(usePuzzleStore.getState().cursor).toEqual({ row: 0, col: 1 });
  });

  it("uppercases letter input", () => {
    pressKey("z");
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].player_value).toBe("Z");
  });

  it("ignores non-letter characters", () => {
    pressKey("1");
    expect(
      usePuzzleStore.getState().puzzle!.grid[0][0].player_value,
    ).toBeNull();
  });

  it("ignores letters with modifier keys", () => {
    pressKey("a", { metaKey: true });
    expect(
      usePuzzleStore.getState().puzzle!.grid[0][0].player_value,
    ).toBeNull();
  });

  // ── arrow keys ────────────────────────────────────────────────────

  it("ArrowRight toggles to across direction (stay behavior)", () => {
    usePuzzleStore.getState().setDirection("down");
    usePuzzleStore.getState().setCursor(0, 0);
    pressKey("ArrowRight");
    expect(usePuzzleStore.getState().direction).toBe("across");
  });

  it("ArrowDown moves cursor down", () => {
    usePuzzleStore.getState().setCursor(0, 0);
    usePuzzleStore.getState().setDirection("down");
    pressKey("ArrowDown");
    expect(usePuzzleStore.getState().cursor.row).toBeGreaterThan(0);
  });

  // ── backspace ─────────────────────────────────────────────────────

  it("Backspace clears current cell if filled", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    usePuzzleStore.getState().setCursor(0, 0);
    pressKey("Backspace");
    expect(
      usePuzzleStore.getState().puzzle!.grid[0][0].player_value,
    ).toBeNull();
    expect(usePuzzleStore.getState().cursor).toEqual({ row: 0, col: 0 });
  });

  it("Backspace moves back if current cell is empty", () => {
    usePuzzleStore.getState().setCursor(0, 1);
    usePuzzleStore.getState().setDirection("across");
    pressKey("Backspace");
    expect(usePuzzleStore.getState().cursor).toEqual({ row: 0, col: 0 });
  });

  // ── space ─────────────────────────────────────────────────────────

  it("Space clears cell and advances (default clear_advance)", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    usePuzzleStore.getState().setCursor(0, 0);
    pressKey(" ");
    expect(
      usePuzzleStore.getState().puzzle!.grid[0][0].player_value,
    ).toBeNull();
    expect(usePuzzleStore.getState().cursor).toEqual({ row: 0, col: 1 });
  });

  it("Space toggles direction when configured", () => {
    useSettingsStore.getState().updateNavigation({
      spacebar_behavior: "toggle_direction",
    });
    usePuzzleStore.getState().setCursor(0, 0);
    pressKey(" ");
    expect(usePuzzleStore.getState().direction).toBe("down");
  });

  // ── delete ────────────────────────────────────────────────────────

  it("Delete clears current cell without moving", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    usePuzzleStore.getState().setCursor(0, 0);
    pressKey("Delete");
    expect(
      usePuzzleStore.getState().puzzle!.grid[0][0].player_value,
    ).toBeNull();
    expect(usePuzzleStore.getState().cursor).toEqual({ row: 0, col: 0 });
  });

  // ── rebus mode ────────────────────────────────────────────────────

  it("Escape activates rebus mode", () => {
    pressKey("Escape");
    expect(usePuzzleStore.getState().isRebusMode).toBe(true);
  });

  it("in rebus mode, letters accumulate", () => {
    pressKey("Escape");
    pressKey("t");
    pressKey("h");
    pressKey("e");
    expect(usePuzzleStore.getState().rebusInput).toBe("THE");
  });

  it("in rebus mode, Backspace removes last char", () => {
    pressKey("Escape");
    pressKey("a");
    pressKey("b");
    pressKey("Backspace");
    expect(usePuzzleStore.getState().rebusInput).toBe("A");
  });

  it("in rebus mode, Enter confirms", () => {
    pressKey("Escape");
    pressKey("t");
    pressKey("h");
    pressKey("Enter");
    expect(usePuzzleStore.getState().isRebusMode).toBe(false);
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].player_value).toBe(
      "TH",
    );
  });

  it("in rebus mode, Escape cancels", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    pressKey("Escape"); // enter
    pressKey("a");
    pressKey("b");
    pressKey("Escape"); // cancel
    expect(usePuzzleStore.getState().isRebusMode).toBe(false);
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].player_value).toBe("X");
  });

  // ── paused state ──────────────────────────────────────────────────

  it("blocks all input when timer is paused", () => {
    usePuzzleStore.getState().pauseTimer();
    pressKey("a");
    expect(
      usePuzzleStore.getState().puzzle!.grid[0][0].player_value,
    ).toBeNull();
  });

  // ── solved state ──────────────────────────────────────────────────

  it("blocks all input when puzzle is solved", () => {
    usePuzzleStore.setState({ isSolved: true });
    pressKey("a");
    expect(
      usePuzzleStore.getState().puzzle!.grid[0][0].player_value,
    ).toBeNull();
  });

  // ── tab ───────────────────────────────────────────────────────────

  it("Tab advances to next clue", () => {
    usePuzzleStore.getState().setCursor(0, 0);
    usePuzzleStore.getState().setDirection("across");
    pressKey("Tab");
    const state = usePuzzleStore.getState();
    expect(state.cursor.row).toBe(1);
    expect(state.cursor.col).toBe(0);
  });

  it("Shift+Tab goes to previous clue", () => {
    usePuzzleStore.getState().setCursor(2, 0);
    usePuzzleStore.getState().setDirection("across");
    pressKey("Tab", { shiftKey: true });
    const state = usePuzzleStore.getState();
    expect(state.cursor.row).toBe(1);
    expect(state.cursor.col).toBe(0);
  });

  // ── skip-filled disabled when puzzle is fully filled ────────────

  it("Tab does not skip filled clues when puzzle is fully filled", () => {
    const puzzle = usePuzzleStore.getState().puzzle!;
    // Fill every letter cell with a value
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        if (puzzle.grid[r][c].kind === "letter") {
          usePuzzleStore.getState().setCellValue(r, c, "Z"); // wrong answer
        }
      }
    }

    // Enable skip completed clues
    useSettingsStore.getState().updateNavigation({
      tab_skip_completed_clues: "all_filled",
    });

    usePuzzleStore.getState().setCursor(0, 0);
    usePuzzleStore.getState().setDirection("across");
    pressKey("Tab");

    const state = usePuzzleStore.getState();
    // Should advance to the next clue (6-across at row 1, col 0),
    // NOT get stuck on 1-across
    expect(state.cursor.row).toBe(1);
    expect(state.cursor.col).toBe(0);
  });

  it("Enter does not skip filled clues when puzzle is fully filled", () => {
    const puzzle = usePuzzleStore.getState().puzzle!;
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        if (puzzle.grid[r][c].kind === "letter") {
          usePuzzleStore.getState().setCellValue(r, c, "Z");
        }
      }
    }

    useSettingsStore.getState().updateNavigation({
      tab_skip_completed_clues: "all_filled",
    });

    usePuzzleStore.getState().setCursor(0, 0);
    usePuzzleStore.getState().setDirection("across");
    pressKey("Enter");

    const state = usePuzzleStore.getState();
    expect(state.cursor.row).toBe(1);
    expect(state.cursor.col).toBe(0);
  });

  it("Tab still skips filled clues when puzzle is NOT fully filled", () => {
    // Fill only the 6-across clue (single cell at row 1, col 0)
    usePuzzleStore.getState().setCellValue(1, 0, "A");

    useSettingsStore.getState().updateNavigation({
      tab_skip_completed_clues: "all_filled",
    });

    usePuzzleStore.getState().setCursor(0, 0);
    usePuzzleStore.getState().setDirection("across");
    pressKey("Tab");

    const state = usePuzzleStore.getState();
    // Should skip 6-across (filled) and land on 9-across (row 2, col 0)
    expect(state.cursor.row).toBe(2);
    expect(state.cursor.col).toBe(0);
  });

  // ── skip-filled-cells disabled when puzzle is fully filled ──────

  it("typing does not skip filled cells when puzzle is fully filled", () => {
    const puzzle = usePuzzleStore.getState().puzzle!;
    // Fill every letter cell with wrong answers
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        if (puzzle.grid[r][c].kind === "letter") {
          usePuzzleStore.getState().setCellValue(r, c, "Z");
        }
      }
    }

    useSettingsStore.getState().updateNavigation({
      skip_filled_cells: "all_filled",
    });

    usePuzzleStore.getState().setCursor(0, 0);
    usePuzzleStore.getState().setDirection("across");
    pressKey("a");

    const state = usePuzzleStore.getState();
    // Should advance to (0,1) — NOT skip over filled cells
    expect(state.cursor).toEqual({ row: 0, col: 1 });
  });

  it("typing still skips filled cells when puzzle is NOT fully filled", () => {
    // Fill cells (0,1) and (0,2)
    usePuzzleStore.getState().setCellValue(0, 1, "B");
    usePuzzleStore.getState().setCellValue(0, 2, "C");

    useSettingsStore.getState().updateNavigation({
      skip_filled_cells: "all_filled",
    });

    usePuzzleStore.getState().setCursor(0, 0);
    usePuzzleStore.getState().setDirection("across");
    pressKey("a");

    const state = usePuzzleStore.getState();
    // Should skip (0,1) and (0,2) and land on (0,3)
    expect(state.cursor).toEqual({ row: 0, col: 3 });
  });
});
