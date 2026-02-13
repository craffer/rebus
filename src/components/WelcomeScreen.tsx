import { usePuzzleLoader } from "../hooks/usePuzzleLoader";

export default function WelcomeScreen() {
  const { openPuzzleFile, error, loading } = usePuzzleLoader();

  return (
    <div className="flex flex-1 items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Rebus
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Open a crossword puzzle file to get started.
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
          <p className="mt-4 max-w-md text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
