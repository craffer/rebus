import { describe, it, expect, beforeEach } from "vitest";
import { usePuzzleStore, isClueComplete } from "./puzzleStore";
import type { Puzzle, Cell, Clue } from "../types/puzzle";

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
  const L = (num?: number, value?: string) =>
    makeCell("letter", {
      number: num ?? null,
      solution: "A",
      player_value: value ?? null,
    });
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

describe("isClueComplete", () => {
  it("returns false when no cells are filled", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0]; // 1-across, 5 cells
    expect(isClueComplete(puzzle, clue, "across")).toBe(false);
  });

  it("returns false when partially filled", () => {
    const puzzle = makeTestPuzzle();
    puzzle.grid[0][0].player_value = "A";
    puzzle.grid[0][1].player_value = "B";
    const clue = puzzle.clues.across[0];
    expect(isClueComplete(puzzle, clue, "across")).toBe(false);
  });

  it("returns true when all cells are filled", () => {
    const puzzle = makeTestPuzzle();
    for (let c = 0; c < 5; c++) {
      puzzle.grid[0][c].player_value = "X";
    }
    const clue = puzzle.clues.across[0];
    expect(isClueComplete(puzzle, clue, "across")).toBe(true);
  });

  it("works for down clues", () => {
    const puzzle = makeTestPuzzle();
    // 1-down: col 0, rows 0-4
    for (let r = 0; r < 5; r++) {
      puzzle.grid[r][0].player_value = "X";
    }
    const clue = puzzle.clues.down[0];
    expect(isClueComplete(puzzle, clue, "down")).toBe(true);
  });

  it("returns true for single-cell clue when filled", () => {
    const puzzle = makeTestPuzzle();
    puzzle.grid[1][0].player_value = "X";
    const clue = puzzle.clues.across[1]; // 6-across, 1 cell
    expect(isClueComplete(puzzle, clue, "across")).toBe(true);
  });

  it("returns false for single-cell clue when empty", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[1]; // 6-across, 1 cell
    expect(isClueComplete(puzzle, clue, "across")).toBe(false);
  });
});

describe("puzzleStore pause behavior", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("starts with timer running", () => {
    expect(usePuzzleStore.getState().timerRunning).toBe(true);
  });

  it("pauseTimer stops the timer", () => {
    usePuzzleStore.getState().pauseTimer();
    expect(usePuzzleStore.getState().timerRunning).toBe(false);
  });

  it("resumeTimer restarts the timer", () => {
    usePuzzleStore.getState().pauseTimer();
    usePuzzleStore.getState().resumeTimer();
    expect(usePuzzleStore.getState().timerRunning).toBe(true);
  });

  it("setCellValue still works when paused (store level)", () => {
    // The store itself doesn't block input — that's the keyboard handler's job
    usePuzzleStore.getState().pauseTimer();
    usePuzzleStore.getState().setCellValue(0, 0, "A");
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].player_value).toBe("A");
  });
});
