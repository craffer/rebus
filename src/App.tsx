import { useEffect } from "react";
import { usePuzzleStore } from "./store/puzzleStore";
import { usePuzzleLoader } from "./hooks/usePuzzleLoader";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { useTimer } from "./hooks/useTimer";
import Grid from "./components/Grid/Grid";
import CluePanel from "./components/CluePanel/CluePanel";
import Toolbar from "./components/Toolbar";
import WelcomeScreen from "./components/WelcomeScreen";

function App() {
  const puzzle = usePuzzleStore((s) => s.puzzle);
  const { openPuzzleFile } = usePuzzleLoader();

  useKeyboardNavigation();
  useTimer();

  // Cmd+O / Ctrl+O to open a puzzle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault();
        openPuzzleFile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openPuzzleFile]);

  // Update window title when puzzle loads
  useEffect(() => {
    if (puzzle) {
      document.title = puzzle.title ? `${puzzle.title} — Rebus` : "Rebus";
    } else {
      document.title = "Rebus";
    }
  }, [puzzle?.title]);

  if (!puzzle) {
    return (
      <div className="flex h-screen flex-col">
        <Toolbar />
        <WelcomeScreen />
      </div>
    );
  }

  const timerRunning = usePuzzleStore((s) => s.timerRunning);
  const isSolved = usePuzzleStore((s) => s.isSolved);
  const isPaused = puzzle && !timerRunning && !isSolved;

  return (
    <div className="flex h-screen flex-col bg-white">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        {/* Grid area */}
        <div className="relative flex min-h-0 min-w-0 flex-1">
          <Grid />
          {/* Pause overlay — covers grid only */}
          {isPaused && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95">
              <p className="mb-4 text-2xl font-semibold text-gray-700">
                Paused
              </p>
              <button
                onClick={() => usePuzzleStore.getState().resumeTimer()}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Resume
              </button>
            </div>
          )}
        </div>
        {/* Clue panel */}
        <div className="flex w-80 min-w-64 flex-col border-l border-gray-200">
          <CluePanel />
        </div>
      </div>
    </div>
  );
}

export default App;
