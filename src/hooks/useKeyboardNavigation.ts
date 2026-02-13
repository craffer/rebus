import { useEffect } from "react";
import { usePuzzleStore, selectCurrentClue } from "../store/puzzleStore";
import { useSettingsStore } from "../store/settingsStore";
import {
  getAdjacentCell,
  getNextCellAfterInput,
  getPreviousCellInWord,
  getNextClue,
  getPreviousClue,
  getFirstBlankInWord,
  findClueAtPosition,
  getPreviousWordLastCell,
} from "../utils/gridNavigation";
import type { Direction } from "../types/puzzle";

/**
 * Hook that handles all keyboard input for crossword solving.
 * Attaches a keydown listener to the window.
 * All behavior is driven by the settings store.
 */
export function useKeyboardNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = usePuzzleStore.getState();
      const { puzzle, cursor, direction } = state;
      if (!puzzle || state.isSolved) return;

      // Block all puzzle input when timer is paused
      if (!state.timerRunning) return;

      const settings = useSettingsStore.getState().settings.navigation;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown": {
          e.preventDefault();
          handleArrowKey(e.key, state, settings.arrow_key_behavior);
          break;
        }

        case "Tab": {
          e.preventDefault();
          const currentClue = selectCurrentClue(state);
          if (!currentClue) break;

          const { clue: targetClue, direction: targetDir } = e.shiftKey
            ? getPreviousClue(puzzle, direction, currentClue)
            : getNextClue(puzzle, direction, currentClue);

          const blank = getFirstBlankInWord(puzzle, targetClue, targetDir);
          state.setCursor(
            blank?.row ?? targetClue.row,
            blank?.col ?? targetClue.col,
          );
          state.setDirection(targetDir);
          break;
        }

        case "Enter": {
          e.preventDefault();
          const currentClue = selectCurrentClue(state);
          if (!currentClue) break;

          const { clue: targetClue, direction: targetDir } = getNextClue(
            puzzle,
            direction,
            currentClue,
          );

          const blank = getFirstBlankInWord(puzzle, targetClue, targetDir);
          state.setCursor(
            blank?.row ?? targetClue.row,
            blank?.col ?? targetClue.col,
          );
          state.setDirection(targetDir);
          break;
        }

        case " ": {
          e.preventDefault();
          if (settings.spacebar_behavior === "toggle_direction") {
            state.toggleDirection();
          } else {
            // Clear current cell and advance
            state.setCellValue(cursor.row, cursor.col, null);
            const currentClue = selectCurrentClue(state);
            if (currentClue) {
              const next = getNextCellAfterInput(
                puzzle,
                currentClue,
                direction,
                cursor.row,
                cursor.col,
                { ...settings, skip_filled: false },
              );
              if (next) {
                state.setCursor(next.cursor.row, next.cursor.col);
                state.setDirection(next.direction);
              }
            }
          }
          break;
        }

        case "Backspace": {
          e.preventDefault();
          const cell = puzzle.grid[cursor.row][cursor.col];
          if (cell.player_value) {
            // Clear current cell
            state.setCellValue(cursor.row, cursor.col, null);
          } else {
            // Move back to previous cell
            const currentClue = selectCurrentClue(state);
            if (!currentClue) break;

            const prev = getPreviousCellInWord(
              puzzle,
              currentClue,
              direction,
              cursor.row,
              cursor.col,
            );
            if (prev) {
              state.setCursor(prev.row, prev.col);
              state.setCellValue(prev.row, prev.col, null);
            } else if (settings.backspace_into_previous_word) {
              const prevWordCell = getPreviousWordLastCell(
                puzzle,
                direction,
                currentClue,
              );
              if (prevWordCell) {
                // Find the direction for the previous word
                const { direction: prevDir } = getPreviousClue(
                  puzzle,
                  direction,
                  currentClue,
                );
                state.setCursor(prevWordCell.row, prevWordCell.col);
                state.setDirection(prevDir);
                state.setCellValue(prevWordCell.row, prevWordCell.col, null);
              }
            }
          }
          break;
        }

        case "Delete": {
          e.preventDefault();
          state.setCellValue(cursor.row, cursor.col, null);
          break;
        }

        default: {
          // Letter input
          if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
            e.preventDefault();
            if (e.metaKey || e.ctrlKey || e.altKey) break;

            state.setCellValue(cursor.row, cursor.col, e.key.toUpperCase());

            // Advance cursor
            const currentClue = selectCurrentClue(usePuzzleStore.getState());
            if (currentClue) {
              const next = getNextCellAfterInput(
                puzzle,
                currentClue,
                direction,
                cursor.row,
                cursor.col,
                settings,
              );
              if (next) {
                state.setCursor(next.cursor.row, next.cursor.col);
                state.setDirection(next.direction);
              }
            }

            // Check if puzzle is complete
            usePuzzleStore.getState().checkSolution();
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

function handleArrowKey(
  key: string,
  state: ReturnType<typeof usePuzzleStore.getState>,
  arrowBehavior: "stay" | "move",
) {
  const { puzzle, cursor, direction } = state;
  if (!puzzle) return;

  const keyToDirection: Record<string, Direction> = {
    ArrowLeft: "across",
    ArrowRight: "across",
    ArrowUp: "down",
    ArrowDown: "down",
  };

  const arrowDirection = keyToDirection[key];
  const isDirectionChange = arrowDirection !== direction;

  if (isDirectionChange) {
    // Check if the cell actually belongs to a word in the new direction
    const clueInNewDir = findClueAtPosition(
      puzzle,
      cursor.row,
      cursor.col,
      arrowDirection,
    );

    if (clueInNewDir) {
      state.setDirection(arrowDirection);
      if (arrowBehavior === "move") {
        // Also move in the arrow direction
        const dRow = key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : 0;
        const dCol = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
        const next = getAdjacentCell(
          puzzle,
          cursor.row,
          cursor.col,
          dRow,
          dCol,
        );
        if (next) {
          state.setCursor(next.row, next.col);
        }
      }
      return;
    }
    // No word in that direction — fall through to move
  }

  // Move in the arrow direction
  const dRow = key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : 0;
  const dCol = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;

  const next = getAdjacentCell(puzzle, cursor.row, cursor.col, dRow, dCol);
  if (next) {
    state.setCursor(next.row, next.col);
    // Set direction to match arrow if we moved
    state.setDirection(arrowDirection);
  }
}
