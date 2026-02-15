export type PuzzleStatus = "not_started" | "in_progress" | "completed";

export interface LibraryEntry {
  filePath: string;
  puzzleId: string; // hash of file path (same as progress)
  title: string;
  author: string;
  dateOpened: number; // Date.now() timestamp
  completionPercent: number; // 0-100
  isSolved: boolean;
  usedHelp: boolean; // true if check/reveal was used during solve
  elapsedSeconds: number; // time spent solving
  width: number;
  height: number;
  customTitle?: string; // user-assigned display name
  folderId?: string; // folder this entry belongs to (undefined = root)
  manualOrder?: number; // position for manual sorting (lower = first)
}

export interface LibraryFolder {
  id: string;
  name: string;
  parentId?: string; // for nested folders (undefined = root)
  createdAt: number;
}

export type LibrarySortField = "dateOpened" | "title" | "status" | "manual";
export type LibrarySortOrder = "asc" | "desc";
export type LibraryFilterStatus = "all" | PuzzleStatus;
