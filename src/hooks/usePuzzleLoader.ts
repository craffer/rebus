import { useCallback, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { info, error as logError } from "@tauri-apps/plugin-log";
import { usePuzzleStore } from "../store/puzzleStore";
import { loadProgress } from "../utils/progressPersistence";
import { startAutoSave, stopAutoSave } from "../utils/progressAutoSave";
import type { Puzzle } from "../types/puzzle";

export function usePuzzleLoader() {
  const loadPuzzle = usePuzzleStore((s) => s.loadPuzzle);
  const restoreProgress = usePuzzleStore((s) => s.restoreProgress);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openPuzzleFile = useCallback(async () => {
    try {
      setError(null);
      const filePath = await open({
        title: "Open Crossword Puzzle",
        filters: [
          {
            name: "Crossword Puzzles",
            extensions: ["puz", "ipuz", "jpz", "xml"],
          },
        ],
        multiple: false,
        directory: false,
      });

      if (!filePath) return; // User cancelled

      setLoading(true);

      // Stop any existing auto-save from a previous puzzle
      stopAutoSave();

      const puzzle = await invoke<Puzzle>("open_puzzle", {
        filePath: filePath as string,
      });
      loadPuzzle(puzzle);

      // Check for saved progress and restore it
      const progress = await loadProgress(filePath as string);
      if (progress) {
        restoreProgress(progress);
        info(`Restored progress for: ${(filePath as string).split("/").pop()}`);
      }

      // Start auto-saving progress for this puzzle
      startAutoSave(filePath as string);

      info(`Puzzle loaded: ${(filePath as string).split("/").pop()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      logError(`Failed to open puzzle: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [loadPuzzle, restoreProgress]);

  return { openPuzzleFile, error, loading };
}
