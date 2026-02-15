import type { Puzzle, Clue, Direction, CursorPosition } from "../types/puzzle";
import type { NavigationSettings } from "../types/settings";

/** Check if a cell at (row, col) is a letter cell. */
export function isLetterCell(
  puzzle: Puzzle,
  row: number,
  col: number,
): boolean {
  if (row < 0 || row >= puzzle.height || col < 0 || col >= puzzle.width) {
    return false;
  }
  return puzzle.grid[row][col].kind === "letter";
}

/** Check if a cell is filled (has a player value). */
export function isFilled(puzzle: Puzzle, row: number, col: number): boolean {
  const cell = puzzle.grid[row][col];
  return cell.player_value !== null && cell.player_value !== "";
}

/**
 * Get the next cell in the given direction, optionally skipping filled cells.
 * Returns null if no valid next cell exists within the current word.
 * shouldSkipCell, if provided, determines whether a filled cell should be skipped.
 */
export function getNextCellInWord(
  puzzle: Puzzle,
  clue: Clue,
  direction: Direction,
  currentRow: number,
  currentCol: number,
  shouldSkipCell?: (row: number, col: number) => boolean,
): CursorPosition | null {
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;

  let r = currentRow + dr;
  let c = currentCol + dc;

  while (isLetterCell(puzzle, r, c) && isInWord(clue, direction, r, c)) {
    if (!shouldSkipCell || !shouldSkipCell(r, c)) {
      return { row: r, col: c };
    }
    r += dr;
    c += dc;
  }
  return null;
}

/** Check if (row, col) is within the given clue's word. */
function isInWord(
  clue: Clue,
  direction: Direction,
  row: number,
  col: number,
): boolean {
  if (direction === "across") {
    return row === clue.row && col >= clue.col && col < clue.col + clue.length;
  }
  return col === clue.col && row >= clue.row && row < clue.row + clue.length;
}

/**
 * Get the previous cell in the given direction.
 * Used for backspace navigation.
 */
export function getPreviousCellInWord(
  puzzle: Puzzle,
  clue: Clue,
  direction: Direction,
  currentRow: number,
  currentCol: number,
): CursorPosition | null {
  const dr = direction === "down" ? -1 : 0;
  const dc = direction === "across" ? -1 : 0;

  const r = currentRow + dr;
  const c = currentCol + dc;

  if (isLetterCell(puzzle, r, c) && isInWord(clue, direction, r, c)) {
    return { row: r, col: c };
  }
  return null;
}

/** Move one cell in an absolute direction (arrow key). */
export function getAdjacentCell(
  puzzle: Puzzle,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
): CursorPosition | null {
  const r = row + dRow;
  const c = col + dCol;

  if (isLetterCell(puzzle, r, c)) {
    return { row: r, col: c };
  }

  // Skip over black cells to find the next letter cell
  let sr = r + dRow;
  let sc = c + dCol;
  while (sr >= 0 && sr < puzzle.height && sc >= 0 && sc < puzzle.width) {
    if (isLetterCell(puzzle, sr, sc)) {
      return { row: sr, col: sc };
    }
    sr += dRow;
    sc += dCol;
  }

  return null;
}

/**
 * Find the clue that contains the given cell position.
 */
export function findClueAtPosition(
  puzzle: Puzzle,
  row: number,
  col: number,
  direction: Direction,
): Clue | null {
  const clueList =
    direction === "across" ? puzzle.clues.across : puzzle.clues.down;

  for (const clue of clueList) {
    if (isInWord(clue, direction, row, col)) {
      return clue;
    }
  }
  return null;
}

/**
 * Check if every cell in a clue's word is filled.
 * If onlyInk is true, penciled cells are NOT considered filled.
 */
export function isClueComplete(
  puzzle: Puzzle,
  clue: Clue,
  direction: Direction,
  pencilCells: Record<string, boolean>,
  onlyInk: boolean,
): boolean {
  for (let i = 0; i < clue.length; i++) {
    const r = direction === "across" ? clue.row : clue.row + i;
    const c = direction === "across" ? clue.col + i : clue.col;
    if (!isFilled(puzzle, r, c)) return false;
    if (onlyInk && pencilCells[`${r},${c}`]) return false;
  }
  return true;
}

/**
 * Check if every letter cell in the puzzle is filled.
 * Used to disable skip-completed-clues when the whole puzzle is filled
 * (e.g., user has errors to fix and needs to navigate freely).
 */
export function isPuzzleFullyFilled(puzzle: Puzzle): boolean {
  for (let r = 0; r < puzzle.height; r++) {
    for (let c = 0; c < puzzle.width; c++) {
      if (puzzle.grid[r][c].kind === "letter" && !isFilled(puzzle, r, c)) {
        return false;
      }
    }
  }
  return true;
}

/** Get the first blank cell in a word, or null if all filled. */
export function getFirstBlankInWord(
  puzzle: Puzzle,
  clue: Clue,
  direction: Direction,
): CursorPosition | null {
  for (let i = 0; i < clue.length; i++) {
    const r = direction === "across" ? clue.row : clue.row + i;
    const c = direction === "across" ? clue.col + i : clue.col;
    if (!isFilled(puzzle, r, c)) {
      return { row: r, col: c };
    }
  }
  return null;
}

/**
 * Get the next clue in the list, wrapping around.
 * If shouldSkip is provided, skips clues for which it returns true.
 * Will never skip the starting clue (to avoid infinite loops when all clues match).
 */
export function getNextClue(
  puzzle: Puzzle,
  direction: Direction,
  currentClue: Clue,
  shouldSkip?: (clue: Clue, dir: Direction) => boolean,
): { clue: Clue; direction: Direction } {
  const totalClues = puzzle.clues.across.length + puzzle.clues.down.length;
  let dir = direction;
  let clueList = dir === "across" ? puzzle.clues.across : puzzle.clues.down;
  let idx = clueList.findIndex((c) => c.number === currentClue.number);

  for (let step = 0; step < totalClues; step++) {
    idx++;
    if (idx >= clueList.length) {
      // Wrap to other direction
      dir = dir === "across" ? "down" : "across";
      clueList = dir === "across" ? puzzle.clues.across : puzzle.clues.down;
      idx = 0;
    }

    const candidate = clueList[idx];
    // Stop if we've wrapped all the way back to the starting clue
    if (candidate.number === currentClue.number && dir === direction) {
      return { clue: candidate, direction: dir };
    }
    if (!shouldSkip || !shouldSkip(candidate, dir)) {
      return { clue: candidate, direction: dir };
    }
  }

  // All clues match skip — return next adjacent clue (fallback)
  return { clue: currentClue, direction };
}

/**
 * Get the previous clue in the list, wrapping around.
 * If shouldSkip is provided, skips clues for which it returns true.
 */
export function getPreviousClue(
  puzzle: Puzzle,
  direction: Direction,
  currentClue: Clue,
  shouldSkip?: (clue: Clue, dir: Direction) => boolean,
): { clue: Clue; direction: Direction } {
  const totalClues = puzzle.clues.across.length + puzzle.clues.down.length;
  let dir = direction;
  let clueList = dir === "across" ? puzzle.clues.across : puzzle.clues.down;
  let idx = clueList.findIndex((c) => c.number === currentClue.number);

  for (let step = 0; step < totalClues; step++) {
    idx--;
    if (idx < 0) {
      // Wrap to other direction
      dir = dir === "across" ? "down" : "across";
      clueList = dir === "across" ? puzzle.clues.across : puzzle.clues.down;
      idx = clueList.length - 1;
    }

    const candidate = clueList[idx];
    if (candidate.number === currentClue.number && dir === direction) {
      return { clue: candidate, direction: dir };
    }
    if (!shouldSkip || !shouldSkip(candidate, dir)) {
      return { clue: candidate, direction: dir };
    }
  }

  return { clue: currentClue, direction };
}

/** Get the previous clue's starting position for backspace-across-word-boundary. */
export function getPreviousWordLastCell(
  puzzle: Puzzle,
  direction: Direction,
  currentClue: Clue,
): CursorPosition | null {
  const { clue: prevClue, direction: prevDir } = getPreviousClue(
    puzzle,
    direction,
    currentClue,
  );

  // Return the last cell of the previous word
  if (prevDir === "across") {
    return { row: prevClue.row, col: prevClue.col + prevClue.length - 1 };
  }
  return { row: prevClue.row + prevClue.length - 1, col: prevClue.col };
}

/**
 * Handle what happens after typing a letter — determine the next cursor position.
 * This implements skip-filled and end-of-word logic.
 */
export function getNextCellAfterInput(
  puzzle: Puzzle,
  clue: Clue,
  direction: Direction,
  currentRow: number,
  currentCol: number,
  settings: NavigationSettings,
  pencilCells?: Record<string, boolean>,
): { cursor: CursorPosition; direction: Direction } | null {
  // Build skip predicate from settings
  const skipMode = settings.skip_filled_cells;
  const shouldSkipCell =
    skipMode !== "none"
      ? (r: number, c: number) => {
          if (!isFilled(puzzle, r, c)) return false;
          if (skipMode === "ink_only" && pencilCells?.[`${r},${c}`])
            return false;
          return true;
        }
      : undefined;

  // Try to find next cell in current word
  const next = getNextCellInWord(
    puzzle,
    clue,
    direction,
    currentRow,
    currentCol,
    shouldSkipCell,
  );

  if (next) {
    return { cursor: next, direction };
  }

  // We're at the end of the word — apply end-of-word behavior
  switch (settings.end_of_word_action) {
    case "jump_back_to_blank": {
      const blank = getFirstBlankInWord(puzzle, clue, direction);
      if (blank) {
        return { cursor: blank, direction };
      }
      // Word is complete, stay put
      return null;
    }
    case "jump_to_next_clue": {
      const { clue: nextClue, direction: nextDir } = getNextClue(
        puzzle,
        direction,
        clue,
      );
      const blank = getFirstBlankInWord(puzzle, nextClue, nextDir);
      const start: CursorPosition = { row: nextClue.row, col: nextClue.col };
      return { cursor: blank ?? start, direction: nextDir };
    }
    case "stop":
    default:
      return null;
  }
}
