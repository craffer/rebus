import { useCallback, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { info, error as logError } from "@tauri-apps/plugin-log";
import { usePuzzleLoader } from "../hooks/usePuzzleLoader";
import { useDragDrop } from "../hooks/useDragDrop";
import { useLibraryStore } from "../store/libraryStore";
import { puzzleIdFromPath } from "../utils/progressPersistence";
import type { Puzzle } from "../types/puzzle";
import type { LibraryEntry } from "../types/library";
import PuzzleLibrary from "./PuzzleLibrary";

export default function WelcomeScreen() {
  const { openPuzzleFile, openPuzzleByPath, error, loading } =
    usePuzzleLoader();
  const libraryLoaded = useLibraryStore((s) => s.loaded);
  const hasEntries = useLibraryStore((s) => s.entries.length > 0);
  const hasFolders = useLibraryStore((s) => s.folders.length > 0);

  // Track whether we're in an internal (puzzle card) drag vs external file drag
  const [isInternalDrag, setIsInternalDrag] = useState(false);

  useEffect(() => {
    const handleDragStart = () => setIsInternalDrag(true);
    const handleDragEnd = () => setIsInternalDrag(false);
    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("dragend", handleDragEnd);
    return () => {
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("dragend", handleDragEnd);
    };
  }, []);

  // Drag-drop imports files to library WITHOUT opening them
  const handleDropFiles = useCallback(async (paths: string[]) => {
    for (const path of paths) {
      try {
        // Parse the puzzle to get metadata, but don't open it in the solver
        const puzzle = await invoke<Puzzle>("open_puzzle", {
          filePath: path,
        });
        const entry: LibraryEntry = {
          filePath: path,
          puzzleId: puzzleIdFromPath(path),
          title: puzzle.title || "Untitled",
          author: puzzle.author || "",
          dateOpened: Date.now(),
          completionPercent: 0,
          isSolved: false,
          usedHelp: false,
          elapsedSeconds: 0,
          width: puzzle.width,
          height: puzzle.height,
        };
        useLibraryStore.getState().addOrUpdateEntry(entry);
        info(`Imported to library: ${path.split("/").pop()}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logError(`Failed to import puzzle: ${message}`);
      }
    }
  }, []);

  // Tauri v2 drag-drop: listens for native file drop events
  const { isDragOver } = useDragDrop(handleDropFiles);

  const showLibrary = libraryLoaded && (hasEntries || hasFolders);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-white dark:bg-gray-900">
      {/* Hero section */}
      <div
        className={`text-center ${showLibrary ? "pb-6 pt-10" : "flex flex-1 flex-col items-center justify-center"}`}
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Rebus
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {showLibrary
            ? "Pick up where you left off, or open a new puzzle."
            : "Open a crossword puzzle file to get started."}
        </p>
        <button
          onClick={openPuzzleFile}
          disabled={loading}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Opening..." : "Open Puzzle"}
        </button>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Supports .puz, .ipuz, and .jpz files — or drag and drop
        </p>
        {error && (
          <p className="mx-auto mt-4 max-w-md text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* Library grid */}
      {showLibrary && (
        <div className="pb-8">
          <PuzzleLibrary
            onOpenPuzzle={openPuzzleByPath}
            isDragOver={isDragOver}
            loading={loading}
            isInternalDrag={isInternalDrag}
          />
        </div>
      )}
    </div>
  );
}
