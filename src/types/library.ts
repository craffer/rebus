export type PuzzleStatus = "not_started" | "in_progress" | "completed";

export interface LibraryEntry {
  filePath: string;
  puzzleId: string; // hash of file path (same as progress)
  title: string;
  author: string;
  dateOpened: number; // Date.now() timestamp
  completionPercent: number; // 0-100
  isSolved: boolean;
  elapsedSeconds: number; // time spent solving
  width: number;
  height: number;
}

export type LibrarySortField = "dateOpened" | "title" | "status";
export type LibrarySortOrder = "asc" | "desc";
export type LibraryFilterStatus = "all" | PuzzleStatus;
