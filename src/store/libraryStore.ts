import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { info } from "@tauri-apps/plugin-log";
import type {
  LibraryEntry,
  LibraryFolder,
  LibrarySortField,
  LibrarySortOrder,
  LibraryFilterStatus,
  PuzzleStatus,
} from "../types/library";
import {
  loadLibrary,
  saveLibrary,
  loadFolders,
  saveFolders,
} from "../utils/libraryPersistence";

export interface LibraryState {
  entries: LibraryEntry[];
  folders: LibraryFolder[];
  loaded: boolean;
  sortField: LibrarySortField;
  sortOrder: LibrarySortOrder;
  filterStatus: LibraryFilterStatus;
  currentFolderId: string | undefined; // undefined = root

  _initLibrary: () => Promise<void>;
  addOrUpdateEntry: (entry: LibraryEntry) => void;
  removeEntry: (filePath: string) => void;
  renameEntry: (filePath: string, customTitle: string) => void;
  moveEntry: (filePath: string, folderId: string | undefined) => void;
  reorderEntry: (
    filePath: string,
    targetFilePath: string,
    position: "before" | "after",
  ) => void;
  addFolder: (name: string, parentId?: string) => LibraryFolder;
  renameFolder: (id: string, name: string) => void;
  removeFolder: (id: string) => void;
  setCurrentFolder: (id: string | undefined) => void;
  setSortField: (field: LibrarySortField) => void;
  setSortOrder: (order: LibrarySortOrder) => void;
  setFilterStatus: (status: LibraryFilterStatus) => void;
}

export function getEntryStatus(entry: LibraryEntry): PuzzleStatus {
  if (entry.isSolved) return "completed";
  if (entry.completionPercent > 0) return "in_progress";
  return "not_started";
}

/** Display title: custom title if set, otherwise original title. */
export function getDisplayTitle(entry: LibraryEntry): string {
  return entry.customTitle || entry.title;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let folderSaveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(entries: LibraryEntry[]) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveLibrary(entries);
  }, 500);
}

function debouncedSaveFolders(folders: LibraryFolder[]) {
  if (folderSaveTimeout) clearTimeout(folderSaveTimeout);
  folderSaveTimeout = setTimeout(() => {
    saveFolders(folders);
  }, 500);
}

let nextFolderId = 1;

export const useLibraryStore = create<LibraryState>()(
  immer((set, get) => ({
    entries: [],
    folders: [],
    loaded: false,
    sortField: "dateOpened",
    sortOrder: "desc",
    filterStatus: "all",
    currentFolderId: undefined,

    _initLibrary: async () => {
      const [entries, folders] = await Promise.all([
        loadLibrary(),
        loadFolders(),
      ]);
      // Set nextFolderId to avoid collisions
      for (const f of folders) {
        const num = parseInt(f.id.replace("folder-", ""), 10);
        if (!isNaN(num) && num >= nextFolderId) {
          nextFolderId = num + 1;
        }
      }
      set((state) => {
        state.entries = entries;
        state.folders = folders;
        state.loaded = true;
      });
      info(
        `Library loaded: ${entries.length} entries, ${folders.length} folders`,
      );
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

    renameEntry: (filePath: string, customTitle: string) => {
      set((state) => {
        const entry = state.entries.find((e) => e.filePath === filePath);
        if (entry) {
          entry.customTitle = customTitle || undefined;
        }
      });
      debouncedSave(get().entries);
    },

    moveEntry: (filePath: string, folderId: string | undefined) => {
      set((state) => {
        const entry = state.entries.find((e) => e.filePath === filePath);
        if (entry) {
          entry.folderId = folderId;
        }
      });
      debouncedSave(get().entries);
    },

    reorderEntry: (
      filePath: string,
      targetFilePath: string,
      position: "before" | "after",
    ) => {
      if (filePath === targetFilePath) return;
      set((state) => {
        const entry = state.entries.find((e) => e.filePath === filePath);
        const target = state.entries.find((e) => e.filePath === targetFilePath);
        if (!entry || !target) return;

        // Ensure all entries in the same folder have manualOrder values
        const folderId = entry.folderId;
        const folderEntries = state.entries.filter(
          (e) => e.folderId === folderId,
        );
        // Initialize manualOrder for entries that don't have one
        const needsInit = folderEntries.some((e) => e.manualOrder == null);
        if (needsInit) {
          // Sort by dateOpened desc to establish initial order
          const sorted = [...folderEntries].sort(
            (a, b) => b.dateOpened - a.dateOpened,
          );
          sorted.forEach((e, i) => {
            const storeEntry = state.entries.find(
              (se) => se.filePath === e.filePath,
            );
            if (storeEntry && storeEntry.manualOrder == null) {
              storeEntry.manualOrder = i;
            }
          });
        }

        // Get target's order value
        const targetOrder = target.manualOrder ?? 0;

        // Set the dragged entry's order to just before or after target
        if (position === "before") {
          entry.manualOrder = targetOrder - 0.5;
        } else {
          entry.manualOrder = targetOrder + 0.5;
        }

        // Re-normalize manualOrder values for all entries in this folder
        const updated = state.entries
          .filter((e) => e.folderId === folderId)
          .sort((a, b) => (a.manualOrder ?? 0) - (b.manualOrder ?? 0));
        updated.forEach((e, i) => {
          const storeEntry = state.entries.find(
            (se) => se.filePath === e.filePath,
          );
          if (storeEntry) storeEntry.manualOrder = i;
        });
      });
      debouncedSave(get().entries);
    },

    addFolder: (name: string, parentId?: string): LibraryFolder => {
      const folder: LibraryFolder = {
        id: `folder-${nextFolderId++}`,
        name,
        parentId,
        createdAt: Date.now(),
      };
      set((state) => {
        state.folders.push(folder);
      });
      debouncedSaveFolders(get().folders);
      info(`Created folder: ${name}`);
      return folder;
    },

    renameFolder: (id: string, name: string) => {
      set((state) => {
        const folder = state.folders.find((f) => f.id === id);
        if (folder) {
          folder.name = name;
        }
      });
      debouncedSaveFolders(get().folders);
    },

    removeFolder: (id: string) => {
      set((state) => {
        // Move entries in this folder back to root
        for (const entry of state.entries) {
          if (entry.folderId === id) {
            entry.folderId = undefined;
          }
        }
        state.folders = state.folders.filter((f) => f.id !== id);
        // If we were viewing this folder, go back to root
        if (state.currentFolderId === id) {
          state.currentFolderId = undefined;
        }
      });
      debouncedSave(get().entries);
      debouncedSaveFolders(get().folders);
      info(`Removed folder: ${id}`);
    },

    setCurrentFolder: (id: string | undefined) => {
      set((state) => {
        state.currentFolderId = id;
      });
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
  folderId?: string,
): LibraryEntry[] {
  let result = [...entries];

  // Filter by folder
  result = result.filter((e) => e.folderId === folderId);

  if (filterStatus !== "all") {
    result = result.filter((e) => getEntryStatus(e) === filterStatus);
  }

  result.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "dateOpened":
        cmp = a.dateOpened - b.dateOpened;
        break;
      case "title": {
        const aTitle = getDisplayTitle(a);
        const bTitle = getDisplayTitle(b);
        cmp = aTitle.localeCompare(bTitle);
        break;
      }
      case "status": {
        const order: Record<PuzzleStatus, number> = {
          in_progress: 0,
          not_started: 1,
          completed: 2,
        };
        cmp = order[getEntryStatus(a)] - order[getEntryStatus(b)];
        break;
      }
      case "manual":
        cmp = (a.manualOrder ?? 0) - (b.manualOrder ?? 0);
        break;
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  return result;
}
