import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { info } from "@tauri-apps/plugin-log";
import type {
  LibraryEntry,
  LibrarySortField,
  LibrarySortOrder,
  LibraryFilterStatus,
  PuzzleStatus,
} from "../types/library";
import { loadLibrary, saveLibrary } from "../utils/libraryPersistence";

export interface LibraryState {
  entries: LibraryEntry[];
  loaded: boolean;
  sortField: LibrarySortField;
  sortOrder: LibrarySortOrder;
  filterStatus: LibraryFilterStatus;

  _initLibrary: () => Promise<void>;
  addOrUpdateEntry: (entry: LibraryEntry) => void;
  removeEntry: (filePath: string) => void;
  setSortField: (field: LibrarySortField) => void;
  setSortOrder: (order: LibrarySortOrder) => void;
  setFilterStatus: (status: LibraryFilterStatus) => void;
}

export function getEntryStatus(entry: LibraryEntry): PuzzleStatus {
  if (entry.isSolved) return "completed";
  if (entry.completionPercent > 0) return "in_progress";
  return "not_started";
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(entries: LibraryEntry[]) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveLibrary(entries);
  }, 500);
}

export const useLibraryStore = create<LibraryState>()(
  immer((set, get) => ({
    entries: [],
    loaded: false,
    sortField: "dateOpened",
    sortOrder: "desc",
    filterStatus: "all",

    _initLibrary: async () => {
      const entries = await loadLibrary();
      set((state) => {
        state.entries = entries;
        state.loaded = true;
      });
      info(`Library loaded: ${entries.length} entries`);
    },

    addOrUpdateEntry: (entry: LibraryEntry) => {
      set((state) => {
        const idx = state.entries.findIndex(
          (e) => e.filePath === entry.filePath,
        );
        if (idx >= 0) {
          state.entries[idx] = entry;
        } else {
          state.entries.push(entry);
        }
      });
      debouncedSave(get().entries);
    },

    removeEntry: (filePath: string) => {
      set((state) => {
        state.entries = state.entries.filter((e) => e.filePath !== filePath);
      });
      debouncedSave(get().entries);
      info(`Removed from library: ${filePath}`);
    },

    setSortField: (field: LibrarySortField) => {
      set((state) => {
        state.sortField = field;
      });
    },

    setSortOrder: (order: LibrarySortOrder) => {
      set((state) => {
        state.sortOrder = order;
      });
    },

    setFilterStatus: (status: LibraryFilterStatus) => {
      set((state) => {
        state.filterStatus = status;
      });
    },
  })),
);

/** Filter and sort entries — pure function safe for useMemo. */
export function filterAndSortEntries(
  entries: LibraryEntry[],
  filterStatus: LibraryFilterStatus,
  sortField: LibrarySortField,
  sortOrder: LibrarySortOrder,
): LibraryEntry[] {
  let result = [...entries];

  if (filterStatus !== "all") {
    result = result.filter((e) => getEntryStatus(e) === filterStatus);
  }

  result.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "dateOpened":
        cmp = a.dateOpened - b.dateOpened;
        break;
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "status": {
        const order: Record<PuzzleStatus, number> = {
          in_progress: 0,
          not_started: 1,
          completed: 2,
        };
        cmp = order[getEntryStatus(a)] - order[getEntryStatus(b)];
        break;
      }
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  return result;
}
