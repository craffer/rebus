import { useRef, useEffect, useCallback, useState } from "react";
import { error as logError } from "@tauri-apps/plugin-log";
import {
  usePuzzleStore,
  selectCurrentWordCells,
} from "../../store/puzzleStore";
import {
  renderGrid,
  hitTest,
  getCanvasDimensions,
  computeCellSize,
  type GridRenderState,
} from "./GridRenderer";
import { LIGHT_COLORS, DARK_COLORS } from "./constants";
import { useIsDarkMode } from "../../hooks/useTheme";

export default function Grid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const puzzle = usePuzzleStore((s) => s.puzzle);
  const [cellSize, setCellSize] = useState(36);
  const isDark = useIsDarkMode();
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  // Track current values in refs so the store subscription can read them
  const cellSizeRef = useRef(cellSize);
  cellSizeRef.current = cellSize;
  const colorsRef = useRef(colors);
  colorsRef.current = colors;

  // Observe container size and recompute cellSize
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !puzzle) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const newSize = computeCellSize(
        width,
        height,
        puzzle.width,
        puzzle.height,
      );
      setCellSize(newSize);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [puzzle]);

  // Set up canvas and subscribe to store for rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !puzzle) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      logError("Failed to get canvas 2d context");
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const dims = getCanvasDimensions(puzzle, cellSize);

    // Set canvas size for HiDPI
    canvas.width = dims.width * dpr;
    canvas.height = dims.height * dpr;
    canvas.style.width = `${dims.width}px`;
    canvas.style.height = `${dims.height}px`;

    // Render immediately
    const state = usePuzzleStore.getState();
    const renderState: GridRenderState = {
      puzzle: state.puzzle!,
      cursor: state.cursor,
      direction: state.direction,
      wordCells: selectCurrentWordCells(state),
    };
    renderGrid(ctx, renderState, dpr, cellSize, colors);

    // Subscribe to store changes for re-rendering
    const unsub = usePuzzleStore.subscribe((s) => {
      if (!s.puzzle) return;
      const rs: GridRenderState = {
        puzzle: s.puzzle,
        cursor: s.cursor,
        direction: s.direction,
        wordCells: selectCurrentWordCells(s),
      };
      renderGrid(ctx, rs, dpr, cellSizeRef.current, colorsRef.current);
    });

    return unsub;
  }, [puzzle, cellSize, colors]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const state = usePuzzleStore.getState();
    if (!canvas || !state.puzzle) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cell = hitTest(x, y, state.puzzle, cellSizeRef.current);
    if (!cell) return;

    // Click same cell → toggle direction
    if (cell.row === state.cursor.row && cell.col === state.cursor.col) {
      state.toggleDirection();
    } else {
      state.setCursor(cell.row, cell.col);
    }
  }, []);

  if (!puzzle) return null;

  return (
    <div ref={containerRef} className="flex flex-1 items-center justify-center">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="cursor-pointer outline-none"
        tabIndex={0}
      />
    </div>
  );
}
