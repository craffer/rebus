import { usePuzzleStore } from "../store/puzzleStore";
import { usePuzzleLoader } from "../hooks/usePuzzleLoader";
import Timer from "./Timer";

export default function Toolbar() {
  const puzzle = usePuzzleStore((s) => s.puzzle);
  const isSolved = usePuzzleStore((s) => s.isSolved);
  const { openPuzzleFile } = usePuzzleLoader();

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-4">
        <button
          onClick={openPuzzleFile}
          className="rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Open
        </button>
        {puzzle && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {puzzle.title}
            </span>
            {puzzle.author && (
              <span className="ml-2 text-gray-400 dark:text-gray-500">
                by {puzzle.author}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isSolved && (
          <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
            Solved!
          </span>
        )}
        <Timer />
      </div>
    </div>
  );
}
