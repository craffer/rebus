import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";
import type { Settings } from "../types/settings";
import { DEFAULT_SETTINGS } from "../types/settings";

const SETTINGS_FILE = "settings.json";
const BASE_DIR = BaseDirectory.AppConfig;

/**
 * Deep-merge saved settings with defaults so that new keys added in future
 * versions get their default values filled in automatically.
 */
function deepMerge<T extends Record<string, unknown>>(
  defaults: T,
  saved: Partial<T>,
): T {
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const savedVal = saved[key];
    if (savedVal === undefined) continue;

    if (
      typeof defaults[key] === "object" &&
      defaults[key] !== null &&
      !Array.isArray(defaults[key]) &&
      typeof savedVal === "object" &&
      savedVal !== null &&
      !Array.isArray(savedVal)
    ) {
      result[key] = deepMerge(
        defaults[key] as Record<string, unknown>,
        savedVal as Record<string, unknown>,
      ) as T[keyof T];
    } else {
      result[key] = savedVal as T[keyof T];
    }
  }
  return result;
}

export async function loadSettings(): Promise<Settings> {
  try {
    const fileExists = await exists(SETTINGS_FILE, { baseDir: BASE_DIR });
    if (!fileExists) return DEFAULT_SETTINGS;

    const raw = await readTextFile(SETTINGS_FILE, { baseDir: BASE_DIR });
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return deepMerge(DEFAULT_SETTINGS, parsed);
  } catch {
    console.warn("Failed to load settings, using defaults");
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await mkdir("", { baseDir: BASE_DIR, recursive: true });
    await writeTextFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), {
      baseDir: BASE_DIR,
    });
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}

// Exported for testing
export { deepMerge };
