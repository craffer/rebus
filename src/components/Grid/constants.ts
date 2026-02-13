/** Minimum cell size in CSS pixels (used as a floor). */
export const MIN_CELL_SIZE = 24;

/** Maximum cell size in CSS pixels (used as a ceiling). */
export const MAX_CELL_SIZE = 48;

/** Thickness of the outer grid border in CSS pixels. */
export const BORDER_WIDTH = 2;

/** Thickness of inner cell borders in CSS pixels. */
export const CELL_BORDER_WIDTH = 1;

/** Font sizes and padding as ratios of cell size. */
export const NUMBER_FONT_RATIO = 0.28;
export const LETTER_FONT_RATIO = 0.56;
export const NUMBER_PADDING_RATIO = 0.06;

/** Padding around the grid container in CSS pixels. */
export const GRID_PADDING = 16;

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
