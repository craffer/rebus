import { useRef, useEffect } from "react";
import type { Clue } from "../../types/puzzle";
import type { ClueHighlight } from "./ClueList";

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

function getClassName(highlight: ClueHighlight, isComplete: boolean): string {
  const base = "cursor-pointer rounded px-2 py-1 text-sm";

  if (highlight === "primary") {
    const text = isComplete
      ? "font-semibold text-gray-400 dark:text-gray-500"
      : "font-semibold text-blue-800 dark:text-blue-200";
    return `${base} bg-blue-100 dark:bg-blue-800/40 ${text}`;
  }

  if (highlight === "cross") {
    const text = isComplete
      ? "text-gray-400 dark:text-gray-500"
      : "text-gray-700 dark:text-gray-300";
    return `${base} bg-blue-50 dark:bg-blue-900/20 ${text}`;
  }

  if (isComplete) {
    return `${base} text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-800`;
  }
  return `${base} text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800`;
}

interface ClueItemProps {
  clue: Clue;
  highlight: ClueHighlight;
  isComplete: boolean;
  scrollToTop: boolean;
  onClick: (clue: Clue) => void;
}

export default function ClueItem({
  clue,
  highlight,
  isComplete,
  scrollToTop,
  onClick,
}: ClueItemProps) {
  const ref = useRef<HTMLLIElement>(null);
  const isHighlighted = highlight !== null;

  // Auto-scroll to highlighted clue (both primary and cross)
  useEffect(() => {
    if (!isHighlighted || !ref.current) return;

    if (scrollToTop) {
      const parent = ref.current.closest("ol");
      if (parent) {
        smoothScrollTo(parent, ref.current.offsetTop - parent.offsetTop);
      }
    } else {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isHighlighted, scrollToTop]);

  return (
    <li
      ref={ref}
      onClick={() => onClick(clue)}
      className={getClassName(highlight, isComplete)}
    >
      <span className="mr-1.5 font-medium text-gray-500 dark:text-gray-400">
        {clue.number}.
      </span>
      {clue.text}
    </li>
  );
}
