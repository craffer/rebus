import { useCallback, useState } from "react";
import { usePuzzleLoader } from "../hooks/usePuzzleLoader";
import { useLibraryStore } from "../store/libraryStore";
import PuzzleLibrary from "./PuzzleLibrary";

const PUZZLE_EXTENSIONS = new Set(["puz", "ipuz", "jpz", "xml"]);

function isPuzzleFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return PUZZLE_EXTENSIONS.has(ext);
}

export default function WelcomeScreen() {
  const { openPuzzleFile, openPuzzleByPath, error, loading } =
    usePuzzleLoader();
  const libraryLoaded = useLibraryStore((s) => s.loaded);
  const hasEntries = useLibraryStore((s) => s.entries.length > 0);
  const hasFolders = useLibraryStore((s) => s.folders.length > 0);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDropFiles = useCallback(
    async (paths: string[]) => {
      for (const path of paths) {
        await openPuzzleByPath(path);
      }
    },
    [openPuzzleByPath],
  );

  // Drag-and-drop on the whole welcome screen (for when library is empty)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const paths: string[] = [];
      for (const file of files) {
        if (isPuzzleFile(file.name)) {
          const filePath = (file as File & { path?: string }).path ?? file.name;
          paths.push(filePath);
        }
      }
      if (paths.length > 0) {
        handleDropFiles(paths);
      }
    },
    [handleDropFiles],
  );

  const showLibrary = libraryLoaded && (hasEntries || hasFolders);

  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto bg-white dark:bg-gray-900"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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

        {/* Drop zone hint when no library yet */}
        {!showLibrary && isDragOver && (
          <div className="mx-auto mt-6 w-full max-w-md rounded-xl border-2 border-dashed border-blue-400 bg-blue-50 p-8 dark:border-blue-500 dark:bg-blue-900/30">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Drop puzzle files here to import
            </p>
          </div>
        )}
      </div>

      {/* Library grid */}
      {showLibrary && (
        <div className="pb-8">
          <PuzzleLibrary
            onOpenPuzzle={openPuzzleByPath}
            onDropFiles={handleDropFiles}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
