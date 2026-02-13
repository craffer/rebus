/** Mirrors the Rust `CellKind` enum from xword-parser. */
export type CellKind = "black" | "letter";

/** Mirrors the Rust `Cell` struct from xword-parser. */
export interface Cell {
  kind: CellKind;
  number: number | null;
  solution: string | null;
  rebus_solution: string | null;
  player_value: string | null;
  is_circled: boolean;
  was_incorrect: boolean;
  is_revealed: boolean;
}

/** Mirrors the Rust `Clue` struct from xword-parser. */
export interface Clue {
  number: number;
  text: string;
  row: number;
  col: number;
  length: number;
}

/** Mirrors the Rust `Clues` struct from xword-parser. */
export interface Clues {
  across: Clue[];
  down: Clue[];
}

/** Mirrors the Rust `Puzzle` struct from xword-parser. */
export interface Puzzle {
  title: string;
  author: string;
  copyright: string;
  notes: string;
  width: number;
  height: number;
  grid: Cell[][];
  clues: Clues;
  has_solution: boolean;
  is_scrambled: boolean;
}

export type Direction = "across" | "down";

export interface CursorPosition {
  row: number;
  col: number;
}
