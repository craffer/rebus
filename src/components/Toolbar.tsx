import { useState, useEffect, useRef } from "react";
import { usePuzzleStore } from "../store/puzzleStore";
import { usePuzzleLoader } from "../hooks/usePuzzleLoader";
import Timer from "./Timer";

interface ToolbarProps {
  onOpenSettings?: () => void;
}

export default function Toolbar({ onOpenSettings }: ToolbarProps) {
  const puzzle = usePuzzleStore((s) => s.puzzle);
  const isSolved = usePuzzleStore((s) => s.isSolved);
  const isPencilMode = usePuzzleStore((s) => s.isPencilMode);
  const isRebusMode = usePuzzleStore((s) => s.isRebusMode);
  const { openPuzzleFile } = usePuzzleLoader();

  const [checkOpen, setCheckOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const checkRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (checkRef.current && !checkRef.current.contains(e.target as Node)) {
        setCheckOpen(false);
      }
      if (revealRef.current && !revealRef.current.contains(e.target as Node)) {
        setRevealOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showCheckReveal = puzzle && puzzle.has_solution && !isSolved;

  const btnClass =
    "rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600";
  const dropdownItemClass =
    "block w-full px-4 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600";
  const dropdownClass =
    "absolute left-0 top-full z-50 mt-1 min-w-[120px] rounded border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700";

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-4">
        <button onClick={openPuzzleFile} className={btnClass}>
          Open
        </button>
        {puzzle && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {puzzle.title}
            </span>
            {puzzle.author && (
              <span className="ml-2 text-gray-400 dark:text-gray-500">
                by {puzzle.author}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showCheckReveal && (
          <>
            {/* Check dropdown */}
            <div ref={checkRef} className="relative">
              <button
                onClick={() => {
                  setCheckOpen(!checkOpen);
                  setRevealOpen(false);
                }}
                className={btnClass}
              >
                Check
              </button>
              {checkOpen && (
                <div className={dropdownClass}>
                  <button
                    className={dropdownItemClass}
                    onClick={() => {
                      const s = usePuzzleStore.getState();
                      s.checkCell(s.cursor.row, s.cursor.col);
                      setCheckOpen(false);
                    }}
                  >
                    Square
                  </button>
                  <button
                    className={dropdownItemClass}
                    onClick={() => {
                      usePuzzleStore.getState().checkWord();
                      setCheckOpen(false);
                    }}
                  >
                    Word
                  </button>
                  <button
                    className={dropdownItemClass}
                    onClick={() => {
                      usePuzzleStore.getState().checkPuzzle();
                      setCheckOpen(false);
                    }}
                  >
                    Puzzle
                  </button>
                </div>
              )}
            </div>

            {/* Reveal dropdown */}
            <div ref={revealRef} className="relative">
              <button
                onClick={() => {
                  setRevealOpen(!revealOpen);
                  setCheckOpen(false);
                }}
                className={btnClass}
              >
                Reveal
              </button>
              {revealOpen && (
                <div className={dropdownClass}>
                  <button
                    className={dropdownItemClass}
                    onClick={() => {
                      const s = usePuzzleStore.getState();
                      s.revealCell(s.cursor.row, s.cursor.col);
                      setRevealOpen(false);
                    }}
                  >
                    Square
                  </button>
                  <button
                    className={dropdownItemClass}
                    onClick={() => {
                      usePuzzleStore.getState().revealWord();
                      setRevealOpen(false);
                    }}
                  >
                    Word
                  </button>
                  <button
                    className={dropdownItemClass}
                    onClick={() => {
                      usePuzzleStore.getState().revealPuzzle();
                      setRevealOpen(false);
                    }}
                  >
                    Puzzle
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Pencil toggle */}
        {puzzle && !isSolved && (
          <button
            onClick={() => usePuzzleStore.getState().togglePencilMode()}
            className={
              isPencilMode
                ? "rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600"
                : btnClass
            }
            title="Pencil mode"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="inline"
            >
              <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
        )}

        {/* Rebus button */}
        {puzzle && !isSolved && (
          <button
            onClick={() => {
              const s = usePuzzleStore.getState();
              if (s.isRebusMode) {
                s.confirmRebus();
              } else {
                s.activateRebusMode();
              }
            }}
            className={
              isRebusMode
                ? "rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600"
                : btnClass
            }
          >
            Rebus
          </button>
        )}

        {isSolved && (
          <>
            <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
              Solved!
            </span>
            <button
              onClick={() => usePuzzleStore.getState().resetPuzzle()}
              className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Reset
            </button>
          </>
        )}
        <Timer />
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            title="Settings"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
