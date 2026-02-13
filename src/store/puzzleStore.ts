import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Puzzle,
  Cell,
  Clue,
  Direction,
  CursorPosition,
} from "../types/puzzle";

export interface PuzzleState {
  puzzle: Puzzle | null;
  cursor: CursorPosition;
  direction: Direction;
  /** Elapsed time in seconds. */
  elapsedSeconds: number;
  timerRunning: boolean;
  /** Whether the puzzle has been completed correctly. */
  isSolved: boolean;

  // Actions
  loadPuzzle: (puzzle: Puzzle) => void;
  setCursor: (row: number, col: number) => void;
  setDirection: (direction: Direction) => void;
  toggleDirection: () => void;
  setCellValue: (row: number, col: number, value: string | null) => void;
  tickTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  checkSolution: () => void;
  resetPuzzle: () => void;
}

export const usePuzzleStore = create<PuzzleState>()(
  immer((set, get) => ({
    puzzle: null,
    cursor: { row: 0, col: 0 },
    direction: "across",
    elapsedSeconds: 0,
    timerRunning: false,
    isSolved: false,

    loadPuzzle: (puzzle: Puzzle) => {
      // Find the first letter cell for initial cursor
      let startRow = 0;
      let startCol = 0;
      outer: for (let r = 0; r < puzzle.height; r++) {
        for (let c = 0; c < puzzle.width; c++) {
          if (puzzle.grid[r][c].kind === "letter") {
            startRow = r;
            startCol = c;
            break outer;
          }
        }
      }

      set((state) => {
        state.puzzle = puzzle;
        state.cursor = { row: startRow, col: startCol };
        state.direction = "across";
        state.elapsedSeconds = 0;
        state.timerRunning = true;
        state.isSolved = false;
      });
    },

    setCursor: (row: number, col: number) => {
      set((state) => {
        state.cursor = { row, col };
      });
    },

    setDirection: (direction: Direction) => {
      set((state) => {
        state.direction = direction;
      });
    },

    toggleDirection: () => {
      set((state) => {
        state.direction = state.direction === "across" ? "down" : "across";
      });
    },

    setCellValue: (row: number, col: number, value: string | null) => {
      set((state) => {
        if (!state.puzzle) return;
        const cell = state.puzzle.grid[row][col];
        if (cell.kind === "black") return;
        cell.player_value = value;
      });
    },

    tickTimer: () => {
      set((state) => {
        if (state.timerRunning) {
          state.elapsedSeconds += 1;
        }
      });
    },

    pauseTimer: () => {
      set((state) => {
        state.timerRunning = false;
      });
    },

    resumeTimer: () => {
      set((state) => {
        state.timerRunning = true;
      });
    },

    resetTimer: () => {
      set((state) => {
        state.elapsedSeconds = 0;
      });
    },

    checkSolution: () => {
      const { puzzle } = get();
      if (!puzzle || !puzzle.has_solution) return;

      let allCorrect = true;
      for (let r = 0; r < puzzle.height; r++) {
        for (let c = 0; c < puzzle.width; c++) {
          const cell = puzzle.grid[r][c];
          if (cell.kind === "black") continue;
          const expected = cell.solution?.toUpperCase() ?? "";
          const actual = cell.player_value?.toUpperCase() ?? "";
          if (actual !== expected) {
            allCorrect = false;
            break;
          }
        }
        if (!allCorrect) break;
      }

      if (allCorrect) {
        set((state) => {
          state.isSolved = true;
          state.timerRunning = false;
        });
      }
    },

    resetPuzzle: () => {
      set((state) => {
        if (!state.puzzle) return;
        for (let r = 0; r < state.puzzle.height; r++) {
          for (let c = 0; c < state.puzzle.width; c++) {
            const cell = state.puzzle.grid[r][c];
            if (cell.kind === "letter") {
              cell.player_value = null;
            }
          }
        }
        // Move cursor to first letter cell
        for (let r = 0; r < state.puzzle.height; r++) {
          for (let c = 0; c < state.puzzle.width; c++) {
            if (state.puzzle.grid[r][c].kind === "letter") {
              state.cursor = { row: r, col: c };
              state.direction = "across";
              state.elapsedSeconds = 0;
              state.timerRunning = true;
              state.isSolved = false;
              return;
            }
          }
        }
      });
    },
  })),
);

// Selectors

/** Get the current cell under the cursor. */
export function selectCurrentCell(state: PuzzleState): Cell | null {
  if (!state.puzzle) return null;
  return state.puzzle.grid[state.cursor.row][state.cursor.col];
}

/** Get the clue for the current cursor position and direction. */
export function selectCurrentClue(state: PuzzleState): Clue | null {
  if (!state.puzzle) return null;
  const { cursor, direction, puzzle } = state;

  const clueList =
    direction === "across" ? puzzle.clues.across : puzzle.clues.down;

  for (const clue of clueList) {
    if (direction === "across") {
      if (
        cursor.row === clue.row &&
        cursor.col >= clue.col &&
        cursor.col < clue.col + clue.length
      ) {
        return clue;
      }
    } else {
      if (
        cursor.col === clue.col &&
        cursor.row >= clue.row &&
        cursor.row < clue.row + clue.length
      ) {
        return clue;
      }
    }
  }
  return null;
}

/** Get all cell positions that belong to the current word. */
export function selectCurrentWordCells(
  state: PuzzleState,
): CursorPosition[] | null {
  const clue = selectCurrentClue(state);
  if (!clue) return null;

  const cells: CursorPosition[] = [];
  for (let i = 0; i < clue.length; i++) {
    if (state.direction === "across") {
      cells.push({ row: clue.row, col: clue.col + i });
    } else {
      cells.push({ row: clue.row + i, col: clue.col });
    }
  }
  return cells;
}

/** Check if all cells in a clue are filled (have a player_value). */
export function isClueComplete(
  puzzle: Puzzle,
  clue: Clue,
  direction: Direction,
): boolean {
  for (let i = 0; i < clue.length; i++) {
    const r = direction === "across" ? clue.row : clue.row + i;
    const c = direction === "across" ? clue.col + i : clue.col;
    const cell = puzzle.grid[r][c];
    if (!cell.player_value) return false;
  }
  return true;
}

/** Get the cross-direction clue at the current cursor position. */
export function selectCrossClue(state: PuzzleState): Clue | null {
  if (!state.puzzle) return null;
  const crossDirection = state.direction === "across" ? "down" : "across";
  const clueList =
    crossDirection === "across"
      ? state.puzzle.clues.across
      : state.puzzle.clues.down;

  for (const clue of clueList) {
    if (crossDirection === "across") {
      if (
        state.cursor.row === clue.row &&
        state.cursor.col >= clue.col &&
        state.cursor.col < clue.col + clue.length
      ) {
        return clue;
      }
    } else {
      if (
        state.cursor.col === clue.col &&
        state.cursor.row >= clue.row &&
        state.cursor.row < clue.row + clue.length
      ) {
        return clue;
      }
    }
  }
  return null;
}
