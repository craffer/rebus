// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import KonamiEasterEgg from "./KonamiEasterEgg";

/** Advance fake timers one tick at a time to let React state updates cascade. */
function advanceBySteps(steps: number, intervalMs: number) {
  for (let i = 0; i < steps; i++) {
    act(() => {
      vi.advanceTimersByTime(intervalMs);
    });
  }
}

describe("KonamiEasterEgg", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders clue text", () => {
    const onDismiss = vi.fn();
    const { getByText } = render(<KonamiEasterEgg onDismiss={onDismiss} />);

    expect(getByText("Hint for a solver")).toBeTruthy();
    expect(getByText("Multiple letters, one square")).toBeTruthy();
    expect(getByText("What you came here to do")).toBeTruthy();
  });

  it("reveals letters progressively over time", () => {
    const onDismiss = vi.fn();
    const { container } = render(<KonamiEasterEgg onDismiss={onDismiss} />);

    const getRevealedLetters = () =>
      container.querySelectorAll(".konami-letter-pop");

    // Initially no letters revealed
    expect(getRevealedLetters().length).toBe(0);

    // After 1 step, 1 letter
    advanceBySteps(1, 120);
    expect(getRevealedLetters().length).toBe(1);

    // After 11 more steps, all 12 letters revealed
    advanceBySteps(11, 120);
    expect(getRevealedLetters().length).toBe(12);
  });

  it("auto-dismisses after all letters are revealed plus timeout", () => {
    const onDismiss = vi.fn();
    render(<KonamiEasterEgg onDismiss={onDismiss} />);

    // Reveal all 12 letters
    advanceBySteps(12, 120);
    expect(onDismiss).not.toHaveBeenCalled();

    // Auto-dismiss fires after 5000ms
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses on backdrop click", () => {
    const onDismiss = vi.fn();
    const { container } = render(<KonamiEasterEgg onDismiss={onDismiss} />);

    // Click the backdrop (the outermost fixed div)
    const backdrop = container.firstElementChild as HTMLElement;
    backdrop.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss when clicking the crossword content", () => {
    const onDismiss = vi.fn();
    const { getByText } = render(<KonamiEasterEgg onDismiss={onDismiss} />);

    // Click a clue text (inside the content area, stopPropagation prevents dismiss)
    const clue = getByText("Hint for a solver");
    clue.click();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("shows golden glow after all letters are revealed", () => {
    const onDismiss = vi.fn();
    const { container } = render(<KonamiEasterEgg onDismiss={onDismiss} />);

    // No glow initially
    expect(container.querySelector(".konami-glow")).toBeNull();

    // Reveal all letters
    advanceBySteps(12, 120);

    expect(container.querySelector(".konami-glow")).toBeTruthy();
  });
});
