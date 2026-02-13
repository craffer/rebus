/** Minimum cell size in CSS pixels (used as a floor). */
export const MIN_CELL_SIZE = 24;

/** Maximum cell size in CSS pixels (used as a ceiling). */
export const MAX_CELL_SIZE = 48;

/** Thickness of the outer grid border in CSS pixels. */
export const BORDER_WIDTH = 2;

/** Thickness of inner cell borders in CSS pixels. */
export const CELL_BORDER_WIDTH = 1;

/** Font sizes and padding as ratios of cell size. */
export const NUMBER_FONT_RATIO = 0.25;
export const LETTER_FONT_RATIO = 0.64;
export const NUMBER_PADDING_RATIO = 0.03;

/** Padding around the grid container in CSS pixels. */
export const GRID_PADDING = 16;

// Color palette type used by the canvas renderer
export interface ColorPalette {
  cellBackground: string;
  blackCell: string;
  gridBorder: string;
  cellBorder: string;
  cursorCell: string;
  wordHighlight: string;
  numberText: string;
  letterText: string;
  circle: string;
  incorrect: string;
  revealed: string;
}

export const LIGHT_COLORS: ColorPalette = {
  cellBackground: "#FFFFFF",
  blackCell: "#000000",
  gridBorder: "#000000",
  cellBorder: "#000000",
  cursorCell: "#FFDA00",
  wordHighlight: "#A7D8FF",
  numberText: "#000000",
  letterText: "#000000",
  circle: "#000000",
  incorrect: "#FF0000",
  revealed: "#FF6B00",
};

export const DARK_COLORS: ColorPalette = {
  cellBackground: "#2D2D2D",
  blackCell: "#1A1A1A",
  gridBorder: "#555555",
  cellBorder: "#444444",
  cursorCell: "#B8860B",
  wordHighlight: "#1E3A5F",
  numberText: "#CCCCCC",
  letterText: "#E0E0E0",
  circle: "#CCCCCC",
  incorrect: "#FF4444",
  revealed: "#FF8C42",
};

/** Default colors (light theme). */
export const COLORS = LIGHT_COLORS;
