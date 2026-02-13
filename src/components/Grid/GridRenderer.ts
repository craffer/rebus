import type { Puzzle, CursorPosition, Direction } from "../../types/puzzle";
import {
  CELL_SIZE,
  BORDER_WIDTH,
  CELL_BORDER_WIDTH,
  NUMBER_FONT_SIZE,
  LETTER_FONT_SIZE,
  NUMBER_PADDING,
  COLORS,
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
 */
export function renderGrid(
  ctx: CanvasRenderingContext2D,
  state: GridRenderState,
  dpr: number,
): void {
  const { puzzle, cursor, wordCells } = state;
  const { width, height, grid } = puzzle;

  const cellSize = CELL_SIZE * dpr;
  const borderWidth = BORDER_WIDTH * dpr;
  const cellBorderWidth = CELL_BORDER_WIDTH * dpr;
  const numberFontSize = NUMBER_FONT_SIZE * dpr;
  const letterFontSize = LETTER_FONT_SIZE * dpr;
  const numberPadding = NUMBER_PADDING * dpr;

  const totalWidth = width * cellSize + 2 * borderWidth;
  const totalHeight = height * cellSize + 2 * borderWidth;

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
      const x = borderWidth + col * cellSize;
      const y = borderWidth + row * cellSize;

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
      ctx.fillRect(x, y, cellSize, cellSize);

      if (cell.kind === "black") continue;

      // Circle indicator
      if (cell.is_circled) {
        ctx.strokeStyle = COLORS.circle;
        ctx.lineWidth = cellBorderWidth;
        ctx.beginPath();
        ctx.arc(
          x + cellSize / 2,
          y + cellSize / 2,
          cellSize / 2 - cellBorderWidth * 2,
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
          x + cellSize / 2,
          y + cellSize / 2 + (cell.number !== null ? numberFontSize * 0.3 : 0),
        );
      }
    }
  }

  // Draw cell borders
  ctx.strokeStyle = COLORS.cellBorder;
  ctx.lineWidth = cellBorderWidth;
  for (let row = 0; row <= height; row++) {
    const y = borderWidth + row * cellSize;
    ctx.beginPath();
    ctx.moveTo(borderWidth, y);
    ctx.lineTo(borderWidth + width * cellSize, y);
    ctx.stroke();
  }
  for (let col = 0; col <= width; col++) {
    const x = borderWidth + col * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, borderWidth);
    ctx.lineTo(x, borderWidth + height * cellSize);
    ctx.stroke();
  }

  // Outer border (thicker)
  ctx.strokeStyle = COLORS.gridBorder;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(
    borderWidth / 2,
    borderWidth / 2,
    width * cellSize + borderWidth,
    height * cellSize + borderWidth,
  );
}

/**
 * Convert a mouse click position (in CSS pixels relative to canvas)
 * to a grid cell coordinate.
 */
export function hitTest(
  x: number,
  y: number,
  puzzle: Puzzle,
): CursorPosition | null {
  const col = Math.floor((x - BORDER_WIDTH) / CELL_SIZE);
  const row = Math.floor((y - BORDER_WIDTH) / CELL_SIZE);

  if (row < 0 || row >= puzzle.height || col < 0 || col >= puzzle.width) {
    return null;
  }

  if (puzzle.grid[row][col].kind === "black") {
    return null;
  }

  return { row, col };
}

/** Calculate the canvas dimensions in CSS pixels for a given puzzle. */
export function getCanvasDimensions(puzzle: Puzzle): {
  width: number;
  height: number;
} {
  return {
    width: puzzle.width * CELL_SIZE + 2 * BORDER_WIDTH,
    height: puzzle.height * CELL_SIZE + 2 * BORDER_WIDTH,
  };
}
