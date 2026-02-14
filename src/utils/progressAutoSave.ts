import { usePuzzleStore } from "../store/puzzleStore";
import { saveProgress, puzzleIdFromPath } from "./progressPersistence";
import type { PuzzleProgress } from "../types/progress";
import type { PuzzleState } from "../store/puzzleStore";

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;

function buildProgress(state: PuzzleState, filePath: string): PuzzleProgress {
  const puzzle = state.puzzle!;
  const cellValues: (string | null)[] = [];
  const incorrectCells: string[] = [];
  const revealedCells: string[] = [];

  for (let r = 0; r < puzzle.height; r++) {
    for (let c = 0; c < puzzle.width; c++) {
      const cell = puzzle.grid[r][c];
      if (cell.kind === "black") {
        cellValues.push(null);
      } else {
        cellValues.push(cell.player_value);
        if (cell.was_incorrect) incorrectCells.push(`${r},${c}`);
        if (cell.is_revealed) revealedCells.push(`${r},${c}`);
      }
    }
  }

  const pencilCells: string[] = Object.keys(state.pencilCells).filter(
    (k) => state.pencilCells[k],
  );

  return {
    puzzleId: puzzleIdFromPath(filePath),
    filePath,
    title: puzzle.title,
    cellValues,
    pencilCells,
    incorrectCells,
    revealedCells,
    elapsedSeconds: state.elapsedSeconds,
    isSolved: state.isSolved,
    lastSaved: Date.now(),
  };
}

export function startAutoSave(filePath: string): () => void {
  stopAutoSave();

  unsubscribe = usePuzzleStore.subscribe((state, prevState) => {
    if (!state.puzzle) return;
    // Only save when puzzle data changes (not cursor/direction)
    if (
      state.puzzle === prevState.puzzle &&
      state.elapsedSeconds === prevState.elapsedSeconds &&
      state.isSolved === prevState.isSolved
    ) {
      return;
    }

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const currentState = usePuzzleStore.getState();
      if (currentState.puzzle) {
        const progress = buildProgress(currentState, filePath);
        saveProgress(progress);
      }
    }, 1000);
  });

  return () => stopAutoSave();
}

export function stopAutoSave(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
