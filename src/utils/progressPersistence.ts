import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";
import { warn, error } from "@tauri-apps/plugin-log";
import type { PuzzleProgress } from "../types/progress";

const PROGRESS_DIR = "progress";
const BASE_DIR = BaseDirectory.AppData;

/** Simple hash function for file paths. */
function puzzleIdFromPath(filePath: string): string {
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    hash = ((hash << 5) - hash + filePath.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

async function saveProgress(progress: PuzzleProgress): Promise<void> {
  try {
    await mkdir(PROGRESS_DIR, { baseDir: BASE_DIR, recursive: true });
    const fileName = `${PROGRESS_DIR}/${progress.puzzleId}.json`;
    await writeTextFile(fileName, JSON.stringify(progress, null, 2), {
      baseDir: BASE_DIR,
    });
  } catch (err) {
    error(`Failed to save progress: ${err}`);
  }
}

async function loadProgress(filePath: string): Promise<PuzzleProgress | null> {
  const puzzleId = puzzleIdFromPath(filePath);
  const fileName = `${PROGRESS_DIR}/${puzzleId}.json`;
  try {
    const fileExists = await exists(fileName, { baseDir: BASE_DIR });
    if (!fileExists) return null;
    const raw = await readTextFile(fileName, { baseDir: BASE_DIR });
    return JSON.parse(raw) as PuzzleProgress;
  } catch {
    warn("Failed to load progress");
    return null;
  }
}

async function deleteProgress(filePath: string): Promise<void> {
  const puzzleId = puzzleIdFromPath(filePath);
  const fileName = `${PROGRESS_DIR}/${puzzleId}.json`;
  try {
    const { remove } = await import("@tauri-apps/plugin-fs");
    await remove(fileName, { baseDir: BASE_DIR });
  } catch {
    // Ignore errors (file might not exist)
  }
}

export { saveProgress, loadProgress, deleteProgress, puzzleIdFromPath };
