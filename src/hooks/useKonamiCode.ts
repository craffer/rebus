import { useEffect, useRef, useCallback } from "react";

const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/**
 * Detects the Konami code (↑↑↓↓←→←→BA) and calls the callback when triggered.
 * Listens globally — works regardless of puzzle state or timer.
 */
export function useKonamiCode(onTriggered: () => void): void {
  const bufferRef = useRef<string[]>([]);
  const callbackRef = useRef(onTriggered);
  callbackRef.current = onTriggered;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Normalize letter keys to lowercase for case-insensitive matching
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    bufferRef.current.push(key);

    // Keep only the last N keys where N = sequence length
    if (bufferRef.current.length > KONAMI_SEQUENCE.length) {
      bufferRef.current.shift();
    }

    // Check for match
    if (
      bufferRef.current.length === KONAMI_SEQUENCE.length &&
      bufferRef.current.every((k, i) => k === KONAMI_SEQUENCE[i])
    ) {
      bufferRef.current = [];
      callbackRef.current();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
