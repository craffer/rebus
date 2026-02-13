import { usePuzzleStore } from "../store/puzzleStore";
import { usePuzzleLoader } from "../hooks/usePuzzleLoader";
import Timer from "./Timer";

interface ToolbarProps {
  onOpenSettings?: () => void;
}

export default function Toolbar({ onOpenSettings }: ToolbarProps) {
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
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            title="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.191.96.44 1.382.738l1.394-.56a1 1 0 011.176.392l.68 1.178a1 1 0 01-.196 1.196l-1.1.914c.05.26.076.527.076.8s-.026.54-.076.8l1.1.914a1 1 0 01.196 1.196l-.68 1.178a1 1 0 01-1.176.392l-1.394-.56c-.422.299-.885.547-1.382.738l-.295 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a5.961 5.961 0 01-1.382-.738l-1.394.56a1 1 0 01-1.176-.392l-.68-1.178a1 1 0 01.196-1.196l1.1-.914A5.967 5.967 0 014.633 10c0-.273.026-.54.076-.8l-1.1-.914a1 1 0 01-.196-1.196l.68-1.178a1 1 0 011.176-.392l1.394.56c.422-.299.885-.547 1.382-.738l.295-1.473zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
