import { useEffect, useMemo } from "react";
import { usePuzzleStore } from "../store/puzzleStore";

const CONFETTI_COLORS = [
  "#FFD700",
  "#3478F6",
  "#FF4444",
  "#22C55E",
  "#A855F7",
  "#FF6B00",
];
const PARTICLE_COUNT = 35;
const AUTO_DISMISS_MS = 4000;

interface Particle {
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface CompletionOverlayProps {
  onDismiss: () => void;
}

export default function CompletionOverlay({
  onDismiss,
}: CompletionOverlayProps) {
  const elapsedSeconds = usePuzzleStore((s) => s.elapsedSeconds);

  // Auto-dismiss
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Generate random particles once
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 1,
        duration: 2 + Math.random() * 2,
        color:
          CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 6 + Math.random() * 6,
      })),
    [],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onDismiss}
    >
      {/* Confetti particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-10px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.size > 9 ? "50%" : "2px",
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}

      {/* Center message */}
      <div className="rounded-2xl bg-white/90 px-10 py-8 text-center shadow-2xl dark:bg-gray-800/90">
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Congratulations!
        </p>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Solved in {formatTime(elapsedSeconds)}
        </p>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
