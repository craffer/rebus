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
 */
export function getNextCellInWord(
  puzzle: Puzzle,
  clue: Clue,
  direction: Direction,
  currentRow: number,
  currentCol: number,
  skipFilled: boolean,
): CursorPosition | null {
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;

  let r = currentRow + dr;
  let c = currentCol + dc;

  while (isLetterCell(puzzle, r, c) && isInWord(clue, direction, r, c)) {
    if (!skipFilled || !isFilled(puzzle, r, c)) {
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

/** Get the next clue in the list, wrapping around. */
export function getNextClue(
  puzzle: Puzzle,
  direction: Direction,
  currentClue: Clue,
): { clue: Clue; direction: Direction } {
  const clueList =
    direction === "across" ? puzzle.clues.across : puzzle.clues.down;

  const idx = clueList.findIndex((c) => c.number === currentClue.number);

  if (idx < clueList.length - 1) {
    return { clue: clueList[idx + 1], direction };
  }

  // Wrap to other direction
  const otherDirection: Direction = direction === "across" ? "down" : "across";
  const otherList =
    otherDirection === "across" ? puzzle.clues.across : puzzle.clues.down;
  return { clue: otherList[0], direction: otherDirection };
}

/** Get the previous clue in the list, wrapping around. */
export function getPreviousClue(
  puzzle: Puzzle,
  direction: Direction,
  currentClue: Clue,
): { clue: Clue; direction: Direction } {
  const clueList =
    direction === "across" ? puzzle.clues.across : puzzle.clues.down;

  const idx = clueList.findIndex((c) => c.number === currentClue.number);

  if (idx > 0) {
    return { clue: clueList[idx - 1], direction };
  }

  // Wrap to other direction
  const otherDirection: Direction = direction === "across" ? "down" : "across";
  const otherList =
    otherDirection === "across" ? puzzle.clues.across : puzzle.clues.down;
  return { clue: otherList[otherList.length - 1], direction: otherDirection };
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
): { cursor: CursorPosition; direction: Direction } | null {
  // Try to find next cell in current word
  const next = getNextCellInWord(
    puzzle,
    clue,
    direction,
    currentRow,
    currentCol,
    settings.skip_filled,
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
