import { useRef, useEffect, useCallback } from "react";
import {
  usePuzzleStore,
  selectCurrentWordCells,
} from "../../store/puzzleStore";
import {
  renderGrid,
  hitTest,
  getCanvasDimensions,
  type GridRenderState,
} from "./GridRenderer";

export default function Grid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const puzzle = usePuzzleStore((s) => s.puzzle);

  // Subscribe to the store outside React for canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !puzzle) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const dims = getCanvasDimensions(puzzle);

    // Set canvas size for HiDPI
    canvas.width = dims.width * dpr;
    canvas.height = dims.height * dpr;
    canvas.style.width = `${dims.width}px`;
    canvas.style.height = `${dims.height}px`;

    // Render immediately on mount
    const state = usePuzzleStore.getState();
    const renderState: GridRenderState = {
      puzzle: state.puzzle!,
      cursor: state.cursor,
      direction: state.direction,
      wordCells: selectCurrentWordCells(state),
    };
    renderGrid(ctx, renderState, dpr);

    // Subscribe to store changes for re-rendering
    const unsub = usePuzzleStore.subscribe((s) => {
      if (!s.puzzle) return;
      const rs: GridRenderState = {
        puzzle: s.puzzle,
        cursor: s.cursor,
        direction: s.direction,
        wordCells: selectCurrentWordCells(s),
      };
      renderGrid(ctx, rs, dpr);
    });

    return unsub;
  }, [puzzle]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const state = usePuzzleStore.getState();
    if (!canvas || !state.puzzle) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cell = hitTest(x, y, state.puzzle);
    if (!cell) return;

    // Click same cell → toggle direction
    if (cell.row === state.cursor.row && cell.col === state.cursor.col) {
      state.toggleDirection();
    } else {
      state.setCursor(cell.row, cell.col);
    }
  }, []);

  if (!puzzle) return null;

  const dims = getCanvasDimensions(puzzle);

  return (
    <canvas
      ref={canvasRef}
      width={dims.width}
      height={dims.height}
      style={{ width: dims.width, height: dims.height }}
      onClick={handleClick}
      className="cursor-pointer outline-none"
      tabIndex={0}
    />
  );
}
