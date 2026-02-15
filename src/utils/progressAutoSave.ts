import { usePuzzleStore } from "../store/puzzleStore";
import { useLibraryStore } from "../store/libraryStore";
import { saveProgress, puzzleIdFromPath } from "./progressPersistence";
import { computeCompletionPercent } from "./completionPercent";
import type { PuzzleProgress } from "../types/progress";
import type { PuzzleState } from "../store/puzzleStore";

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
let currentFilePath: string | null = null;
/** Expected grid dimensions for the current puzzle — used to guard against stale saves. */
let expectedWidth: number | null = null;
let expectedHeight: number | null = null;

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

/** Check that the puzzle currently in the store matches what we expect for this auto-save session. */
function puzzleMatchesExpected(state: PuzzleState): boolean {
  if (!state.puzzle) return false;
  return (
    state.puzzle.width === expectedWidth &&
    state.puzzle.height === expectedHeight
  );
}

function doSave(filePath: string) {
  const currentState = usePuzzleStore.getState();
  if (!currentState.puzzle || !puzzleMatchesExpected(currentState)) return;

  const progress = buildProgress(currentState, filePath);
  saveProgress(progress);

  const libraryState = useLibraryStore.getState();
  const existing = libraryState.entries.find((e) => e.filePath === filePath);
  if (existing) {
    libraryState.addOrUpdateEntry({
      ...existing,
      completionPercent: computeCompletionPercent(currentState.puzzle),
      isSolved: currentState.isSolved,
      elapsedSeconds: currentState.elapsedSeconds,
    });
  }
}

/** Immediately save current progress (call before closing a puzzle). */
export function flushAutoSave(): void {
  if (!currentFilePath) return;
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  doSave(currentFilePath);
}

export function startAutoSave(filePath: string): () => void {
  stopAutoSave();
  currentFilePath = filePath;

  // Capture the expected puzzle dimensions at the time auto-save starts
  const puzzle = usePuzzleStore.getState().puzzle;
  expectedWidth = puzzle?.width ?? null;
  expectedHeight = puzzle?.height ?? null;

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
      // Guard: verify the puzzle in the store still matches what we expect.
      // If a different puzzle was loaded, skip this stale save.
      if (currentFilePath === filePath) {
        doSave(filePath);
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
  currentFilePath = null;
  expectedWidth = null;
  expectedHeight = null;
}
