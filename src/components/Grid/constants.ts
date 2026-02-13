/** Base cell size in CSS pixels. Actual canvas pixels = CELL_SIZE * devicePixelRatio. */
export const CELL_SIZE = 36;

/** Thickness of the outer grid border in CSS pixels. */
export const BORDER_WIDTH = 2;

/** Thickness of inner cell borders in CSS pixels. */
export const CELL_BORDER_WIDTH = 1;

/** Font size for clue numbers in the top-left of cells. */
export const NUMBER_FONT_SIZE = 10;

/** Font size for letters in cells. */
export const LETTER_FONT_SIZE = 20;

/** Padding from top-left corner for clue numbers. */
export const NUMBER_PADDING = 2;

// Colors
export const COLORS = {
  /** Background of letter cells. */
  cellBackground: "#FFFFFF",
  /** Background of black cells. */
  blackCell: "#000000",
  /** Outer grid border. */
  gridBorder: "#000000",
  /** Inner cell borders. */
  cellBorder: "#000000",
  /** Active cell highlight. */
  cursorCell: "#FFDA00",
  /** Current word highlight. */
  wordHighlight: "#A7D8FF",
  /** Clue numbers in cells. */
  numberText: "#000000",
  /** Letters typed by the player. */
  letterText: "#000000",
  /** Circle indicator for circled cells. */
  circle: "#000000",
  /** Incorrect answer indicator. */
  incorrect: "#FF0000",
  /** Revealed cell indicator. */
  revealed: "#FF6B00",
} as const;
