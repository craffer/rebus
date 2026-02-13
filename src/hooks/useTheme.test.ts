// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSettingsStore } from "../store/settingsStore";
import { DEFAULT_SETTINGS } from "../types/settings";

// Mock matchMedia before importing the hook (it reads matchMedia at module level)
let matchMediaListeners: ((e: { matches: boolean }) => void)[] = [];

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: (
      _event: string,
      handler: (e: { matches: boolean }) => void,
    ) => {
      matchMediaListeners.push(handler);
    },
    removeEventListener: (
      _event: string,
      handler: (e: { matches: boolean }) => void,
    ) => {
      matchMediaListeners = matchMediaListeners.filter((h) => h !== handler);
    },
  })),
});

const { useIsDarkMode } = await import("./useTheme");

describe("useIsDarkMode", () => {
  beforeEach(() => {
    matchMediaListeners = [];
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      _loaded: true,
    });
  });

  it('returns false when theme is "light"', () => {
    useSettingsStore.getState().updateAppearance({ theme: "light" });
    const { result } = renderHook(() => useIsDarkMode());
    expect(result.current).toBe(false);
  });

  it('returns true when theme is "dark"', () => {
    useSettingsStore.getState().updateAppearance({ theme: "dark" });
    const { result } = renderHook(() => useIsDarkMode());
    expect(result.current).toBe(true);
  });

  it('returns false for "system" when OS is light', () => {
    useSettingsStore.getState().updateAppearance({ theme: "system" });
    const { result } = renderHook(() => useIsDarkMode());
    expect(result.current).toBe(false);
  });

  it('responds to system theme change events when set to "system"', () => {
    useSettingsStore.getState().updateAppearance({ theme: "system" });
    const { result } = renderHook(() => useIsDarkMode());
    expect(result.current).toBe(false);

    act(() => {
      for (const listener of matchMediaListeners) {
        listener({ matches: true });
      }
    });
    expect(result.current).toBe(true);
  });
});
