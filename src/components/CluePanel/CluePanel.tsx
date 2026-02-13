import { useCallback } from "react";
import {
  usePuzzleStore,
  selectCurrentClue,
  selectCrossClue,
} from "../../store/puzzleStore";
import type { Clue, Direction } from "../../types/puzzle";
import ClueList from "./ClueList";

export default function CluePanel() {
  const puzzle = usePuzzleStore((s) => s.puzzle);
  const direction = usePuzzleStore((s) => s.direction);
  const currentClue = usePuzzleStore(selectCurrentClue);
  const crossClue = usePuzzleStore(selectCrossClue);

  const handleClueClick = useCallback((clue: Clue, dir: Direction) => {
    const state = usePuzzleStore.getState();
    state.setCursor(clue.row, clue.col);
    state.setDirection(dir);
  }, []);

  if (!puzzle) return null;

  const acrossActiveNumber =
    direction === "across"
      ? (currentClue?.number ?? null)
      : (crossClue?.number ?? null);
  const downActiveNumber =
    direction === "down"
      ? (currentClue?.number ?? null)
      : (crossClue?.number ?? null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Current clue display */}
      {currentClue && (
        <div className="border-b border-gray-200 bg-blue-50 px-3 py-2">
          <p className="text-sm font-medium text-blue-900">
            <span className="mr-1 text-blue-600">
              {currentClue.number}
              {direction === "across" ? "A" : "D"}.
            </span>
            {currentClue.text}
          </p>
        </div>
      )}

      {/* Clue lists */}
      <div className="flex min-h-0 flex-1 flex-col">
        <ClueList
          title="Across"
          clues={puzzle.clues.across}
          activeClueNumber={acrossActiveNumber}
          onClueClick={handleClueClick}
          direction="across"
        />
        <ClueList
          title="Down"
          clues={puzzle.clues.down}
          activeClueNumber={downActiveNumber}
          onClueClick={handleClueClick}
          direction="down"
        />
      </div>
    </div>
  );
}
