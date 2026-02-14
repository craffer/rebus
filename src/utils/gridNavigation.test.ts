import { describe, it, expect } from "vitest";
import type { Puzzle, Cell, Clue } from "../types/puzzle";
import {
  isLetterCell,
  isFilled,
  getNextCellInWord,
  getPreviousCellInWord,
  getAdjacentCell,
  findClueAtPosition,
  getFirstBlankInWord,
  getNextClue,
  getPreviousClue,
  getNextCellAfterInput,
  isClueComplete,
} from "./gridNavigation";
import type { NavigationSettings } from "../types/settings";

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

/**
 * Build a small 5x5 puzzle for testing:
 * L L L L L
 * L B L B L
 * L L L L L
 * L B L B L
 * L L L L L
 */
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
    { number: 7, text: "7 across", row: 1, col: 2, length: 1 },
    { number: 8, text: "8 across", row: 1, col: 4, length: 1 },
    { number: 9, text: "9 across", row: 2, col: 0, length: 5 },
    { number: 14, text: "14 across", row: 3, col: 0, length: 1 },
    { number: 15, text: "15 across", row: 3, col: 2, length: 1 },
    { number: 16, text: "16 across", row: 3, col: 4, length: 1 },
    { number: 17, text: "17 across", row: 4, col: 0, length: 5 },
  ];

  const down: Clue[] = [
    { number: 1, text: "1 down", row: 0, col: 0, length: 5 },
    { number: 2, text: "2 down", row: 0, col: 1, length: 1 },
    { number: 3, text: "3 down", row: 0, col: 2, length: 5 },
    { number: 4, text: "4 down", row: 0, col: 3, length: 1 },
    { number: 5, text: "5 down", row: 0, col: 4, length: 5 },
    { number: 10, text: "10 down", row: 2, col: 1, length: 1 },
    { number: 12, text: "12 down", row: 2, col: 3, length: 1 },
    { number: 18, text: "18 down", row: 4, col: 1, length: 1 },
    { number: 20, text: "20 down", row: 4, col: 3, length: 1 },
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

const defaultNavSettings: NavigationSettings = {
  arrow_key_behavior: "stay",
  spacebar_behavior: "clear_advance",
  backspace_into_previous_word: false,
  skip_filled_cells: "all_filled",
  end_of_word_action: "stop",
  tab_skip_completed_clues: "ink_only",
  scroll_clue_to_top: true,
};

describe("isLetterCell", () => {
  it("returns true for letter cells", () => {
    const puzzle = makeTestPuzzle();
    expect(isLetterCell(puzzle, 0, 0)).toBe(true);
  });

  it("returns false for black cells", () => {
    const puzzle = makeTestPuzzle();
    expect(isLetterCell(puzzle, 1, 1)).toBe(false);
  });

  it("returns false for out-of-bounds", () => {
    const puzzle = makeTestPuzzle();
    expect(isLetterCell(puzzle, -1, 0)).toBe(false);
    expect(isLetterCell(puzzle, 0, 5)).toBe(false);
  });
});

describe("isFilled", () => {
  it("returns false for empty cells", () => {
    const puzzle = makeTestPuzzle();
    expect(isFilled(puzzle, 0, 0)).toBe(false);
  });

  it("returns true for cells with player value", () => {
    const puzzle = makeTestPuzzle();
    puzzle.grid[0][0].player_value = "A";
    expect(isFilled(puzzle, 0, 0)).toBe(true);
  });
});

describe("getNextCellInWord", () => {
  it("returns next cell in an across word", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0]; // 1-across, row 0, 5 cells
    const next = getNextCellInWord(puzzle, clue, "across", 0, 0);
    expect(next).toEqual({ row: 0, col: 1 });
  });

  it("returns null at end of word", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0];
    const next = getNextCellInWord(puzzle, clue, "across", 0, 4);
    expect(next).toBeNull();
  });

  it("skips filled cells when shouldSkipCell is provided", () => {
    const puzzle = makeTestPuzzle();
    puzzle.grid[0][1].player_value = "B";
    const clue = puzzle.clues.across[0];
    const skipFilled = (r: number, c: number) =>
      puzzle.grid[r][c].player_value !== null;
    const next = getNextCellInWord(puzzle, clue, "across", 0, 0, skipFilled);
    expect(next).toEqual({ row: 0, col: 2 });
  });
});

describe("getPreviousCellInWord", () => {
  it("returns previous cell", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0];
    const prev = getPreviousCellInWord(puzzle, clue, "across", 0, 2);
    expect(prev).toEqual({ row: 0, col: 1 });
  });

  it("returns null at start of word", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0];
    const prev = getPreviousCellInWord(puzzle, clue, "across", 0, 0);
    expect(prev).toBeNull();
  });
});

describe("getAdjacentCell", () => {
  it("moves right", () => {
    const puzzle = makeTestPuzzle();
    const next = getAdjacentCell(puzzle, 0, 0, 0, 1);
    expect(next).toEqual({ row: 0, col: 1 });
  });

  it("skips over black cells", () => {
    const puzzle = makeTestPuzzle();
    // From (1,0), moving right should skip (1,1) which is black
    const next = getAdjacentCell(puzzle, 1, 0, 0, 1);
    expect(next).toEqual({ row: 1, col: 2 });
  });

  it("returns null at edge of grid", () => {
    const puzzle = makeTestPuzzle();
    const next = getAdjacentCell(puzzle, 0, 4, 0, 1);
    expect(next).toBeNull();
  });
});

describe("findClueAtPosition", () => {
  it("finds across clue", () => {
    const puzzle = makeTestPuzzle();
    const clue = findClueAtPosition(puzzle, 0, 2, "across");
    expect(clue?.number).toBe(1);
  });

  it("finds down clue", () => {
    const puzzle = makeTestPuzzle();
    const clue = findClueAtPosition(puzzle, 2, 0, "down");
    expect(clue?.number).toBe(1);
  });

  it("returns null for black cell", () => {
    const puzzle = makeTestPuzzle();
    const clue = findClueAtPosition(puzzle, 1, 1, "across");
    expect(clue).toBeNull();
  });
});

describe("getFirstBlankInWord", () => {
  it("finds first blank cell", () => {
    const puzzle = makeTestPuzzle();
    puzzle.grid[0][0].player_value = "A";
    const clue = puzzle.clues.across[0];
    const blank = getFirstBlankInWord(puzzle, clue, "across");
    expect(blank).toEqual({ row: 0, col: 1 });
  });

  it("returns null when word is fully filled", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0];
    for (let i = 0; i < 5; i++) {
      puzzle.grid[0][i].player_value = "A";
    }
    const blank = getFirstBlankInWord(puzzle, clue, "across");
    expect(blank).toBeNull();
  });
});

describe("getNextClue / getPreviousClue", () => {
  it("advances to next across clue", () => {
    const puzzle = makeTestPuzzle();
    const { clue, direction } = getNextClue(
      puzzle,
      "across",
      puzzle.clues.across[0],
    );
    expect(clue.number).toBe(6);
    expect(direction).toBe("across");
  });

  it("wraps from last across to first down", () => {
    const puzzle = makeTestPuzzle();
    const lastAcross = puzzle.clues.across[puzzle.clues.across.length - 1];
    const { clue, direction } = getNextClue(puzzle, "across", lastAcross);
    expect(clue.number).toBe(1);
    expect(direction).toBe("down");
  });

  it("goes to previous clue", () => {
    const puzzle = makeTestPuzzle();
    const { clue } = getPreviousClue(puzzle, "across", puzzle.clues.across[1]);
    expect(clue.number).toBe(1);
  });
});

describe("getNextCellAfterInput", () => {
  it("advances to next cell in word", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0];
    const result = getNextCellAfterInput(
      puzzle,
      clue,
      "across",
      0,
      0,
      defaultNavSettings,
    );
    expect(result).toEqual({
      cursor: { row: 0, col: 1 },
      direction: "across",
    });
  });

  it("stops at end of word with stop action", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0];
    // Fill all cells except the last so we're at position 4
    const result = getNextCellAfterInput(
      puzzle,
      clue,
      "across",
      0,
      4,
      defaultNavSettings,
    );
    expect(result).toBeNull();
  });

  it("jumps to next clue at end of word", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0];
    const settings: NavigationSettings = {
      ...defaultNavSettings,
      end_of_word_action: "jump_to_next_clue",
    };
    const result = getNextCellAfterInput(
      puzzle,
      clue,
      "across",
      0,
      4,
      settings,
    );
    expect(result).not.toBeNull();
    expect(result!.cursor.row).toBe(1);
    expect(result!.cursor.col).toBe(0);
  });
});

describe("isClueComplete", () => {
  it("returns false when cells are empty", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0]; // 1-across, 5 cells
    expect(isClueComplete(puzzle, clue, "across", {}, false)).toBe(false);
  });

  it("returns true when all cells are filled", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0];
    for (let i = 0; i < 5; i++) {
      puzzle.grid[0][i].player_value = "A";
    }
    expect(isClueComplete(puzzle, clue, "across", {}, false)).toBe(true);
  });

  it("returns false with onlyInk when some cells are penciled", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0];
    for (let i = 0; i < 5; i++) {
      puzzle.grid[0][i].player_value = "A";
    }
    const pencilCells: Record<string, boolean> = { "0,2": true };
    expect(isClueComplete(puzzle, clue, "across", pencilCells, true)).toBe(
      false,
    );
  });

  it("returns true without onlyInk even when cells are penciled", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0];
    for (let i = 0; i < 5; i++) {
      puzzle.grid[0][i].player_value = "A";
    }
    const pencilCells: Record<string, boolean> = { "0,2": true };
    expect(isClueComplete(puzzle, clue, "across", pencilCells, false)).toBe(
      true,
    );
  });
});

describe("getNextClue / getPreviousClue with skip", () => {
  it("skips completed clues when shouldSkip is provided", () => {
    const puzzle = makeTestPuzzle();
    // Fill clue 6-across (single cell at row 1, col 0)
    puzzle.grid[1][0].player_value = "A";

    const shouldSkip = (clue: import("../types/puzzle").Clue, dir: string) =>
      isClueComplete(
        puzzle,
        clue,
        dir as import("../types/puzzle").Direction,
        {},
        false,
      );

    // From 1-across, next should skip 6-across (filled) and land on 7-across
    const { clue, direction } = getNextClue(
      puzzle,
      "across",
      puzzle.clues.across[0],
      shouldSkip,
    );
    expect(clue.number).toBe(7);
    expect(direction).toBe("across");
  });

  it("skips multiple completed clues", () => {
    const puzzle = makeTestPuzzle();
    // Fill clues 6, 7, 8 across (all single-cell)
    puzzle.grid[1][0].player_value = "A"; // 6-across
    puzzle.grid[1][2].player_value = "A"; // 7-across
    puzzle.grid[1][4].player_value = "A"; // 8-across

    const shouldSkip = (clue: import("../types/puzzle").Clue, dir: string) =>
      isClueComplete(
        puzzle,
        clue,
        dir as import("../types/puzzle").Direction,
        {},
        false,
      );

    const { clue, direction } = getNextClue(
      puzzle,
      "across",
      puzzle.clues.across[0],
      shouldSkip,
    );
    expect(clue.number).toBe(9);
    expect(direction).toBe("across");
  });

  it("getPreviousClue skips completed clues", () => {
    const puzzle = makeTestPuzzle();
    // Fill 7-across (single cell at row 1, col 2)
    puzzle.grid[1][2].player_value = "A";

    const shouldSkip = (clue: import("../types/puzzle").Clue, dir: string) =>
      isClueComplete(
        puzzle,
        clue,
        dir as import("../types/puzzle").Direction,
        {},
        false,
      );

    // From 8-across, previous should skip 7-across and land on 6-across
    const { clue } = getPreviousClue(
      puzzle,
      "across",
      puzzle.clues.across[3], // 8-across
      shouldSkip,
    );
    expect(clue.number).toBe(6);
  });

  it("returns current clue when all clues are completed", () => {
    const puzzle = makeTestPuzzle();
    // Fill every cell
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (puzzle.grid[r][c].kind === "letter") {
          puzzle.grid[r][c].player_value = "A";
        }
      }
    }

    const shouldSkip = (clue: import("../types/puzzle").Clue, dir: string) =>
      isClueComplete(
        puzzle,
        clue,
        dir as import("../types/puzzle").Direction,
        {},
        false,
      );

    const { clue } = getNextClue(
      puzzle,
      "across",
      puzzle.clues.across[0],
      shouldSkip,
    );
    // Should return starting clue since all are complete
    expect(clue.number).toBe(1);
  });
});
