import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  useLibraryStore,
  getEntryStatus,
  getDisplayTitle,
  filterAndSortEntries,
} from "../store/libraryStore";
import { formatTime, formatDate } from "../utils/formatting";
import type {
  LibraryEntry,
  LibraryFolder,
  PuzzleStatus,
  LibrarySortField,
  LibraryFilterStatus,
} from "../types/library";

interface PuzzleLibraryProps {
  onOpenPuzzle: (filePath: string) => void;
  onDropFiles?: (filePaths: string[]) => void;
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

function SolveQualityBadge({ entry }: { entry: LibraryEntry }) {
  if (!entry.isSolved) return null;

  if (entry.usedHelp) {
    return (
      <span className="ml-1.5 inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
        Assisted
      </span>
    );
  }

  return (
    <span className="ml-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
      Clean Solve
    </span>
  );
}

function PuzzleCard({
  entry,
  onOpen,
  onRemove,
  onRename,
  onMove,
  folders,
  loading,
}: {
  entry: LibraryEntry;
  onOpen: (filePath: string) => void;
  onRemove: (filePath: string) => void;
  onRename: (filePath: string, title: string) => void;
  onMove: (filePath: string, folderId: string | undefined) => void;
  folders: LibraryFolder[];
  loading: boolean;
}) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const status = getEntryStatus(entry);
  const displayTitle = getDisplayTitle(entry);

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

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  }, []);

  const startRename = useCallback(() => {
    setRenameValue(displayTitle);
    setIsRenaming(true);
    setShowContextMenu(false);
  }, [displayTitle]);

  const confirmRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== entry.title) {
      onRename(entry.filePath, trimmed);
    } else if (trimmed === entry.title) {
      // Reset to original title (clear custom title)
      onRename(entry.filePath, "");
    }
    setIsRenaming(false);
  }, [renameValue, entry.filePath, entry.title, onRename]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmRename();
      } else if (e.key === "Escape") {
        setIsRenaming(false);
      }
    },
    [confirmRename],
  );

  return (
    <button
      onClick={() => !isRenaming && onOpen(entry.filePath)}
      onContextMenu={handleContextMenu}
      disabled={loading}
      className="relative rounded-lg border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-md disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Status badge + solve quality */}
      <div className="flex flex-wrap items-center">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
        <SolveQualityBadge entry={entry} />
      </div>

      {/* Title (editable when renaming) */}
      {isRenaming ? (
        <input
          ref={renameInputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={confirmRename}
          onKeyDown={handleRenameKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-sm font-semibold text-gray-900 outline-none dark:border-blue-600 dark:bg-gray-700 dark:text-gray-100"
        />
      ) : (
        <h3 className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {displayTitle}
        </h3>
      )}

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
              ? entry.usedHelp
                ? "bg-yellow-500"
                : "bg-green-500"
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
              startRename();
            }}
            className="block w-full px-4 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Rename
          </button>
          {folders.length > 0 && (
            <>
              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
              <p className="px-4 py-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                Move to...
              </p>
              {entry.folderId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(entry.filePath, undefined);
                    setShowContextMenu(false);
                  }}
                  className="block w-full px-4 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Root
                </button>
              )}
              {folders
                .filter((f) => f.id !== entry.folderId)
                .map((f) => (
                  <button
                    key={f.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(entry.filePath, f.id);
                      setShowContextMenu(false);
                    }}
                    className="block w-full px-4 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {f.name}
                  </button>
                ))}
            </>
          )}
          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
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

function FolderCard({
  folder,
  entryCount,
  onOpen,
  onRename,
  onRemove,
}: {
  folder: LibraryFolder;
  entryCount: number;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  }, []);

  const startRename = useCallback(() => {
    setRenameValue(folder.name);
    setIsRenaming(true);
    setShowContextMenu(false);
  }, [folder.name]);

  const confirmRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      onRename(folder.id, trimmed);
    }
    setIsRenaming(false);
  }, [renameValue, folder.id, folder.name, onRename]);

  return (
    <button
      onClick={() => !isRenaming && onOpen(folder.id)}
      onContextMenu={handleContextMenu}
      className="relative flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50"
    >
      {/* Folder icon */}
      <svg
        className="h-8 w-8 shrink-0 text-blue-500 dark:text-blue-400"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
      </svg>
      <div className="min-w-0 flex-1">
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={confirmRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmRename();
              } else if (e.key === "Escape") {
                setIsRenaming(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-sm font-semibold text-gray-900 outline-none dark:border-blue-600 dark:bg-gray-700 dark:text-gray-100"
          />
        ) : (
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {folder.name}
          </h3>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {entryCount} {entryCount === 1 ? "puzzle" : "puzzles"}
        </p>
      </div>

      {/* Context menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="absolute right-2 top-2 z-20 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              startRename();
            }}
            className="block w-full px-4 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Rename
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(folder.id);
              setShowContextMenu(false);
            }}
            className="block w-full px-4 py-1.5 text-left text-xs text-red-600 hover:bg-gray-50 dark:text-red-400 dark:hover:bg-gray-700"
          >
            Delete folder
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

const PUZZLE_EXTENSIONS = new Set(["puz", "ipuz", "jpz", "xml"]);

function isPuzzleFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return PUZZLE_EXTENSIONS.has(ext);
}

export default function PuzzleLibrary({
  onOpenPuzzle,
  onDropFiles,
  loading,
}: PuzzleLibraryProps) {
  const rawEntries = useLibraryStore((s) => s.entries);
  const folders = useLibraryStore((s) => s.folders);
  const currentFolderId = useLibraryStore((s) => s.currentFolderId);
  const sortField = useLibraryStore((s) => s.sortField);
  const sortOrder = useLibraryStore((s) => s.sortOrder);
  const filterStatus = useLibraryStore((s) => s.filterStatus);
  const entries = useMemo(
    () =>
      filterAndSortEntries(
        rawEntries,
        filterStatus,
        sortField,
        sortOrder,
        currentFolderId,
      ),
    [rawEntries, filterStatus, sortField, sortOrder, currentFolderId],
  );
  const setSortField = useLibraryStore((s) => s.setSortField);
  const setSortOrder = useLibraryStore((s) => s.setSortOrder);
  const setFilterStatus = useLibraryStore((s) => s.setFilterStatus);
  const removeEntry = useLibraryStore((s) => s.removeEntry);
  const renameEntry = useLibraryStore((s) => s.renameEntry);
  const moveEntry = useLibraryStore((s) => s.moveEntry);
  const addFolder = useLibraryStore((s) => s.addFolder);
  const renameFolderAction = useLibraryStore((s) => s.renameFolder);
  const removeFolderAction = useLibraryStore((s) => s.removeFolder);
  const setCurrentFolder = useLibraryStore((s) => s.setCurrentFolder);
  const totalCount = useLibraryStore((s) => s.entries.length);

  const [isDragOver, setIsDragOver] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderRef = useRef<HTMLInputElement>(null);

  // Folders visible in the current view
  const visibleFolders = useMemo(
    () => folders.filter((f) => f.parentId === currentFolderId),
    [folders, currentFolderId],
  );

  // Count entries per folder
  const folderEntryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of folders) {
      counts[f.id] = rawEntries.filter((e) => e.folderId === f.id).length;
    }
    return counts;
  }, [folders, rawEntries]);

  useEffect(() => {
    if (showNewFolder && newFolderRef.current) {
      newFolderRef.current.focus();
    }
  }, [showNewFolder]);

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

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (!onDropFiles) return;

      const files = Array.from(e.dataTransfer.files);
      const puzzleFiles = files
        .filter((f) => isPuzzleFile(f.name))
        .map((f) => f.name);

      // For Tauri, file paths come through dataTransfer.files
      // Use the webkitRelativePath or name — Tauri provides full paths
      const paths: string[] = [];
      for (const file of files) {
        if (isPuzzleFile(file.name)) {
          // In Tauri, File objects from drag-drop have a `path` property
          const filePath = (file as File & { path?: string }).path ?? file.name;
          paths.push(filePath);
        }
      }

      if (paths.length > 0) {
        onDropFiles(paths);
      } else if (puzzleFiles.length === 0 && files.length > 0) {
        // Files were dropped but none are puzzle files — no-op
      }
    },
    [onDropFiles],
  );

  const handleCreateFolder = useCallback(() => {
    const trimmed = newFolderName.trim();
    if (trimmed) {
      addFolder(trimmed, currentFolderId);
    }
    setNewFolderName("");
    setShowNewFolder(false);
  }, [newFolderName, addFolder, currentFolderId]);

  if (totalCount === 0 && folders.length === 0) {
    return null;
  }

  const currentFolder = currentFolderId
    ? folders.find((f) => f.id === currentFolderId)
    : undefined;

  return (
    <div
      className={`mx-auto w-full max-w-3xl px-6 ${
        isDragOver
          ? "rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/20"
          : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentFolder && (
            <button
              onClick={() => setCurrentFolder(currentFolder.parentId)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              title="Back"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {currentFolder ? currentFolder.name : "Your Puzzles"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {/* New folder button */}
          <button
            onClick={() => setShowNewFolder(true)}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="New folder"
          >
            + Folder
          </button>
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

      {/* New folder input */}
      {showNewFolder && (
        <div className="mb-3 flex items-center gap-2">
          <input
            ref={newFolderRef}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateFolder();
              } else if (e.key === "Escape") {
                setShowNewFolder(false);
                setNewFolderName("");
              }
            }}
            placeholder="Folder name"
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-500"
          />
          <button
            onClick={handleCreateFolder}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Create
          </button>
          <button
            onClick={() => {
              setShowNewFolder(false);
              setNewFolderName("");
            }}
            className="rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Drag-and-drop hint */}
      {isDragOver && (
        <div className="mb-4 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50 p-6 text-center dark:border-blue-500 dark:bg-blue-900/30">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Drop puzzle files here to import
          </p>
          <p className="mt-1 text-xs text-blue-500 dark:text-blue-400">
            Supports .puz, .ipuz, .jpz files
          </p>
        </div>
      )}

      {/* Folder grid */}
      {visibleFolders.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visibleFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              entryCount={folderEntryCounts[folder.id] ?? 0}
              onOpen={setCurrentFolder}
              onRename={renameFolderAction}
              onRemove={removeFolderAction}
            />
          ))}
        </div>
      )}

      {/* Card grid */}
      {entries.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map((entry) => (
            <PuzzleCard
              key={entry.filePath}
              entry={entry}
              onOpen={onOpenPuzzle}
              onRemove={removeEntry}
              onRename={renameEntry}
              onMove={moveEntry}
              folders={folders}
              loading={loading}
            />
          ))}
        </div>
      ) : visibleFolders.length === 0 ? (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500">
          {totalCount === 0
            ? "Drop puzzle files here or click Open Puzzle to get started."
            : "No puzzles match the current filter."}
        </p>
      ) : null}
    </div>
  );
}
