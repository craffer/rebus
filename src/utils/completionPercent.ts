import type { Puzzle } from "../types/puzzle";

/** Compute the percentage of letter cells that have a player value (0-100). */
export function computeCompletionPercent(puzzle: Puzzle): number {
  let total = 0;
  let filled = 0;
  for (let r = 0; r < puzzle.height; r++) {
    for (let c = 0; c < puzzle.width; c++) {
      const cell = puzzle.grid[r][c];
      if (cell.kind === "letter") {
        total++;
        if (cell.player_value) filled++;
      }
    }
  }
  if (total === 0) return 0;
  return Math.round((filled / total) * 100);
}
