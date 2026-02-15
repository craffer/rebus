export interface PuzzleProgress {
  puzzleId: string; // hash of file path
  filePath: string; // original file path
  title: string; // puzzle title for display
  cellValues: (string | null)[]; // flat row-major array of cell values
  pencilCells: string[]; // "row,col" keys for penciled cells
  incorrectCells: string[]; // "row,col" keys for was_incorrect cells
  revealedCells: string[]; // "row,col" keys for is_revealed cells
  elapsedSeconds: number;
  isSolved: boolean;
  usedHelp: boolean; // true if check/reveal was used
  lastSaved: number; // Date.now() timestamp
}
