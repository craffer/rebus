import { useRef, useEffect } from "react";
import type { Clue } from "../../types/puzzle";

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
      // Scroll so this item is at the top of the scrollable parent
      const parent = ref.current.closest("ol");
      if (parent) {
        parent.scrollTo({
          top: ref.current.offsetTop - parent.offsetTop,
          behavior: "smooth",
        });
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
