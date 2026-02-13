import { useRef, useEffect } from "react";
import type { Clue } from "../../types/puzzle";

const SCROLL_DURATION_MS = 400;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Smoothly scroll a container so `targetTop` is at the top, over `duration` ms. */
function smoothScrollTo(container: Element, targetTop: number) {
  const start = container.scrollTop;
  const distance = targetTop - start;
  if (Math.abs(distance) < 1) return;

  let startTime: number | null = null;

  function step(timestamp: number) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1);

    container.scrollTop = start + distance * easeInOutCubic(progress);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

interface ClueItemProps {
  clue: Clue;
  isActive: boolean;
  isComplete: boolean;
  scrollToTop: boolean;
  onClick: (clue: Clue) => void;
}

export default function ClueItem({
  clue,
  isActive,
  isComplete,
  scrollToTop,
  onClick,
}: ClueItemProps) {
  const ref = useRef<HTMLLIElement>(null);

  // Auto-scroll to active clue
  useEffect(() => {
    if (!isActive || !ref.current) return;

    if (scrollToTop) {
      const parent = ref.current.closest("ol");
      if (parent) {
        smoothScrollTo(parent, ref.current.offsetTop - parent.offsetTop);
      }
    } else {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isActive, scrollToTop]);

  return (
    <li
      ref={ref}
      onClick={() => onClick(clue)}
      className={`cursor-pointer rounded px-2 py-1 text-sm ${
        isActive
          ? "bg-blue-100 font-semibold text-blue-900"
          : isComplete
            ? "text-gray-400 hover:bg-gray-100"
            : "text-gray-800 hover:bg-gray-100"
      }`}
    >
      <span className="mr-1.5 font-medium text-gray-500">{clue.number}.</span>
      {clue.text}
    </li>
  );
}
