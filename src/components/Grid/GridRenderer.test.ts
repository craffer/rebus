import { describe, it, expect } from "vitest";
import { hitTest, computeCellSize, getCanvasDimensions } from "./GridRenderer";
import { BORDER_WIDTH, MIN_CELL_SIZE, MAX_CELL_SIZE } from "./constants";
import type { Puzzle, Cell } from "../../types/puzzle";

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

function makeSmallPuzzle(): Puzzle {
  return {
    title: "Test",
    author: "",
    copyright: "",
    notes: "",
    width: 3,
    height: 3,
    grid: [
      [
        makeCell("letter", { number: 1 }),
        makeCell("letter"),
        makeCell("letter"),
      ],
      [makeCell("letter"), makeCell("black"), makeCell("letter")],
      [makeCell("letter"), makeCell("letter"), makeCell("letter")],
    ],
    clues: {
      across: [{ number: 1, text: "Clue", row: 0, col: 0, length: 3 }],
      down: [{ number: 1, text: "Clue", row: 0, col: 0, length: 3 }],
    },
    has_solution: true,
    is_scrambled: false,
  };
}

describe("hitTest", () => {
  const puzzle = makeSmallPuzzle();
  const cellSize = 40;

  it("returns correct cell for click inside a letter cell", () => {
    const x = BORDER_WIDTH + 20;
    const y = BORDER_WIDTH + 20;
    expect(hitTest(x, y, puzzle, cellSize)).toEqual({ row: 0, col: 0 });
  });

  it("returns correct cell for different positions", () => {
    const x = BORDER_WIDTH + 2 * cellSize + 10;
    const y = BORDER_WIDTH + 5;
    expect(hitTest(x, y, puzzle, cellSize)).toEqual({ row: 0, col: 2 });
  });

  it("returns null for black cells", () => {
    const x = BORDER_WIDTH + cellSize + 20;
    const y = BORDER_WIDTH + cellSize + 20;
    expect(hitTest(x, y, puzzle, cellSize)).toBeNull();
  });

  it("returns null for clicks outside the grid (negative)", () => {
    expect(hitTest(-5, -5, puzzle, cellSize)).toBeNull();
  });

  it("returns null for clicks outside the grid (beyond bounds)", () => {
    const x = BORDER_WIDTH + 3 * cellSize + 10;
    const y = BORDER_WIDTH + 10;
    expect(hitTest(x, y, puzzle, cellSize)).toBeNull();
  });

  it("returns null for clicks in border area", () => {
    expect(hitTest(0, 0, puzzle, cellSize)).toBeNull();
  });
});

describe("computeCellSize", () => {
  it("returns a size that fits within container", () => {
    const size = computeCellSize(500, 500, 15, 15);
    expect(size).toBeGreaterThanOrEqual(MIN_CELL_SIZE);
    expect(size).toBeLessThanOrEqual(MAX_CELL_SIZE);
  });

  it("clamps to MIN_CELL_SIZE for tiny containers", () => {
    const size = computeCellSize(50, 50, 15, 15);
    expect(size).toBe(MIN_CELL_SIZE);
  });

  it("clamps to MAX_CELL_SIZE for huge containers", () => {
    const size = computeCellSize(5000, 5000, 3, 3);
    expect(size).toBe(MAX_CELL_SIZE);
  });

  it("constrains by the smaller dimension", () => {
    // Wide but short container — height should constrain
    const size = computeCellSize(2000, 200, 5, 5);
    const sizeSquare = computeCellSize(200, 200, 5, 5);
    expect(size).toBeGreaterThanOrEqual(sizeSquare);
  });
});

describe("getCanvasDimensions", () => {
  it("returns correct dimensions for a puzzle", () => {
    const puzzle = makeSmallPuzzle();
    const cellSize = 40;
    const dims = getCanvasDimensions(puzzle, cellSize);
    expect(dims.width).toBe(3 * 40 + 2 * BORDER_WIDTH);
    expect(dims.height).toBe(3 * 40 + 2 * BORDER_WIDTH);
  });
});
