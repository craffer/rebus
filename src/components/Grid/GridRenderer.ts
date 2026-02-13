import type { Puzzle, CursorPosition, Direction } from "../../types/puzzle";
import {
  BORDER_WIDTH,
  CELL_BORDER_WIDTH,
  NUMBER_FONT_RATIO,
  LETTER_FONT_RATIO,
  NUMBER_PADDING_RATIO,
  COLORS,
  MIN_CELL_SIZE,
  MAX_CELL_SIZE,
  GRID_PADDING,
} from "./constants";

export interface GridRenderState {
  puzzle: Puzzle;
  cursor: CursorPosition;
  direction: Direction;
  wordCells: CursorPosition[] | null;
}

/**
 * Pure function that renders the entire crossword grid onto a canvas.
 * Called on every state change — fast enough at ~1ms per repaint.
 *
 * @param cellSize - The cell size in CSS pixels (computed by the container).
 */
export function renderGrid(
  ctx: CanvasRenderingContext2D,
  state: GridRenderState,
  dpr: number,
  cellSize: number,
): void {
  const { puzzle, cursor, wordCells } = state;
  const { width, height, grid } = puzzle;

  const cs = cellSize * dpr;
  const borderWidth = BORDER_WIDTH * dpr;
  const cellBorderWidth = CELL_BORDER_WIDTH * dpr;
  const numberFontSize = cellSize * NUMBER_FONT_RATIO * dpr;
  const letterFontSize = cellSize * LETTER_FONT_RATIO * dpr;
  const numberPadding = cellSize * NUMBER_PADDING_RATIO * dpr;

  // Cell is split into a number strip at the top and a letter zone below.
  // The number strip height is the number font size + padding above and below.
  const numberStripHeight = numberFontSize + numberPadding * 2;
  // The letter zone is the remaining space below the number strip.
  const letterZoneTop = numberStripHeight;
  const letterZoneCenterY = letterZoneTop + (cs - letterZoneTop) / 2;

  const totalWidth = width * cs + 2 * borderWidth;
  const totalHeight = height * cs + 2 * borderWidth;

  // Clear
  ctx.clearRect(0, 0, totalWidth, totalHeight);

  // Build a set of word cells for quick lookup
  const wordCellSet = new Set<string>();
  if (wordCells) {
    for (const cell of wordCells) {
      wordCellSet.add(`${cell.row},${cell.col}`);
    }
  }

  // Draw cells
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const cell = grid[row][col];
      const x = borderWidth + col * cs;
      const y = borderWidth + row * cs;

      // Cell background
      if (cell.kind === "black") {
        ctx.fillStyle = COLORS.blackCell;
      } else if (row === cursor.row && col === cursor.col) {
        ctx.fillStyle = COLORS.cursorCell;
      } else if (wordCellSet.has(`${row},${col}`)) {
        ctx.fillStyle = COLORS.wordHighlight;
      } else {
        ctx.fillStyle = COLORS.cellBackground;
      }
      ctx.fillRect(x, y, cs, cs);

      if (cell.kind === "black") continue;

      // Circle indicator
      if (cell.is_circled) {
        ctx.strokeStyle = COLORS.circle;
        ctx.lineWidth = cellBorderWidth;
        ctx.beginPath();
        ctx.arc(
          x + cs / 2,
          y + cs / 2,
          cs / 2 - cellBorderWidth * 2,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }

      // Clue number
      if (cell.number !== null) {
        ctx.fillStyle = COLORS.numberText;
        ctx.font = `${numberFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(
          String(cell.number),
          x + numberPadding + cellBorderWidth,
          y + numberPadding + cellBorderWidth,
        );
      }

      // Player value
      if (cell.player_value) {
        const isRebus = cell.player_value.length > 1;
        const fontSize = isRebus ? letterFontSize * 0.55 : letterFontSize;

        ctx.fillStyle = COLORS.letterText;
        if (cell.was_incorrect) ctx.fillStyle = COLORS.incorrect;
        if (cell.is_revealed) ctx.fillStyle = COLORS.revealed;

        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          cell.player_value.toUpperCase(),
          x + cs / 2,
          y + letterZoneCenterY,
        );
      }
    }
  }

  // Draw cell borders
  ctx.strokeStyle = COLORS.cellBorder;
  ctx.lineWidth = cellBorderWidth;
  for (let row = 0; row <= height; row++) {
    const y = borderWidth + row * cs;
    ctx.beginPath();
    ctx.moveTo(borderWidth, y);
    ctx.lineTo(borderWidth + width * cs, y);
    ctx.stroke();
  }
  for (let col = 0; col <= width; col++) {
    const x = borderWidth + col * cs;
    ctx.beginPath();
    ctx.moveTo(x, borderWidth);
    ctx.lineTo(x, borderWidth + height * cs);
    ctx.stroke();
  }

  // Outer border (thicker)
  ctx.strokeStyle = COLORS.gridBorder;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(
    borderWidth / 2,
    borderWidth / 2,
    width * cs + borderWidth,
    height * cs + borderWidth,
  );
}

/**
 * Convert a mouse click position (in CSS pixels relative to canvas)
 * to a grid cell coordinate.
 *
 * @param cellSize - Must match the cellSize used for rendering.
 */
export function hitTest(
  x: number,
  y: number,
  puzzle: Puzzle,
  cellSize: number,
): CursorPosition | null {
  const col = Math.floor((x - BORDER_WIDTH) / cellSize);
  const row = Math.floor((y - BORDER_WIDTH) / cellSize);

  if (row < 0 || row >= puzzle.height || col < 0 || col >= puzzle.width) {
    return null;
  }

  if (puzzle.grid[row][col].kind === "black") {
    return null;
  }

  return { row, col };
}

/** Calculate the canvas dimensions in CSS pixels for a given puzzle and cell size. */
export function getCanvasDimensions(
  puzzle: Puzzle,
  cellSize: number,
): {
  width: number;
  height: number;
} {
  return {
    width: puzzle.width * cellSize + 2 * BORDER_WIDTH,
    height: puzzle.height * cellSize + 2 * BORDER_WIDTH,
  };
}

/**
 * Compute the optimal cell size to fit the puzzle within the available space.
 * Returns a value clamped between MIN_CELL_SIZE and MAX_CELL_SIZE.
 */
export function computeCellSize(
  containerWidth: number,
  containerHeight: number,
  gridCols: number,
  gridRows: number,
): number {
  const availWidth = containerWidth - 2 * GRID_PADDING;
  const availHeight = containerHeight - 2 * GRID_PADDING;

  const maxByWidth = (availWidth - 2 * BORDER_WIDTH) / gridCols;
  const maxByHeight = (availHeight - 2 * BORDER_WIDTH) / gridRows;

  const cellSize = Math.floor(Math.min(maxByWidth, maxByHeight));
  return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, cellSize));
}
