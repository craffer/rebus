import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";
import { warn, error } from "@tauri-apps/plugin-log";
import type { LibraryEntry, LibraryFolder } from "../types/library";

const LIBRARY_FILE = "recent-files.json";
const FOLDERS_FILE = "library-folders.json";
const BASE_DIR = BaseDirectory.AppData;

async function ensureDir(): Promise<void> {
  const dirExists = await exists("", { baseDir: BASE_DIR });
  if (!dirExists) {
    await mkdir("", { baseDir: BASE_DIR, recursive: true });
  }
}

export async function loadLibrary(): Promise<LibraryEntry[]> {
  try {
    const fileExists = await exists(LIBRARY_FILE, { baseDir: BASE_DIR });
    if (!fileExists) return [];
    const raw = await readTextFile(LIBRARY_FILE, { baseDir: BASE_DIR });
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LibraryEntry[];
  } catch {
    warn("Failed to load puzzle library");
    return [];
  }
}

export async function saveLibrary(entries: LibraryEntry[]): Promise<void> {
  try {
    await ensureDir();
    await writeTextFile(LIBRARY_FILE, JSON.stringify(entries, null, 2), {
      baseDir: BASE_DIR,
    });
  } catch (err) {
    error(`Failed to save puzzle library: ${err}`);
  }
}

export async function loadFolders(): Promise<LibraryFolder[]> {
  try {
    const fileExists = await exists(FOLDERS_FILE, { baseDir: BASE_DIR });
    if (!fileExists) return [];
    const raw = await readTextFile(FOLDERS_FILE, { baseDir: BASE_DIR });
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LibraryFolder[];
  } catch {
    warn("Failed to load library folders");
    return [];
  }
}

export async function saveFolders(folders: LibraryFolder[]): Promise<void> {
  try {
    await ensureDir();
    await writeTextFile(FOLDERS_FILE, JSON.stringify(folders, null, 2), {
      baseDir: BASE_DIR,
    });
  } catch (err) {
    error(`Failed to save library folders: ${err}`);
  }
}
