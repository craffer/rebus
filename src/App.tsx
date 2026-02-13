import { useEffect, useRef, useState, useCallback } from "react";
import { usePuzzleStore } from "./store/puzzleStore";
import { useSettingsStore } from "./store/settingsStore";
import { usePuzzleLoader } from "./hooks/usePuzzleLoader";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { useTimer } from "./hooks/useTimer";
import { useIsDarkMode } from "./hooks/useTheme";
import { playCelebrationSound } from "./utils/celebrationSound";
import Grid from "./components/Grid/Grid";
import CluePanel from "./components/CluePanel/CluePanel";
import Toolbar from "./components/Toolbar";
import WelcomeScreen from "./components/WelcomeScreen";
import CompletionOverlay from "./components/CompletionOverlay";
import SettingsPanel from "./components/SettingsPanel";

function App() {
  const puzzle = usePuzzleStore((s) => s.puzzle);
  const isSolved = usePuzzleStore((s) => s.isSolved);
  const showIncorrectNotice = usePuzzleStore((s) => s.showIncorrectNotice);
  const { openPuzzleFile } = usePuzzleLoader();
  const isDark = useIsDarkMode();

  const [showCelebration, setShowCelebration] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const prevSolvedRef = useRef(false);

  useKeyboardNavigation();
  useTimer();

  // Load persisted settings from disk on app startup
  useEffect(() => {
    useSettingsStore.getState()._initSettings();
  }, []);

  // Toggle dark class on <html> for Tailwind dark: variant
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Celebration on solve (transition from false → true)
  useEffect(() => {
    if (isSolved && !prevSolvedRef.current) {
      setShowCelebration(true);
      const playSoundOnSolve =
        useSettingsStore.getState().settings.feedback.play_sound_on_solve;
      if (playSoundOnSolve) {
        playCelebrationSound();
      }
    }
    prevSolvedRef.current = isSolved;
  }, [isSolved]);

  // Cmd+O / Ctrl+O to open a puzzle, Cmd+, to open settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault();
        openPuzzleFile();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setShowSettings((v) => !v);
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

  const dismissCelebration = useCallback(() => setShowCelebration(false), []);
  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);

  if (!puzzle) {
    return (
      <div className="flex h-screen flex-col">
        <Toolbar onOpenSettings={openSettings} />
        <WelcomeScreen />
        {showSettings && <SettingsPanel onClose={closeSettings} />}
      </div>
    );
  }

  const timerRunning = usePuzzleStore((s) => s.timerRunning);
  const isPaused = puzzle && !timerRunning && !isSolved;

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-gray-900">
      <Toolbar onOpenSettings={openSettings} />
      <div className="flex min-h-0 flex-1">
        {/* Grid area */}
        <div className="relative flex min-h-0 min-w-0 flex-1">
          <Grid />
          {/* Pause overlay — covers grid only */}
          {isPaused && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 dark:bg-gray-900/95">
              <p className="mb-4 text-2xl font-semibold text-gray-700 dark:text-gray-300">
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
        <div className="flex w-80 min-w-64 flex-col border-l border-gray-200 dark:border-gray-700">
          <CluePanel />
        </div>
      </div>

      {/* Incorrect notice */}
      {showIncorrectNotice && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          onClick={() => usePuzzleStore.getState().dismissIncorrectNotice()}
        >
          <div
            className="relative rounded-xl bg-white/90 px-8 py-6 shadow-2xl dark:bg-gray-800/90"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => usePuzzleStore.getState().dismissIncorrectNotice()}
              className="absolute right-3 top-3 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 4l8 8M12 4L4 12" />
              </svg>
            </button>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Not quite...
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Some answers are incorrect. Keep trying!
            </p>
          </div>
        </div>
      )}

      {/* Completion celebration */}
      {showCelebration && <CompletionOverlay onDismiss={dismissCelebration} />}

      {/* Settings modal */}
      {showSettings && <SettingsPanel onClose={closeSettings} />}
    </div>
  );
}

export default App;
