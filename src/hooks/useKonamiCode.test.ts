// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKonamiCode } from "./useKonamiCode";

function pressKey(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

const KONAMI_KEYS = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

describe("useKonamiCode", () => {
  let callback: ReturnType<typeof vi.fn>;
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    callback = vi.fn();
    const { unmount } = renderHook(() => useKonamiCode(callback));
    cleanup = unmount;
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("triggers callback when the full Konami code is entered", () => {
    for (const key of KONAMI_KEYS) {
      pressKey(key);
    }
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not trigger on a partial sequence", () => {
    // Enter only the first 9 keys (missing the final "a")
    for (const key of KONAMI_KEYS.slice(0, 9)) {
      pressKey(key);
    }
    expect(callback).not.toHaveBeenCalled();
  });

  it("resets and re-detects after triggering", () => {
    // First trigger
    for (const key of KONAMI_KEYS) {
      pressKey(key);
    }
    expect(callback).toHaveBeenCalledTimes(1);

    // Second trigger
    for (const key of KONAMI_KEYS) {
      pressKey(key);
    }
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("handles uppercase B and A (case insensitive)", () => {
    const keys = [...KONAMI_KEYS.slice(0, 8), "B", "A"];
    for (const key of keys) {
      pressKey(key);
    }
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not trigger if wrong keys are interspersed", () => {
    pressKey("ArrowUp");
    pressKey("ArrowUp");
    pressKey("ArrowDown");
    pressKey("ArrowDown");
    pressKey("ArrowLeft");
    pressKey("ArrowRight");
    pressKey("ArrowLeft");
    pressKey("ArrowRight");
    pressKey("x"); // wrong key
    pressKey("a");
    expect(callback).not.toHaveBeenCalled();
  });

  it("recovers from wrong keys and still detects a subsequent complete sequence", () => {
    // Start with some garbage
    pressKey("x");
    pressKey("y");
    pressKey("z");

    // Now enter the full sequence
    for (const key of KONAMI_KEYS) {
      pressKey(key);
    }
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("removes event listener on unmount", () => {
    cleanup?.();
    cleanup = undefined;

    for (const key of KONAMI_KEYS) {
      pressKey(key);
    }
    expect(callback).not.toHaveBeenCalled();
  });
});
