import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  useLibraryStore,
  getEntryStatus,
  filterAndSortEntries,
} from "../store/libraryStore";
import { formatTime, formatDate } from "../utils/formatting";
import type {
  LibraryEntry,
  PuzzleStatus,
  LibrarySortField,
  LibraryFilterStatus,
} from "../types/library";

interface PuzzleLibraryProps {
  onOpenPuzzle: (filePath: string) => void;
  loading: boolean;
}

const STATUS_LABELS: Record<PuzzleStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

const STATUS_COLORS: Record<PuzzleStatus, string> = {
  not_started: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

function PuzzleCard({
  entry,
  onOpen,
  onRemove,
  loading,
}: {
  entry: LibraryEntry;
  onOpen: (filePath: string) => void;
  onRemove: (filePath: string) => void;
  loading: boolean;
}) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const status = getEntryStatus(entry);

  useEffect(() => {
    if (!showContextMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setShowContextMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showContextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  }, []);

  return (
    <button
      onClick={() => onOpen(entry.filePath)}
      onContextMenu={handleContextMenu}
      disabled={loading}
      className="relative rounded-lg border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-md disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Status badge */}
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
      >
        {STATUS_LABELS[status]}
      </span>

      {/* Title */}
      <h3 className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
        {entry.title}
      </h3>

      {/* Author */}
      {entry.author && (
        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
          {entry.author}
        </p>
      )}

      {/* Metadata row */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>
          {entry.width}&times;{entry.height}
        </span>
        {entry.elapsedSeconds > 0 && (
          <span>{formatTime(entry.elapsedSeconds)}</span>
        )}
        <span>{formatDate(entry.dateOpened)}</span>
      </div>

      {/* Completion bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${
            status === "completed"
              ? "bg-green-500"
              : entry.completionPercent > 0
                ? "bg-blue-500"
                : "bg-gray-300 dark:bg-gray-600"
          }`}
          style={{ width: `${entry.completionPercent}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">
        {entry.completionPercent}%
      </p>

      {/* Context menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="absolute right-2 top-2 z-20 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(entry.filePath);
              setShowContextMenu(false);
            }}
            className="block w-full px-4 py-1.5 text-left text-xs text-red-600 hover:bg-gray-50 dark:text-red-400 dark:hover:bg-gray-700"
          >
            Remove from library
          </button>
        </div>
      )}
    </button>
  );
}

const SORT_OPTIONS: { value: LibrarySortField; label: string }[] = [
  { value: "dateOpened", label: "Date Opened" },
  { value: "title", label: "Title" },
  { value: "status", label: "Status" },
];

const FILTER_OPTIONS: { value: LibraryFilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In Progress" },
  { value: "not_started", label: "Not Started" },
  { value: "completed", label: "Completed" },
];

export default function PuzzleLibrary({
  onOpenPuzzle,
  loading,
}: PuzzleLibraryProps) {
  const rawEntries = useLibraryStore((s) => s.entries);
  const sortField = useLibraryStore((s) => s.sortField);
  const sortOrder = useLibraryStore((s) => s.sortOrder);
  const filterStatus = useLibraryStore((s) => s.filterStatus);
  const entries = useMemo(
    () => filterAndSortEntries(rawEntries, filterStatus, sortField, sortOrder),
    [rawEntries, filterStatus, sortField, sortOrder],
  );
  const setSortField = useLibraryStore((s) => s.setSortField);
  const setSortOrder = useLibraryStore((s) => s.setSortOrder);
  const setFilterStatus = useLibraryStore((s) => s.setFilterStatus);
  const removeEntry = useLibraryStore((s) => s.removeEntry);
  const totalCount = useLibraryStore((s) => s.entries.length);

  const handleSortChange = useCallback(
    (field: LibrarySortField) => {
      if (field === sortField) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortOrder(field === "title" ? "asc" : "desc");
      }
    },
    [sortField, sortOrder, setSortField, setSortOrder],
  );

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Your Puzzles
        </h2>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as LibraryFilterStatus)
            }
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <div className="flex items-center gap-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSortChange(opt.value)}
                className={`rounded px-2 py-1 text-xs ${
                  sortField === opt.value
                    ? "bg-gray-200 font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {opt.label}
                {sortField === opt.value && (
                  <span className="ml-0.5">
                    {sortOrder === "asc" ? "\u2191" : "\u2193"}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card grid */}
      {entries.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map((entry) => (
            <PuzzleCard
              key={entry.filePath}
              entry={entry}
              onOpen={onOpenPuzzle}
              onRemove={removeEntry}
              loading={loading}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500">
          No puzzles match the current filter.
        </p>
      )}
    </div>
  );
}
