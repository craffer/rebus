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

/** Redacted clue list shown when paused — shows numbers with gray bars. */
function RedactedClueList({ title, clues }: { title: string; clues: Clue[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h3 className="border-b border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:text-gray-500">
        {title}
      </h3>
      <ol className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {clues.map((clue) => (
          <li key={clue.number} className="flex items-center gap-2 px-2 py-1">
            <span className="text-sm text-gray-300 dark:text-gray-600">
              {clue.number}.
            </span>
            <span className="h-3 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
          </li>
        ))}
      </ol>
    </div>
  );
}

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

  // Primary = the clue you're typing into, cross = the associated other-direction clue
  const acrossPrimaryNumber =
    direction === "across" ? (currentClue?.number ?? null) : null;
  const acrossCrossNumber =
    direction === "down" ? (crossClue?.number ?? null) : null;
  const downPrimaryNumber =
    direction === "down" ? (currentClue?.number ?? null) : null;
  const downCrossNumber =
    direction === "across" ? (crossClue?.number ?? null) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Current clue display */}
      {currentClue && !isPaused && (
        <div className="border-b border-gray-200 bg-blue-50 px-3 py-2 dark:border-gray-700 dark:bg-blue-900/30">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            <span className="mr-1 text-blue-600 dark:text-blue-400">
              {currentClue.number}
              {direction === "across" ? "A" : "D"}.
            </span>
            {currentClue.text}
          </p>
        </div>
      )}

      {/* Clue lists */}
      <div className="flex min-h-0 flex-1 flex-col">
        {isPaused ? (
          <>
            <RedactedClueList title="Across" clues={puzzle.clues.across} />
            <RedactedClueList title="Down" clues={puzzle.clues.down} />
          </>
        ) : (
          <>
            <ClueList
              title="Across"
              clues={puzzle.clues.across}
              primaryClueNumber={acrossPrimaryNumber}
              crossClueNumber={acrossCrossNumber}
              completedClueNumbers={completedAcross}
              scrollToTop={scrollToTop}
              onClueClick={handleClueClick}
              direction="across"
            />
            <ClueList
              title="Down"
              clues={puzzle.clues.down}
              primaryClueNumber={downPrimaryNumber}
              crossClueNumber={downCrossNumber}
              completedClueNumbers={completedDown}
              scrollToTop={scrollToTop}
              onClueClick={handleClueClick}
              direction="down"
            />
          </>
        )}
      </div>
    </div>
  );
}
