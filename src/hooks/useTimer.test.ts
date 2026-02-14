// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const { usePuzzleStore } = await import("../store/puzzleStore");
const { useTimer } = await import("./useTimer");

function loadMinimalPuzzle() {
  usePuzzleStore.getState().loadPuzzle({
    title: "T",
    author: "",
    copyright: "",
    notes: "",
    width: 1,
    height: 1,
    grid: [
      [
        {
          kind: "letter",
          number: 1,
          solution: "A",
          rebus_solution: null,
          player_value: null,
          is_circled: false,
          was_incorrect: false,
          is_revealed: false,
        },
      ],
    ],
    clues: {
      across: [{ number: 1, text: "Clue", row: 0, col: 0, length: 1 }],
      down: [{ number: 1, text: "Clue", row: 0, col: 0, length: 1 }],
    },
    has_solution: true,
    is_scrambled: false,
  });
}

describe("useTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    usePuzzleStore.setState(usePuzzleStore.getInitialState());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ticks while timer is running", () => {
    loadMinimalPuzzle();
    renderHook(() => useTimer());

    expect(usePuzzleStore.getState().elapsedSeconds).toBe(0);
    vi.advanceTimersByTime(3000);
    expect(usePuzzleStore.getState().elapsedSeconds).toBeGreaterThanOrEqual(3);
  });

  it("does not tick when timer is not running (no puzzle loaded)", () => {
    renderHook(() => useTimer());
    vi.advanceTimersByTime(3000);
    expect(usePuzzleStore.getState().elapsedSeconds).toBe(0);
  });
});
