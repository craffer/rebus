import { useEffect } from "react";
import { usePuzzleStore } from "../store/puzzleStore";

/** Drives the puzzle timer — ticks once per second while running. */
export function useTimer() {
  const timerRunning = usePuzzleStore((s) => s.timerRunning);
  const tickTimer = usePuzzleStore((s) => s.tickTimer);

  useEffect(() => {
    if (!timerRunning) return;

    const interval = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, tickTimer]);
}
