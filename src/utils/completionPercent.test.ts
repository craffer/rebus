import { describe, it, expect } from "vitest";
import { computeCompletionPercent } from "./completionPercent";
import type { Puzzle, Cell } from "../types/puzzle";

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

function makePuzzle(grid: Cell[][]): Puzzle {
  return {
    title: "Test",
    author: "",
    copyright: "",
    notes: "",
    width: grid[0].length,
    height: grid.length,
    grid,
    clues: { across: [], down: [] },
    has_solution: true,
    is_scrambled: false,
  };
}

describe("computeCompletionPercent", () => {
  it("returns 0 for an empty puzzle", () => {
    const grid = [[makeCell("letter"), makeCell("letter"), makeCell("letter")]];
    expect(computeCompletionPercent(makePuzzle(grid))).toBe(0);
  });

  it("returns 100 for a fully filled puzzle", () => {
    const grid = [
      [
        makeCell("letter", { player_value: "A" }),
        makeCell("letter", { player_value: "B" }),
      ],
    ];
    expect(computeCompletionPercent(makePuzzle(grid))).toBe(100);
  });

  it("returns correct percentage for partially filled puzzle", () => {
    const grid = [
      [
        makeCell("letter", { player_value: "A" }),
        makeCell("letter"),
        makeCell("letter"),
        makeCell("letter"),
      ],
    ];
    // 1 out of 4 = 25%
    expect(computeCompletionPercent(makePuzzle(grid))).toBe(25);
  });

  it("ignores black cells in calculation", () => {
    const grid = [
      [
        makeCell("letter", { player_value: "A" }),
        makeCell("black"),
        makeCell("letter"),
      ],
    ];
    // 1 out of 2 letter cells = 50%
    expect(computeCompletionPercent(makePuzzle(grid))).toBe(50);
  });

  it("returns 0 for a puzzle with only black cells", () => {
    const grid = [[makeCell("black"), makeCell("black")]];
    expect(computeCompletionPercent(makePuzzle(grid))).toBe(0);
  });

  it("rounds to nearest integer", () => {
    const grid = [
      [
        makeCell("letter", { player_value: "A" }),
        makeCell("letter"),
        makeCell("letter"),
      ],
    ];
    // 1 out of 3 = 33.33... → 33%
    expect(computeCompletionPercent(makePuzzle(grid))).toBe(33);
  });
});
