import { usePuzzleLoader } from "../hooks/usePuzzleLoader";
import { useLibraryStore } from "../store/libraryStore";
import PuzzleLibrary from "./PuzzleLibrary";

export default function WelcomeScreen() {
  const { openPuzzleFile, openPuzzleByPath, error, loading } =
    usePuzzleLoader();
  const libraryLoaded = useLibraryStore((s) => s.loaded);
  const hasEntries = useLibraryStore((s) => s.entries.length > 0);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-white dark:bg-gray-900">
      {/* Hero section */}
      <div
        className={`text-center ${hasEntries ? "pb-6 pt-10" : "flex flex-1 flex-col items-center justify-center"}`}
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Rebus
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {hasEntries
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
          Supports .puz, .ipuz, and .jpz files
        </p>
        {error && (
          <p className="mx-auto mt-4 max-w-md text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* Library grid */}
      {libraryLoaded && hasEntries && (
        <div className="pb-8">
          <PuzzleLibrary onOpenPuzzle={openPuzzleByPath} loading={loading} />
        </div>
      )}
    </div>
  );
}
