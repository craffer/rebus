import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { info } from "@tauri-apps/plugin-log";
import type {
  Puzzle,
  Cell,
  Clue,
  Direction,
  CursorPosition,
} from "../types/puzzle";
import type { PuzzleProgress } from "../types/progress";

export interface PuzzleState {
  puzzle: Puzzle | null;
  cursor: CursorPosition;
  direction: Direction;
  /** Elapsed time in seconds. */
  elapsedSeconds: number;
  timerRunning: boolean;
  /** Whether the puzzle has been completed correctly. */
  isSolved: boolean;
  /** Whether every cell is filled but the solution is incorrect. */
  showIncorrectNotice: boolean;
  /** True only when the user just solved the puzzle (not on restore). Reset by dismissJustSolved(). */
  justSolved: boolean;

  // Pencil mode
  isPencilMode: boolean;
  pencilCells: Record<string, boolean>;

  // Rebus mode
  isRebusMode: boolean;
  rebusInput: string;
  previousValue: string | null;

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
  dismissJustSolved: () => void;
  dismissIncorrectNotice: () => void;
  resetPuzzle: () => void;
  closePuzzle: () => void;

  // Check/Reveal
  checkCell: (row: number, col: number) => void;
  checkWord: () => void;
  checkPuzzle: () => void;
  revealCell: (row: number, col: number) => void;
  revealWord: () => void;
  revealPuzzle: () => void;

  // Pencil mode
  togglePencilMode: () => void;

  // Rebus mode
  activateRebusMode: () => void;
  deactivateRebusMode: () => void;
  setRebusInput: (text: string) => void;
  confirmRebus: () => void;

  // Progress restoration
  restoreProgress: (progress: PuzzleProgress) => void;
}

export const usePuzzleStore = create<PuzzleState>()(
  immer((set, get) => ({
    puzzle: null,
    cursor: { row: 0, col: 0 },
    direction: "across",
    elapsedSeconds: 0,
    timerRunning: false,
    isSolved: false,
    showIncorrectNotice: false,
    justSolved: false,
    isPencilMode: false,
    pencilCells: {},
    isRebusMode: false,
    rebusInput: "",
    previousValue: null,

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
        state.showIncorrectNotice = false;
        state.isPencilMode = false;
        state.pencilCells = {};
        state.isRebusMode = false;
        state.rebusInput = "";
        state.previousValue = null;
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
        const key = `${row},${col}`;
        if (value === null) {
          delete state.pencilCells[key];
        } else if (state.isPencilMode) {
          state.pencilCells[key] = true;
        } else {
          delete state.pencilCells[key];
        }
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

      let allFilled = true;
      let allCorrect = true;
      for (let r = 0; r < puzzle.height; r++) {
        for (let c = 0; c < puzzle.width; c++) {
          const cell = puzzle.grid[r][c];
          if (cell.kind === "black") continue;
          const actual = cell.player_value?.toUpperCase() ?? "";
          if (!actual) {
            allFilled = false;
            allCorrect = false;
            break;
          }
          const expected = cell.solution?.toUpperCase() ?? "";
          if (actual !== expected) {
            allCorrect = false;
          }
        }
        if (!allFilled) break;
      }

      if (allCorrect) {
        info(`Puzzle solved in ${get().elapsedSeconds}s`);
        set((state) => {
          state.isSolved = true;
          state.justSolved = true;
          state.timerRunning = false;
        });
      } else if (allFilled) {
        set((state) => {
          state.showIncorrectNotice = true;
        });
      }
    },

    dismissJustSolved: () => {
      set((state) => {
        state.justSolved = false;
      });
    },

    dismissIncorrectNotice: () => {
      set((state) => {
        state.showIncorrectNotice = false;
      });
    },

    resetPuzzle: () => {
      info("Puzzle reset");
      set((state) => {
        if (!state.puzzle) return;
        for (let r = 0; r < state.puzzle.height; r++) {
          for (let c = 0; c < state.puzzle.width; c++) {
            const cell = state.puzzle.grid[r][c];
            if (cell.kind === "letter") {
              cell.player_value = null;
              cell.was_incorrect = false;
              cell.is_revealed = false;
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
              state.justSolved = false;
              state.showIncorrectNotice = false;
              state.isPencilMode = false;
              state.pencilCells = {};
              state.isRebusMode = false;
              state.rebusInput = "";
              state.previousValue = null;
              return;
            }
          }
        }
      });
    },

    closePuzzle: () => {
      info("Puzzle closed — returning to library");
      set((state) => {
        state.puzzle = null;
        state.cursor = { row: 0, col: 0 };
        state.direction = "across";
        state.elapsedSeconds = 0;
        state.timerRunning = false;
        state.isSolved = false;
        state.justSolved = false;
        state.showIncorrectNotice = false;
        state.isPencilMode = false;
        state.pencilCells = {};
        state.isRebusMode = false;
        state.rebusInput = "";
        state.previousValue = null;
      });
    },

    // Check/Reveal actions
    checkCell: (row: number, col: number) => {
      set((state) => {
        if (!state.puzzle || !state.puzzle.has_solution) return;
        const cell = state.puzzle.grid[row][col];
        if (cell.kind === "black" || !cell.player_value) return;
        const expected = cell.solution?.toUpperCase() ?? "";
        const actual = cell.player_value.toUpperCase();
        if (actual !== expected) {
          cell.was_incorrect = true;
        }
      });
    },

    checkWord: () => {
      const s = get();
      const wordCells = selectCurrentWordCells(s);
      if (!wordCells || !s.puzzle || !s.puzzle.has_solution) return;
      set((state) => {
        if (!state.puzzle) return;
        for (const pos of wordCells) {
          const cell = state.puzzle.grid[pos.row][pos.col];
          if (cell.kind === "black" || !cell.player_value) continue;
          const expected = cell.solution?.toUpperCase() ?? "";
          const actual = cell.player_value.toUpperCase();
          if (actual !== expected) {
            cell.was_incorrect = true;
          }
        }
      });
    },

    checkPuzzle: () => {
      set((state) => {
        if (!state.puzzle || !state.puzzle.has_solution) return;
        for (let r = 0; r < state.puzzle.height; r++) {
          for (let c = 0; c < state.puzzle.width; c++) {
            const cell = state.puzzle.grid[r][c];
            if (cell.kind === "black" || !cell.player_value) continue;
            const expected = cell.solution?.toUpperCase() ?? "";
            const actual = cell.player_value.toUpperCase();
            if (actual !== expected) {
              cell.was_incorrect = true;
            }
          }
        }
      });
    },

    revealCell: (row: number, col: number) => {
      set((state) => {
        if (!state.puzzle || !state.puzzle.has_solution) return;
        const cell = state.puzzle.grid[row][col];
        if (cell.kind === "black") return;
        cell.player_value = cell.rebus_solution ?? cell.solution;
        cell.is_revealed = true;
        cell.was_incorrect = false;
      });
    },

    revealWord: () => {
      const s = get();
      const wordCells = selectCurrentWordCells(s);
      if (!wordCells || !s.puzzle || !s.puzzle.has_solution) return;
      set((state) => {
        if (!state.puzzle) return;
        for (const pos of wordCells) {
          const cell = state.puzzle.grid[pos.row][pos.col];
          if (cell.kind === "black") continue;
          cell.player_value = cell.rebus_solution ?? cell.solution;
          cell.is_revealed = true;
          cell.was_incorrect = false;
        }
      });
    },

    revealPuzzle: () => {
      set((state) => {
        if (!state.puzzle || !state.puzzle.has_solution) return;
        for (let r = 0; r < state.puzzle.height; r++) {
          for (let c = 0; c < state.puzzle.width; c++) {
            const cell = state.puzzle.grid[r][c];
            if (cell.kind === "black") continue;
            cell.player_value = cell.rebus_solution ?? cell.solution;
            cell.is_revealed = true;
            cell.was_incorrect = false;
          }
        }
        state.isSolved = true;
        state.timerRunning = false;
      });
    },

    // Pencil mode
    togglePencilMode: () => {
      set((state) => {
        state.isPencilMode = !state.isPencilMode;
      });
    },

    // Rebus mode
    activateRebusMode: () => {
      set((state) => {
        if (!state.puzzle) return;
        const cell = state.puzzle.grid[state.cursor.row][state.cursor.col];
        if (cell.kind === "black") return;
        state.isRebusMode = true;
        state.rebusInput = cell.player_value ?? "";
        state.previousValue = cell.player_value;
      });
    },

    deactivateRebusMode: () => {
      set((state) => {
        if (!state.puzzle) return;
        const cell = state.puzzle.grid[state.cursor.row][state.cursor.col];
        if (cell.kind !== "black") {
          cell.player_value = state.previousValue;
        }
        state.isRebusMode = false;
        state.rebusInput = "";
        state.previousValue = null;
      });
    },

    setRebusInput: (text: string) => {
      set((state) => {
        if (!state.puzzle) return;
        state.rebusInput = text;
        // Live-update cell for preview
        const cell = state.puzzle.grid[state.cursor.row][state.cursor.col];
        if (cell.kind !== "black") {
          cell.player_value = text || null;
        }
      });
    },

    confirmRebus: () => {
      const s = get();
      if (!s.puzzle || !s.isRebusMode) return;
      const { cursor, direction, rebusInput } = s;

      set((state) => {
        if (!state.puzzle) return;
        const cell = state.puzzle.grid[cursor.row][cursor.col];
        if (cell.kind !== "black") {
          cell.player_value = rebusInput || null;
          // Handle pencil mode for rebus
          const key = `${cursor.row},${cursor.col}`;
          if (!rebusInput) {
            delete state.pencilCells[key];
          } else if (state.isPencilMode) {
            state.pencilCells[key] = true;
          } else {
            delete state.pencilCells[key];
          }
        }
        state.isRebusMode = false;
        state.rebusInput = "";
        state.previousValue = null;
      });

      // Advance cursor after confirming rebus
      const freshState = get();
      const currentClue = selectCurrentClue(freshState);
      if (currentClue && freshState.puzzle) {
        // Import not available here, so just use simple next-cell logic
        // Move to next cell in the word direction
        const nextRow = direction === "down" ? cursor.row + 1 : cursor.row;
        const nextCol = direction === "across" ? cursor.col + 1 : cursor.col;
        if (
          freshState.puzzle &&
          nextRow < freshState.puzzle.height &&
          nextCol < freshState.puzzle.width &&
          freshState.puzzle.grid[nextRow][nextCol].kind === "letter"
        ) {
          freshState.setCursor(nextRow, nextCol);
        }
      }

      // Check if puzzle is complete
      get().checkSolution();
    },

    restoreProgress: (progress: PuzzleProgress) => {
      info("Restoring saved progress");
      set((state) => {
        if (!state.puzzle) return;

        // Validate that saved progress matches this puzzle's grid size
        const expectedCells = state.puzzle.width * state.puzzle.height;
        if (progress.cellValues.length !== expectedCells) {
          info(
            `Progress grid mismatch (saved ${progress.cellValues.length} cells, expected ${expectedCells}) — skipping restore`,
          );
          return;
        }

        // Restore cell values
        let idx = 0;
        for (let r = 0; r < state.puzzle.height; r++) {
          for (let c = 0; c < state.puzzle.width; c++) {
            const cellVal = progress.cellValues[idx];
            if (cellVal !== null && state.puzzle.grid[r][c].kind === "letter") {
              state.puzzle.grid[r][c].player_value = cellVal;
            }
            idx++;
          }
        }

        // Restore incorrect/revealed flags
        for (const key of progress.incorrectCells) {
          const [r, c] = key.split(",").map(Number);
          if (state.puzzle.grid[r]?.[c]) {
            state.puzzle.grid[r][c].was_incorrect = true;
          }
        }
        for (const key of progress.revealedCells) {
          const [r, c] = key.split(",").map(Number);
          if (state.puzzle.grid[r]?.[c]) {
            state.puzzle.grid[r][c].is_revealed = true;
          }
        }

        // Restore pencil cells
        const pencilRecord: Record<string, boolean> = {};
        for (const key of progress.pencilCells) {
          pencilRecord[key] = true;
        }
        state.pencilCells = pencilRecord;

        // Restore timer and solved state
        state.elapsedSeconds = progress.elapsedSeconds;
        state.isSolved = progress.isSolved;
        if (progress.isSolved) {
          state.timerRunning = false;
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
