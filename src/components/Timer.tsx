import { usePuzzleStore } from "../store/puzzleStore";
import { useSettingsStore } from "../store/settingsStore";
import { formatTime } from "../utils/formatting";

export default function Timer() {
  const elapsedSeconds = usePuzzleStore((s) => s.elapsedSeconds);
  const timerRunning = usePuzzleStore((s) => s.timerRunning);
  const pauseTimer = usePuzzleStore((s) => s.pauseTimer);
  const resumeTimer = usePuzzleStore((s) => s.resumeTimer);
  const showTimer = useSettingsStore((s) => s.settings.feedback.show_timer);
  const puzzle = usePuzzleStore((s) => s.puzzle);

  if (!puzzle || !showTimer) return null;

  return (
    <button
      onClick={() => (timerRunning ? pauseTimer() : resumeTimer())}
      className="flex items-center gap-1.5 rounded px-2 py-1 text-sm font-mono text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
      title={timerRunning ? "Pause timer" : "Resume timer"}
    >
      {timerRunning ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
        >
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
      <span>{formatTime(elapsedSeconds)}</span>
    </button>
  );
}
