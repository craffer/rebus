import { useCallback, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { info, error as logError } from "@tauri-apps/plugin-log";
import { usePuzzleStore } from "../store/puzzleStore";
import { useLibraryStore } from "../store/libraryStore";
import { loadProgress, puzzleIdFromPath } from "../utils/progressPersistence";
import { startAutoSave, stopAutoSave } from "../utils/progressAutoSave";
import { computeCompletionPercent } from "../utils/completionPercent";
import type { Puzzle } from "../types/puzzle";
import type { PuzzleProgress } from "../types/progress";
import type { LibraryEntry } from "../types/library";

async function loadAndOpenPuzzle(
  filePath: string,
  loadPuzzle: (puzzle: Puzzle) => void,
  restoreProgressFn: (progress: PuzzleProgress) => void,
) {
  stopAutoSave();

  const puzzle = await invoke<Puzzle>("open_puzzle", { filePath });
  loadPuzzle(puzzle);

  // Check for saved progress and restore it
  const progress = await loadProgress(filePath);
  if (progress) {
    restoreProgressFn(progress);
    info(`Restored progress for: ${filePath.split("/").pop()}`);
  }

  // Start auto-saving progress for this puzzle
  startAutoSave(filePath);

  // Add/update library entry
  const currentPuzzle = usePuzzleStore.getState().puzzle;
  const completionPercent = currentPuzzle
    ? computeCompletionPercent(currentPuzzle)
    : 0;
  const currentState = usePuzzleStore.getState();
  // Preserve existing custom title and folder assignment
  const existingEntry = useLibraryStore
    .getState()
    .entries.find((e) => e.filePath === filePath);
  const entry: LibraryEntry = {
    filePath,
    puzzleId: puzzleIdFromPath(filePath),
    title: puzzle.title || "Untitled",
    author: puzzle.author || "",
    dateOpened: Date.now(),
    completionPercent,
    isSolved: progress?.isSolved ?? false,
    usedHelp: progress?.usedHelp ?? false,
    elapsedSeconds: currentState.elapsedSeconds,
    width: puzzle.width,
    height: puzzle.height,
    customTitle: existingEntry?.customTitle,
    folderId: existingEntry?.folderId,
  };
  useLibraryStore.getState().addOrUpdateEntry(entry);

  info(`Puzzle loaded: ${filePath.split("/").pop()}`);
}

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

      if (!filePath) return;

      setLoading(true);
      await loadAndOpenPuzzle(filePath as string, loadPuzzle, restoreProgress);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      logError(`Failed to open puzzle: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [loadPuzzle, restoreProgress]);

  const openPuzzleByPath = useCallback(
    async (filePath: string) => {
      try {
        setError(null);
        setLoading(true);
        await loadAndOpenPuzzle(filePath, loadPuzzle, restoreProgress);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        logError(`Failed to open puzzle: ${message}`);
      } finally {
        setLoading(false);
      }
    },
    [loadPuzzle, restoreProgress],
  );

  return { openPuzzleFile, openPuzzleByPath, error, loading };
}
