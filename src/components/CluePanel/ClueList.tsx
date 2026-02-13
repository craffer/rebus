import type { Clue, Direction } from "../../types/puzzle";
import ClueItem from "./ClueItem";

export type ClueHighlight = "primary" | "cross" | null;

interface ClueListProps {
  title: string;
  clues: Clue[];
  primaryClueNumber: number | null;
  crossClueNumber: number | null;
  completedClueNumbers: Set<number>;
  scrollToTop: boolean;
  onClueClick: (clue: Clue, direction: Direction) => void;
  direction: Direction;
}

function getHighlight(
  clueNumber: number,
  primaryClueNumber: number | null,
  crossClueNumber: number | null,
): ClueHighlight {
  if (clueNumber === primaryClueNumber) return "primary";
  if (clueNumber === crossClueNumber) return "cross";
  return null;
}

export default function ClueList({
  title,
  clues,
  primaryClueNumber,
  crossClueNumber,
  completedClueNumbers,
  scrollToTop,
  onClueClick,
  direction,
}: ClueListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h3 className="border-b border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {title}
      </h3>
      <ol className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {clues.map((clue) => (
          <ClueItem
            key={clue.number}
            clue={clue}
            highlight={getHighlight(
              clue.number,
              primaryClueNumber,
              crossClueNumber,
            )}
            isComplete={completedClueNumbers.has(clue.number)}
            scrollToTop={scrollToTop}
            onClick={(c) => onClueClick(c, direction)}
          />
        ))}
      </ol>
    </div>
  );
}
