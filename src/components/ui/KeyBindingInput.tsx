import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import {
  eventToKeyString,
  formatKeyForDisplay,
  findConflictingAction,
} from "../../utils/keyboardUtils";
import type { KeyBindings, KeyBindingAction } from "../../types/settings";

interface KeyBindingInputProps {
  label: string;
  value: string;
  currentAction: KeyBindingAction;
  allBindings: KeyBindings;
  onChange: (keyString: string) => void;
  onSwap: (conflictingAction: KeyBindingAction, newBinding: string) => void;
  description?: string;
  inline?: boolean;
}

export default function KeyBindingInput({
  label,
  value,
  currentAction,
  allBindings,
  onChange,
  onSwap,
  description,
  inline = false,
}: KeyBindingInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [invalidKeyError, setInvalidKeyError] = useState<string | null>(null);

  useEffect(() => {
    if (!isListening) {
      // Remove listening indicator when not listening
      delete document.body.dataset.keybindingListening;
      return;
    }

    // Set indicator that we're listening for a key
    document.body.dataset.keybindingListening = "true";

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore modifier-only presses
      if (["Shift", "Meta", "Ctrl", "Alt"].includes(e.key)) return;

      // Don't allow single letters without modifiers (reserved for puzzle input)
      if (
        e.key.length === 1 &&
        /^[a-zA-Z]$/.test(e.key) &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        flushSync(() => {
          setInvalidKeyError(
            "Single letters are reserved for puzzle input. Add a modifier (Ctrl, Alt, or Cmd).",
          );
        });
        setTimeout(() => setInvalidKeyError(null), 3000);
        return;
      }

      const keyStr = eventToKeyString(e);

      // Check for conflicts
      const conflictingAction = findConflictingAction(keyStr, allBindings);
      if (conflictingAction && conflictingAction !== currentAction) {
        // Show warning and auto-swap
        setConflictWarning(
          `${formatKeyForDisplay(keyStr)} was bound to "${formatActionName(conflictingAction)}"`,
        );
        setTimeout(() => setConflictWarning(null), 3000);

        // Swap: unbind the conflicting action by setting it to empty
        onSwap(conflictingAction, "");
      }

      onChange(keyStr);
      setIsListening(false);
      delete document.body.dataset.keybindingListening;
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      delete document.body.dataset.keybindingListening;
    };
  }, [isListening, onChange, onSwap, allBindings, currentAction]);

  // For inline use (no label), just render the button
  if (inline) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setIsListening(true)}
          className={`min-w-20 rounded border px-2.5 py-1 font-mono text-xs ${
            isListening
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : value
                ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                : "border-gray-300 bg-white text-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-gray-600"
          }`}
        >
          {isListening
            ? "Press a key..."
            : value
              ? formatKeyForDisplay(value)
              : "<UNSET>"}
        </button>
        {conflictWarning && (
          <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
            ⚠ {conflictWarning}
          </p>
        )}
        {invalidKeyError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            ✕ {invalidKeyError}
          </p>
        )}
      </div>
    );
  }

  // Normal layout with label
  return (
    <div className="py-2">
      <label className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
          </p>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsListening(true)}
          className={`min-w-20 rounded border px-2.5 py-1 font-mono text-xs ${
            isListening
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : value
                ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                : "border-gray-300 bg-white text-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-gray-600"
          }`}
        >
          {isListening
            ? "Press a key..."
            : value
              ? formatKeyForDisplay(value)
              : "<UNSET>"}
        </button>
      </label>
      {conflictWarning && (
        <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
          ⚠ {conflictWarning}
        </p>
      )}
      {invalidKeyError && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          ✕ {invalidKeyError}
        </p>
      )}
    </div>
  );
}

function formatActionName(action: KeyBindingAction): string {
  const names: Record<KeyBindingAction, string> = {
    move_left: "Move left",
    move_right: "Move right",
    move_up: "Move up",
    move_down: "Move down",
    next_clue: "Next clue",
    previous_clue: "Previous clue",
    next_clue_alt: "Next clue (alternate)",
    spacebar: "Spacebar action",
    backspace: "Backspace",
    delete: "Delete",
    rebus_mode: "Rebus mode",
    pause: "Pause",
    pencil_mode: "Pencil mode",
  };
  return names[action];
}
