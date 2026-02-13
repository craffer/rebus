import { useCallback, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { usePuzzleStore } from "../store/puzzleStore";
import type { Puzzle } from "../types/puzzle";

export function usePuzzleLoader() {
  const loadPuzzle = usePuzzleStore((s) => s.loadPuzzle);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openPuzzleFile = useCallback(async () => {
    try {
      setError(null);
      const filePath = await open({
        title: "Open Crossword Puzzle",
        filters: [
          {
            name: "Crossword Puzzles",
            extensions: ["puz", "ipuz", "jpz"],
          },
        ],
        multiple: false,
        directory: false,
      });

      if (!filePath) return; // User cancelled

      setLoading(true);
      const puzzle = await invoke<Puzzle>("open_puzzle", {
        filePath: filePath as string,
      });
      loadPuzzle(puzzle);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error("Failed to open puzzle:", err);
    } finally {
      setLoading(false);
    }
  }, [loadPuzzle]);

  return { openPuzzleFile, error, loading };
}
