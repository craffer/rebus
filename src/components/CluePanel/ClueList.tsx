import type { Clue, Direction } from "../../types/puzzle";
import ClueItem from "./ClueItem";

interface ClueListProps {
  title: string;
  clues: Clue[];
  activeClueNumber: number | null;
  onClueClick: (clue: Clue, direction: Direction) => void;
  direction: Direction;
}

export default function ClueList({
  title,
  clues,
  activeClueNumber,
  onClueClick,
  direction,
}: ClueListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h3 className="border-b border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">
        {title}
      </h3>
      <ol className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {clues.map((clue) => (
          <ClueItem
            key={clue.number}
            clue={clue}
            isActive={activeClueNumber === clue.number}
            onClick={(c) => onClueClick(c, direction)}
          />
        ))}
      </ol>
    </div>
  );
}
