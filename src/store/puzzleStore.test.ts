import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  usePuzzleStore,
  isClueComplete,
  selectCurrentCell,
  selectCurrentClue,
  selectCurrentWordCells,
  selectCrossClue,
} from "./puzzleStore";
import type { Puzzle, Cell, Clue } from "../types/puzzle";
import type { PuzzleProgress } from "../types/progress";

// Mock @tauri-apps/plugin-log to avoid Tauri runtime dependency
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

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
 * Build a 5x5 puzzle for testing:
 * L L L L L    (row 0: 1-across)
 * L B L B L    (row 1: 6-across[0], 7-across[2], 8-across[4])
 * L L L L L    (row 2: 9-across)
 * L B L B L
 * L L L L L    (row 4: 17-across)
 */
function makeTestPuzzle(): Puzzle {
  const L = (num?: number, sol?: string) =>
    makeCell("letter", {
      number: num ?? null,
      solution: sol ?? "A",
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

// ── isClueComplete ──────────────────────────────────────────────────────

describe("isClueComplete", () => {
  it("returns false when no cells are filled", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[0];
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
    for (let r = 0; r < 5; r++) {
      puzzle.grid[r][0].player_value = "X";
    }
    const clue = puzzle.clues.down[0];
    expect(isClueComplete(puzzle, clue, "down")).toBe(true);
  });

  it("returns true for single-cell clue when filled", () => {
    const puzzle = makeTestPuzzle();
    puzzle.grid[1][0].player_value = "X";
    const clue = puzzle.clues.across[1];
    expect(isClueComplete(puzzle, clue, "across")).toBe(true);
  });

  it("returns false for single-cell clue when empty", () => {
    const puzzle = makeTestPuzzle();
    const clue = puzzle.clues.across[1];
    expect(isClueComplete(puzzle, clue, "across")).toBe(false);
  });
});

// ── loadPuzzle ──────────────────────────────────────────────────────────

describe("loadPuzzle", () => {
  beforeEach(() => {
    usePuzzleStore.setState(usePuzzleStore.getInitialState());
  });

  it("sets cursor to first letter cell", () => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    expect(usePuzzleStore.getState().cursor).toEqual({ row: 0, col: 0 });
  });

  it("resets all state when loading a new puzzle", () => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    usePuzzleStore.getState().togglePencilMode();

    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    const state = usePuzzleStore.getState();
    expect(state.isPencilMode).toBe(false);
    expect(state.elapsedSeconds).toBe(0);
    expect(state.timerRunning).toBe(true);
    expect(state.isSolved).toBe(false);
    expect(state.pencilCells).toEqual({});
  });

  it("starts timer running", () => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    expect(usePuzzleStore.getState().timerRunning).toBe(true);
  });

  it("skips black cells when finding first letter cell", () => {
    const puzzle = makeTestPuzzle();
    puzzle.grid[0][0] = makeCell("black");
    usePuzzleStore.getState().loadPuzzle(puzzle);
    expect(usePuzzleStore.getState().cursor).toEqual({ row: 0, col: 1 });
  });
});

// ── cursor and direction ────────────────────────────────────────────────

describe("cursor and direction", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("setCursor updates position", () => {
    usePuzzleStore.getState().setCursor(2, 3);
    expect(usePuzzleStore.getState().cursor).toEqual({ row: 2, col: 3 });
  });

  it("setDirection updates direction", () => {
    usePuzzleStore.getState().setDirection("down");
    expect(usePuzzleStore.getState().direction).toBe("down");
  });

  it("toggleDirection flips across to down", () => {
    usePuzzleStore.getState().toggleDirection();
    expect(usePuzzleStore.getState().direction).toBe("down");
  });

  it("toggleDirection flips down to across", () => {
    usePuzzleStore.getState().setDirection("down");
    usePuzzleStore.getState().toggleDirection();
    expect(usePuzzleStore.getState().direction).toBe("across");
  });
});

// ── setCellValue ────────────────────────────────────────────────────────

describe("setCellValue", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("sets a letter value on a cell", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].player_value).toBe("X");
  });

  it("clears a cell when value is null", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    usePuzzleStore.getState().setCellValue(0, 0, null);
    expect(
      usePuzzleStore.getState().puzzle!.grid[0][0].player_value,
    ).toBeNull();
  });

  it("ignores writes to black cells", () => {
    usePuzzleStore.getState().setCellValue(1, 1, "X");
    expect(
      usePuzzleStore.getState().puzzle!.grid[1][1].player_value,
    ).toBeNull();
  });

  it("tracks pencil cells when pencil mode is on", () => {
    usePuzzleStore.getState().togglePencilMode();
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    expect(usePuzzleStore.getState().pencilCells["0,0"]).toBe(true);
  });

  it("clears pencil tracking when value cleared", () => {
    usePuzzleStore.getState().togglePencilMode();
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    usePuzzleStore.getState().setCellValue(0, 0, null);
    expect(usePuzzleStore.getState().pencilCells["0,0"]).toBeUndefined();
  });

  it("overwrites pencil mark when writing in ink mode", () => {
    usePuzzleStore.getState().togglePencilMode();
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    expect(usePuzzleStore.getState().pencilCells["0,0"]).toBe(true);
    usePuzzleStore.getState().togglePencilMode();
    usePuzzleStore.getState().setCellValue(0, 0, "Y");
    expect(usePuzzleStore.getState().pencilCells["0,0"]).toBeUndefined();
  });

  it("does nothing when no puzzle is loaded", () => {
    usePuzzleStore.setState({ puzzle: null });
    usePuzzleStore.getState().setCellValue(0, 0, "X");
  });
});

// ── timer ───────────────────────────────────────────────────────────────

describe("timer", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("starts with timer running", () => {
    expect(usePuzzleStore.getState().timerRunning).toBe(true);
  });

  it("tickTimer increments elapsed seconds when running", () => {
    usePuzzleStore.getState().tickTimer();
    usePuzzleStore.getState().tickTimer();
    expect(usePuzzleStore.getState().elapsedSeconds).toBe(2);
  });

  it("tickTimer does not increment when paused", () => {
    usePuzzleStore.getState().pauseTimer();
    usePuzzleStore.getState().tickTimer();
    expect(usePuzzleStore.getState().elapsedSeconds).toBe(0);
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

  it("resetTimer sets elapsed to 0", () => {
    usePuzzleStore.getState().tickTimer();
    usePuzzleStore.getState().tickTimer();
    usePuzzleStore.getState().resetTimer();
    expect(usePuzzleStore.getState().elapsedSeconds).toBe(0);
  });
});

// ── checkSolution ───────────────────────────────────────────────────────

describe("checkSolution", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("sets isSolved and justSolved when all cells are correctly filled", () => {
    const puzzle = usePuzzleStore.getState().puzzle!;
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        if (puzzle.grid[r][c].kind === "letter") {
          usePuzzleStore
            .getState()
            .setCellValue(r, c, puzzle.grid[r][c].solution!);
        }
      }
    }
    usePuzzleStore.getState().checkSolution();
    expect(usePuzzleStore.getState().isSolved).toBe(true);
    expect(usePuzzleStore.getState().justSolved).toBe(true);
    expect(usePuzzleStore.getState().timerRunning).toBe(false);
  });

  it("shows incorrect notice when all filled but some wrong", () => {
    const puzzle = usePuzzleStore.getState().puzzle!;
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        if (puzzle.grid[r][c].kind === "letter") {
          usePuzzleStore.getState().setCellValue(r, c, "Z");
        }
      }
    }
    usePuzzleStore.getState().checkSolution();
    expect(usePuzzleStore.getState().isSolved).toBe(false);
    expect(usePuzzleStore.getState().showIncorrectNotice).toBe(true);
  });

  it("does nothing when puzzle is partially filled", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "A");
    usePuzzleStore.getState().checkSolution();
    expect(usePuzzleStore.getState().isSolved).toBe(false);
    expect(usePuzzleStore.getState().showIncorrectNotice).toBe(false);
  });

  it("does nothing when no puzzle loaded", () => {
    usePuzzleStore.setState({ puzzle: null });
    usePuzzleStore.getState().checkSolution();
    expect(usePuzzleStore.getState().isSolved).toBe(false);
  });

  it("is case-insensitive", () => {
    const puzzle = usePuzzleStore.getState().puzzle!;
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        if (puzzle.grid[r][c].kind === "letter") {
          usePuzzleStore.getState().setCellValue(r, c, "a");
        }
      }
    }
    usePuzzleStore.getState().checkSolution();
    expect(usePuzzleStore.getState().isSolved).toBe(true);
  });

  it("dismissIncorrectNotice clears the flag", () => {
    const puzzle = usePuzzleStore.getState().puzzle!;
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        if (puzzle.grid[r][c].kind === "letter") {
          usePuzzleStore.getState().setCellValue(r, c, "Z");
        }
      }
    }
    usePuzzleStore.getState().checkSolution();
    expect(usePuzzleStore.getState().showIncorrectNotice).toBe(true);
    usePuzzleStore.getState().dismissIncorrectNotice();
    expect(usePuzzleStore.getState().showIncorrectNotice).toBe(false);
  });
});

// ── checkCell / checkWord / checkPuzzle ─────────────────────────────────

describe("checkCell", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("marks incorrect cell as was_incorrect", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "Z");
    usePuzzleStore.getState().checkCell(0, 0);
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].was_incorrect).toBe(
      true,
    );
  });

  it("does not mark correct cell", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "A");
    usePuzzleStore.getState().checkCell(0, 0);
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].was_incorrect).toBe(
      false,
    );
  });

  it("ignores empty cells", () => {
    usePuzzleStore.getState().checkCell(0, 0);
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].was_incorrect).toBe(
      false,
    );
  });

  it("ignores black cells", () => {
    usePuzzleStore.getState().checkCell(1, 1);
    expect(usePuzzleStore.getState().puzzle!.grid[1][1].was_incorrect).toBe(
      false,
    );
  });
});

describe("checkWord", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    usePuzzleStore.getState().setCursor(0, 0);
    usePuzzleStore.getState().setDirection("across");
  });

  it("marks incorrect cells in current word", () => {
    for (let c = 0; c < 5; c++) {
      usePuzzleStore.getState().setCellValue(0, c, "Z");
    }
    usePuzzleStore.getState().checkWord();
    for (let c = 0; c < 5; c++) {
      expect(usePuzzleStore.getState().puzzle!.grid[0][c].was_incorrect).toBe(
        true,
      );
    }
  });

  it("does not mark correct cells in word", () => {
    for (let c = 0; c < 5; c++) {
      usePuzzleStore.getState().setCellValue(0, c, "A");
    }
    usePuzzleStore.getState().checkWord();
    for (let c = 0; c < 5; c++) {
      expect(usePuzzleStore.getState().puzzle!.grid[0][c].was_incorrect).toBe(
        false,
      );
    }
  });
});

describe("checkPuzzle", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("marks all incorrect cells across entire puzzle", () => {
    const puzzle = usePuzzleStore.getState().puzzle!;
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        if (puzzle.grid[r][c].kind === "letter") {
          usePuzzleStore.getState().setCellValue(r, c, "Z");
        }
      }
    }
    usePuzzleStore.getState().checkPuzzle();
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        if (puzzle.grid[r][c].kind === "letter") {
          expect(
            usePuzzleStore.getState().puzzle!.grid[r][c].was_incorrect,
          ).toBe(true);
        }
      }
    }
  });
});

// ── revealCell / revealWord / revealPuzzle ──────────────────────────────

describe("revealCell", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("sets player_value to solution and marks revealed", () => {
    usePuzzleStore.getState().revealCell(0, 0);
    const cell = usePuzzleStore.getState().puzzle!.grid[0][0];
    expect(cell.player_value).toBe("A");
    expect(cell.is_revealed).toBe(true);
    expect(cell.was_incorrect).toBe(false);
  });

  it("clears was_incorrect when revealing", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "Z");
    usePuzzleStore.getState().checkCell(0, 0);
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].was_incorrect).toBe(
      true,
    );
    usePuzzleStore.getState().revealCell(0, 0);
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].was_incorrect).toBe(
      false,
    );
  });

  it("uses rebus_solution when available", () => {
    const puzzle = makeTestPuzzle();
    puzzle.grid[0][0].rebus_solution = "THEME";
    usePuzzleStore.getState().loadPuzzle(puzzle);
    usePuzzleStore.getState().revealCell(0, 0);
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].player_value).toBe(
      "THEME",
    );
  });

  it("ignores black cells", () => {
    usePuzzleStore.getState().revealCell(1, 1);
    expect(
      usePuzzleStore.getState().puzzle!.grid[1][1].player_value,
    ).toBeNull();
  });
});

describe("revealWord", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    usePuzzleStore.getState().setCursor(0, 0);
    usePuzzleStore.getState().setDirection("across");
  });

  it("reveals all cells in the current word", () => {
    usePuzzleStore.getState().revealWord();
    for (let c = 0; c < 5; c++) {
      const cell = usePuzzleStore.getState().puzzle!.grid[0][c];
      expect(cell.player_value).toBe("A");
      expect(cell.is_revealed).toBe(true);
    }
  });
});

describe("revealPuzzle", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("reveals all cells and marks as solved", () => {
    usePuzzleStore.getState().revealPuzzle();
    const state = usePuzzleStore.getState();
    expect(state.isSolved).toBe(true);
    expect(state.timerRunning).toBe(false);

    for (let r = 0; r < state.puzzle!.height; r++) {
      for (let c = 0; c < state.puzzle!.width; c++) {
        const cell = state.puzzle!.grid[r][c];
        if (cell.kind === "letter") {
          expect(cell.player_value).toBe("A");
          expect(cell.is_revealed).toBe(true);
        }
      }
    }
  });
});

// ── resetPuzzle ─────────────────────────────────────────────────────────

describe("resetPuzzle", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("clears all cell values", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    usePuzzleStore.getState().setCellValue(0, 1, "Y");
    usePuzzleStore.getState().resetPuzzle();
    expect(
      usePuzzleStore.getState().puzzle!.grid[0][0].player_value,
    ).toBeNull();
    expect(
      usePuzzleStore.getState().puzzle!.grid[0][1].player_value,
    ).toBeNull();
  });

  it("clears was_incorrect and is_revealed flags", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "Z");
    usePuzzleStore.getState().checkCell(0, 0);
    usePuzzleStore.getState().revealCell(0, 1);
    usePuzzleStore.getState().resetPuzzle();
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].was_incorrect).toBe(
      false,
    );
    expect(usePuzzleStore.getState().puzzle!.grid[0][1].is_revealed).toBe(
      false,
    );
  });

  it("resets timer and pencil state", () => {
    usePuzzleStore.getState().tickTimer();
    usePuzzleStore.getState().togglePencilMode();
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    usePuzzleStore.getState().resetPuzzle();
    const state = usePuzzleStore.getState();
    expect(state.elapsedSeconds).toBe(0);
    expect(state.timerRunning).toBe(true);
    expect(state.isPencilMode).toBe(false);
    expect(state.pencilCells).toEqual({});
    expect(state.isSolved).toBe(false);
  });
});

// ── pencil mode ─────────────────────────────────────────────────────────

describe("pencil mode", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("togglePencilMode flips the flag", () => {
    expect(usePuzzleStore.getState().isPencilMode).toBe(false);
    usePuzzleStore.getState().togglePencilMode();
    expect(usePuzzleStore.getState().isPencilMode).toBe(true);
    usePuzzleStore.getState().togglePencilMode();
    expect(usePuzzleStore.getState().isPencilMode).toBe(false);
  });
});

// ── rebus mode ──────────────────────────────────────────────────────────

describe("rebus mode", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
    usePuzzleStore.getState().setCursor(0, 0);
  });

  it("activateRebusMode enters rebus mode with existing value", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    usePuzzleStore.getState().activateRebusMode();
    const state = usePuzzleStore.getState();
    expect(state.isRebusMode).toBe(true);
    expect(state.rebusInput).toBe("X");
    expect(state.previousValue).toBe("X");
  });

  it("activateRebusMode on empty cell starts with empty input", () => {
    usePuzzleStore.getState().activateRebusMode();
    expect(usePuzzleStore.getState().rebusInput).toBe("");
    expect(usePuzzleStore.getState().previousValue).toBeNull();
  });

  it("setRebusInput updates cell preview", () => {
    usePuzzleStore.getState().activateRebusMode();
    usePuzzleStore.getState().setRebusInput("THE");
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].player_value).toBe(
      "THE",
    );
  });

  it("deactivateRebusMode restores previous value", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    usePuzzleStore.getState().activateRebusMode();
    usePuzzleStore.getState().setRebusInput("THEME");
    usePuzzleStore.getState().deactivateRebusMode();
    expect(usePuzzleStore.getState().isRebusMode).toBe(false);
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].player_value).toBe("X");
  });

  it("confirmRebus commits value and exits rebus mode", () => {
    usePuzzleStore.getState().activateRebusMode();
    usePuzzleStore.getState().setRebusInput("THEME");
    usePuzzleStore.getState().confirmRebus();
    expect(usePuzzleStore.getState().isRebusMode).toBe(false);
    expect(usePuzzleStore.getState().puzzle!.grid[0][0].player_value).toBe(
      "THEME",
    );
  });

  it("confirmRebus with empty input clears cell", () => {
    usePuzzleStore.getState().setCellValue(0, 0, "X");
    usePuzzleStore.getState().activateRebusMode();
    usePuzzleStore.getState().setRebusInput("");
    usePuzzleStore.getState().confirmRebus();
    expect(
      usePuzzleStore.getState().puzzle!.grid[0][0].player_value,
    ).toBeNull();
  });

  it("confirmRebus advances cursor to next cell", () => {
    usePuzzleStore.getState().setDirection("across");
    usePuzzleStore.getState().activateRebusMode();
    usePuzzleStore.getState().setRebusInput("THEME");
    usePuzzleStore.getState().confirmRebus();
    expect(usePuzzleStore.getState().cursor).toEqual({ row: 0, col: 1 });
  });

  it("does not activate on black cell", () => {
    usePuzzleStore.getState().setCursor(1, 1);
    usePuzzleStore.getState().activateRebusMode();
    expect(usePuzzleStore.getState().isRebusMode).toBe(false);
  });
});

// ── restoreProgress ─────────────────────────────────────────────────────

describe("restoreProgress", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("restores cell values from progress", () => {
    const cellValues: (string | null)[] = [];
    const puzzle = usePuzzleStore.getState().puzzle!;
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        cellValues.push(puzzle.grid[r][c].kind === "black" ? null : "X");
      }
    }

    const progress: PuzzleProgress = {
      puzzleId: "test",
      filePath: "/test.puz",
      title: "Test",
      cellValues,
      pencilCells: ["0,0", "0,1"],
      incorrectCells: ["0,2"],
      revealedCells: ["0,3"],
      elapsedSeconds: 42,
      isSolved: false,
      lastSaved: Date.now(),
    };

    usePuzzleStore.getState().restoreProgress(progress);
    const state = usePuzzleStore.getState();

    expect(state.puzzle!.grid[0][0].player_value).toBe("X");
    expect(state.pencilCells["0,0"]).toBe(true);
    expect(state.pencilCells["0,1"]).toBe(true);
    expect(state.puzzle!.grid[0][2].was_incorrect).toBe(true);
    expect(state.puzzle!.grid[0][3].is_revealed).toBe(true);
    expect(state.elapsedSeconds).toBe(42);
  });

  it("stops timer when restoring a solved puzzle", () => {
    const cellValues = new Array(25).fill("A");
    const progress: PuzzleProgress = {
      puzzleId: "test",
      filePath: "/test.puz",
      title: "Test",
      cellValues,
      pencilCells: [],
      incorrectCells: [],
      revealedCells: [],
      elapsedSeconds: 100,
      isSolved: true,
      lastSaved: Date.now(),
    };

    usePuzzleStore.getState().restoreProgress(progress);
    expect(usePuzzleStore.getState().timerRunning).toBe(false);
    expect(usePuzzleStore.getState().isSolved).toBe(true);
  });

  it("skips restore when cellValues length does not match grid size", () => {
    // Progress from a 3x3 puzzle (9 cells) applied to a 5x5 puzzle (25 cells)
    const progress: PuzzleProgress = {
      puzzleId: "test",
      filePath: "/test.puz",
      title: "Test",
      cellValues: new Array(9).fill("Z"), // wrong size for 5x5
      pencilCells: [],
      incorrectCells: [],
      revealedCells: [],
      elapsedSeconds: 999,
      isSolved: true,
      lastSaved: Date.now(),
    };

    usePuzzleStore.getState().restoreProgress(progress);
    const state = usePuzzleStore.getState();
    // Cell values should not have been touched
    expect(state.puzzle!.grid[0][0].player_value).toBeNull();
    // Timer and solved state should not have been overwritten
    expect(state.elapsedSeconds).toBe(0);
    expect(state.isSolved).toBe(false);
  });

  it("does not set justSolved when restoring a completed puzzle", () => {
    const cellValues = new Array(25).fill("A");
    const progress: PuzzleProgress = {
      puzzleId: "test",
      filePath: "/test.puz",
      title: "Test",
      cellValues,
      pencilCells: [],
      incorrectCells: [],
      revealedCells: [],
      elapsedSeconds: 100,
      isSolved: true,
      lastSaved: Date.now(),
    };

    usePuzzleStore.getState().restoreProgress(progress);
    expect(usePuzzleStore.getState().isSolved).toBe(true);
    expect(usePuzzleStore.getState().justSolved).toBe(false);
  });
});

// ── selectors ───────────────────────────────────────────────────────────

describe("selectors", () => {
  beforeEach(() => {
    usePuzzleStore.getState().loadPuzzle(makeTestPuzzle());
  });

  it("selectCurrentCell returns the cell under cursor", () => {
    usePuzzleStore.getState().setCursor(0, 2);
    const cell = selectCurrentCell(usePuzzleStore.getState());
    expect(cell).not.toBeNull();
    expect(cell!.number).toBe(3);
  });

  it("selectCurrentCell returns null when no puzzle", () => {
    usePuzzleStore.setState({ puzzle: null });
    expect(selectCurrentCell(usePuzzleStore.getState())).toBeNull();
  });

  it("selectCurrentClue finds across clue", () => {
    usePuzzleStore.getState().setCursor(0, 2);
    usePuzzleStore.getState().setDirection("across");
    const clue = selectCurrentClue(usePuzzleStore.getState());
    expect(clue).not.toBeNull();
    expect(clue!.number).toBe(1);
  });

  it("selectCurrentClue finds down clue", () => {
    usePuzzleStore.getState().setCursor(2, 2);
    usePuzzleStore.getState().setDirection("down");
    const clue = selectCurrentClue(usePuzzleStore.getState());
    expect(clue).not.toBeNull();
    expect(clue!.number).toBe(3);
  });

  it("selectCurrentClue returns null when no puzzle", () => {
    usePuzzleStore.setState({ puzzle: null });
    expect(selectCurrentClue(usePuzzleStore.getState())).toBeNull();
  });

  it("selectCurrentWordCells returns cells for current word", () => {
    usePuzzleStore.getState().setCursor(0, 0);
    usePuzzleStore.getState().setDirection("across");
    const cells = selectCurrentWordCells(usePuzzleStore.getState());
    expect(cells).toHaveLength(5);
    expect(cells![0]).toEqual({ row: 0, col: 0 });
    expect(cells![4]).toEqual({ row: 0, col: 4 });
  });

  it("selectCrossClue returns the cross-direction clue", () => {
    usePuzzleStore.getState().setCursor(0, 0);
    usePuzzleStore.getState().setDirection("across");
    const crossClue = selectCrossClue(usePuzzleStore.getState());
    expect(crossClue).not.toBeNull();
    expect(crossClue!.number).toBe(1);
  });

  it("selectCrossClue returns null when no puzzle", () => {
    usePuzzleStore.setState({ puzzle: null });
    expect(selectCrossClue(usePuzzleStore.getState())).toBeNull();
  });
});
