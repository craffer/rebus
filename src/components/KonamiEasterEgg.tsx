import { useEffect, useState, useMemo } from "react";

/**
 * Mini crossword grid for the Konami code easter egg.
 *
 * Layout (6 cols x 4 rows):
 *   col:  0  1  2  3  4  5
 * row 0:  .  .  .  .  C  .      1-Down: CLUE
 * row 1:  .  .  .  .  L  .
 * row 2:  .  R  E  B  U  S      2-Across: REBUS
 * row 3:  S  O  L  V  E  .      3-Across: SOLVE
 *
 * Intersections: CLUE/REBUS share U at (2,4), CLUE/SOLVE share E at (3,4)
 */

const GRID_COLS = 6;
const GRID_ROWS = 4;
const CELL_SIZE = 44;
const BORDER = 2;

interface LetterCell {
  row: number;
  col: number;
  letter: string;
  number?: number;
  /** Order in which this letter is revealed during animation */
  revealOrder: number;
}

/** All letter cells in the mini crossword, with reveal order by word */
const LETTER_CELLS: LetterCell[] = [
  // Word 1: CLUE (down) — revealed first
  { row: 0, col: 4, letter: "C", number: 1, revealOrder: 0 },
  { row: 1, col: 4, letter: "L", revealOrder: 1 },
  { row: 2, col: 4, letter: "U", revealOrder: 2 }, // shared with REBUS
  { row: 3, col: 4, letter: "E", revealOrder: 3 }, // shared with SOLVE
  // Word 2: REBUS (across) — revealed second, skip U at (2,4)
  { row: 2, col: 1, letter: "R", number: 2, revealOrder: 4 },
  { row: 2, col: 2, letter: "E", revealOrder: 5 },
  { row: 2, col: 3, letter: "B", revealOrder: 6 },
  // U at (2,4) already revealed as part of CLUE
  { row: 2, col: 5, letter: "S", revealOrder: 7 },
  // Word 3: SOLVE (across) — revealed third, skip E at (3,4)
  { row: 3, col: 0, letter: "S", number: 3, revealOrder: 8 },
  { row: 3, col: 1, letter: "O", revealOrder: 9 },
  { row: 3, col: 2, letter: "L", revealOrder: 10 },
  { row: 3, col: 3, letter: "V", revealOrder: 11 },
  // E at (3,4) already revealed as part of CLUE
];

const CLUES = [
  { number: 1, direction: "Down", text: "Hint for a solver" },
  { number: 2, direction: "Across", text: "Multiple letters, one square" },
  { number: 3, direction: "Across", text: "What you came here to do" },
];

const REVEAL_INTERVAL_MS = 120;
const AUTO_DISMISS_MS = 5000;

/** Set of (row,col) keys that are letter cells */
const letterCellSet = new Set(LETTER_CELLS.map((c) => `${c.row},${c.col}`));

interface KonamiEasterEggProps {
  onDismiss: () => void;
}

export default function KonamiEasterEgg({ onDismiss }: KonamiEasterEggProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const totalLetters = LETTER_CELLS.length;
  const allRevealed = revealedCount >= totalLetters;

  // Reveal letters one by one
  useEffect(() => {
    if (revealedCount >= totalLetters) return;
    const timer = setTimeout(
      () => setRevealedCount((c) => c + 1),
      REVEAL_INTERVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [revealedCount, totalLetters]);

  // Auto-dismiss after all letters revealed + pause
  useEffect(() => {
    if (!allRevealed) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [allRevealed, onDismiss]);

  // Build a lookup: "row,col" → LetterCell
  const cellMap = useMemo(() => {
    const map = new Map<string, LetterCell>();
    for (const cell of LETTER_CELLS) {
      const key = `${cell.row},${cell.col}`;
      // First entry for a position wins (keeps the clue number)
      if (!map.has(key)) {
        map.set(key, cell);
      }
    }
    return map;
  }, []);

  const gridWidth = GRID_COLS * CELL_SIZE + BORDER * 2;
  const gridHeight = GRID_ROWS * CELL_SIZE + BORDER * 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onDismiss}
    >
      <div
        className="flex flex-col items-center gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mini crossword grid */}
        <div
          style={{
            width: gridWidth,
            height: gridHeight,
            position: "relative",
            border: `${BORDER}px solid #000`,
            backgroundColor: "#000",
          }}
        >
          {/* Render all cells */}
          {Array.from({ length: GRID_ROWS }, (_, row) =>
            Array.from({ length: GRID_COLS }, (_, col) => {
              const key = `${row},${col}`;
              const isLetter = letterCellSet.has(key);
              const cellData = cellMap.get(key);
              const isRevealed =
                cellData !== undefined && cellData.revealOrder < revealedCount;

              return (
                <div
                  key={key}
                  style={{
                    position: "absolute",
                    left: col * CELL_SIZE,
                    top: row * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: isLetter ? "#fff" : "#000",
                    borderRight:
                      col < GRID_COLS - 1 && isLetter
                        ? "1px solid #000"
                        : undefined,
                    borderBottom:
                      row < GRID_ROWS - 1 && isLetter
                        ? "1px solid #000"
                        : undefined,
                    overflow: "hidden",
                  }}
                >
                  {isLetter && cellData && (
                    <>
                      {/* Clue number */}
                      {cellData.number !== undefined && (
                        <span
                          style={{
                            position: "absolute",
                            top: 1,
                            left: 2,
                            fontSize: 10,
                            fontWeight: 500,
                            lineHeight: 1,
                            color: "#000",
                            fontFamily:
                              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}
                        >
                          {cellData.number}
                        </span>
                      )}
                      {/* Letter */}
                      {isRevealed && (
                        <span
                          className="konami-letter-pop"
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            paddingTop: 6,
                            fontSize: 24,
                            fontWeight: 600,
                            color: "#000",
                            fontFamily:
                              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}
                        >
                          {cellData.letter}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            }),
          )}

          {/* Golden glow when all revealed */}
          {allRevealed && (
            <div
              className="konami-glow"
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: 4,
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        {/* Clues */}
        <div className="rounded-lg bg-white/95 px-5 py-3 text-left shadow-lg dark:bg-gray-800/95">
          {CLUES.map((clue) => (
            <p
              key={`${clue.number}-${clue.direction}`}
              style={{
                fontSize: 13,
                margin: "2px 0",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              className="text-gray-800 dark:text-gray-200"
            >
              <span className="font-semibold">
                {clue.number}-{clue.direction}:
              </span>{" "}
              {clue.text}
            </p>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes konami-pop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .konami-letter-pop {
          animation: konami-pop 0.25s ease-out forwards;
        }
        @keyframes konami-glow-pulse {
          0%, 100% {
            box-shadow: 0 0 8px 2px rgba(255, 218, 0, 0.4);
          }
          50% {
            box-shadow: 0 0 20px 6px rgba(255, 218, 0, 0.7);
          }
        }
        .konami-glow {
          animation: konami-glow-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
