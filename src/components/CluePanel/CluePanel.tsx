import { useCallback, useMemo } from "react";
import {
  usePuzzleStore,
  selectCurrentClue,
  selectCrossClue,
  isClueComplete,
} from "../../store/puzzleStore";
import type { Clue, Direction } from "../../types/puzzle";
import { useSettingsStore } from "../../store/settingsStore";
import ClueList from "./ClueList";

export default function CluePanel() {
  const puzzle = usePuzzleStore((s) => s.puzzle);
  const direction = usePuzzleStore((s) => s.direction);
  const currentClue = usePuzzleStore(selectCurrentClue);
  const crossClue = usePuzzleStore(selectCrossClue);
  const timerRunning = usePuzzleStore((s) => s.timerRunning);
  const isSolved = usePuzzleStore((s) => s.isSolved);
  const isPaused = !!puzzle && !timerRunning && !isSolved;

  const scrollToTop = useSettingsStore(
    (s) => s.settings.navigation.scroll_clue_to_top,
  );

  const handleClueClick = useCallback((clue: Clue, dir: Direction) => {
    const state = usePuzzleStore.getState();
    state.setCursor(clue.row, clue.col);
    state.setDirection(dir);
  }, []);

  // Compute which clues are fully filled in
  const grid = usePuzzleStore((s) => s.puzzle?.grid);
  const completedAcross = useMemo(() => {
    const set = new Set<number>();
    if (!puzzle || !grid) return set;
    for (const clue of puzzle.clues.across) {
      if (isClueComplete(puzzle, clue, "across")) set.add(clue.number);
    }
    return set;
  }, [puzzle, grid]);
  const completedDown = useMemo(() => {
    const set = new Set<number>();
    if (!puzzle || !grid) return set;
    for (const clue of puzzle.clues.down) {
      if (isClueComplete(puzzle, clue, "down")) set.add(clue.number);
    }
    return set;
  }, [puzzle, grid]);

  if (!puzzle) return null;

  const acrossActiveNumber =
    direction === "across"
      ? (currentClue?.number ?? null)
      : (crossClue?.number ?? null);
  const downActiveNumber =
    direction === "down"
      ? (currentClue?.number ?? null)
      : (crossClue?.number ?? null);

  if (isPaused) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-gray-400">
        <p className="text-sm">Clues hidden while paused</p>
      </div>
    );
  }

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
          completedClueNumbers={completedAcross}
          scrollToTop={scrollToTop}
          onClueClick={handleClueClick}
          direction="across"
        />
        <ClueList
          title="Down"
          clues={puzzle.clues.down}
          activeClueNumber={downActiveNumber}
          completedClueNumbers={completedDown}
          scrollToTop={scrollToTop}
          onClueClick={handleClueClick}
          direction="down"
        />
      </div>
    </div>
  );
}
