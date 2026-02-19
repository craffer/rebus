import type { KeyBindings, KeyBindingAction } from "../types/settings";

/**
 * Convert a keyboard event to a normalized key string.
 * e.g., { key: "Tab", shiftKey: true } → "Shift+Tab"
 */
export function eventToKeyString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Meta");
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  parts.push(e.key);
  return parts.join("+");
}

/**
 * Check if a keyboard event matches a key binding string.
 */
export function eventMatchesBinding(
  e: KeyboardEvent,
  binding: string,
): boolean {
  return eventToKeyString(e) === binding;
}

/**
 * Convert key string to display format for UI.
 * e.g., "Meta+o" → "⌘O" on Mac, "Shift+Tab" → "⇧Tab" on Mac
 */
export function formatKeyForDisplay(keyStr: string): string {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac");

  // Format special keys first
  const parts = keyStr.split("+");
  const lastPart = parts[parts.length - 1];

  const keyMap: Record<string, string> = {
    " ": "Space",
    Backspace: isMac ? "⌫" : "Backspace",
    Delete: isMac ? "⌦" : "Delete",
    Enter: isMac ? "↵" : "Enter",
    Escape: "Esc",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    Tab: "Tab",
  };

  if (keyMap[lastPart]) {
    parts[parts.length - 1] = keyMap[lastPart];
  }

  // Join back with +
  let display = parts.join("+");

  // On Mac, replace modifier names with symbols (removes the +)
  if (isMac) {
    display = display
      .replace("Meta+", "⌘")
      .replace("Shift+", "⇧")
      .replace("Alt+", "⌥")
      .replace("Ctrl+", "⌃");
  }

  return display;
}

/**
 * Build a reverse lookup map from key strings to actions.
 * This is used to quickly find which action a key press should trigger.
 */
export function buildActionLookup(
  keybindings: KeyBindings,
): Map<string, KeyBindingAction> {
  const map = new Map<string, KeyBindingAction>();
  for (const [action, keyStr] of Object.entries(keybindings)) {
    map.set(keyStr, action as KeyBindingAction);
  }
  return map;
}

/**
 * Find which action (if any) is currently bound to a given key string.
 * Returns the action name or undefined if not bound.
 */
export function findConflictingAction(
  keyStr: string,
  keybindings: KeyBindings,
): KeyBindingAction | undefined {
  for (const [action, binding] of Object.entries(keybindings)) {
    if (binding === keyStr) {
      return action as KeyBindingAction;
    }
  }
  return undefined;
}
