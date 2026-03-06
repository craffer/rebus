// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock @tauri-apps/plugin-log
vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// We need to mock getCurrentWebview before importing the hook
type DragDropPayload =
  | { type: "enter"; position: { x: number; y: number } }
  | { type: "over"; position: { x: number; y: number } }
  | { type: "leave" }
  | { type: "drop"; paths: string[]; position: { x: number; y: number } };

type DragDropListener = (event: { payload: DragDropPayload }) => void;

let capturedListener: DragDropListener | null = null;
const mockUnlisten = vi.fn();
const mockOnDragDropEvent = vi.fn((listener: DragDropListener) => {
  capturedListener = listener;
  return Promise.resolve(mockUnlisten);
});

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: vi.fn(() => ({
    onDragDropEvent: mockOnDragDropEvent,
  })),
}));

// Import after mocks are set up
const { useDragDrop, useDragDropCallback } = await import("./useDragDrop");

function fireEvent(payload: DragDropPayload) {
  act(() => {
    capturedListener?.({ payload });
  });
}

describe("isPuzzleFile (via useDragDrop drop behavior)", () => {
  beforeEach(() => {
    capturedListener = null;
    mockUnlisten.mockClear();
    mockOnDragDropEvent.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("filters to puzzle file extensions on drop", async () => {
    const onFilesDropped = vi.fn();
    renderHook(() => useDragDrop(onFilesDropped));

    // Wait for the async onDragDropEvent promise to resolve
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent({
      type: "drop",
      paths: ["/path/to/puzzle.puz", "/path/to/image.png", "/path/to/my.ipuz"],
      position: { x: 0, y: 0 },
    });

    expect(onFilesDropped).toHaveBeenCalledWith([
      "/path/to/puzzle.puz",
      "/path/to/my.ipuz",
    ]);
  });

  it("does not call callback when no puzzle files are dropped", async () => {
    const onFilesDropped = vi.fn();
    renderHook(() => useDragDrop(onFilesDropped));
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent({
      type: "drop",
      paths: ["/path/to/image.png", "/path/to/document.pdf"],
      position: { x: 0, y: 0 },
    });

    expect(onFilesDropped).not.toHaveBeenCalled();
  });

  it("accepts .jpz and .xml extensions", async () => {
    const onFilesDropped = vi.fn();
    renderHook(() => useDragDrop(onFilesDropped));
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent({
      type: "drop",
      paths: ["/path/to/puzzle.jpz", "/path/to/crossword.xml"],
      position: { x: 0, y: 0 },
    });

    expect(onFilesDropped).toHaveBeenCalledWith([
      "/path/to/puzzle.jpz",
      "/path/to/crossword.xml",
    ]);
  });

  it("is case-insensitive for file extensions", async () => {
    const onFilesDropped = vi.fn();
    renderHook(() => useDragDrop(onFilesDropped));
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent({
      type: "drop",
      paths: ["/path/to/PUZZLE.PUZ"],
      position: { x: 0, y: 0 },
    });

    expect(onFilesDropped).toHaveBeenCalledWith(["/path/to/PUZZLE.PUZ"]);
  });
});

describe("useDragDrop", () => {
  beforeEach(() => {
    capturedListener = null;
    mockUnlisten.mockClear();
    mockOnDragDropEvent.mockClear();
  });

  it("returns isDragOver as false initially", () => {
    const { result } = renderHook(() => useDragDrop(vi.fn()));
    expect(result.current.isDragOver).toBe(false);
  });

  it("sets isDragOver to true on enter event", async () => {
    const { result } = renderHook(() => useDragDrop(vi.fn()));
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent({ type: "enter", position: { x: 0, y: 0 } });
    expect(result.current.isDragOver).toBe(true);
  });

  it("sets isDragOver to true on over event", async () => {
    const { result } = renderHook(() => useDragDrop(vi.fn()));
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent({ type: "over", position: { x: 0, y: 0 } });
    expect(result.current.isDragOver).toBe(true);
  });

  it("sets isDragOver to false on leave event", async () => {
    const { result } = renderHook(() => useDragDrop(vi.fn()));
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent({ type: "enter", position: { x: 0, y: 0 } });
    expect(result.current.isDragOver).toBe(true);

    fireEvent({ type: "leave" });
    expect(result.current.isDragOver).toBe(false);
  });

  it("sets isDragOver to false after drop", async () => {
    const { result } = renderHook(() => useDragDrop(vi.fn()));
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent({ type: "enter", position: { x: 0, y: 0 } });
    expect(result.current.isDragOver).toBe(true);

    fireEvent({ type: "drop", paths: [], position: { x: 0, y: 0 } });
    expect(result.current.isDragOver).toBe(false);
  });

  it("calls unlisten on unmount", async () => {
    const { unmount } = renderHook(() => useDragDrop(vi.fn()));
    await act(async () => {
      await Promise.resolve();
    });

    unmount();
    expect(mockUnlisten).toHaveBeenCalledTimes(1);
  });

  it("registers dragover and drop prevention on window", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const { unmount } = renderHook(() => useDragDrop(vi.fn()));

    const calls = addSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain("dragover");
    expect(calls).toContain("drop");

    unmount();
    addSpy.mockRestore();
  });

  it("removes dragover and drop listeners on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useDragDrop(vi.fn()));
    unmount();

    const calls = removeSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain("dragover");
    expect(calls).toContain("drop");
    removeSpy.mockRestore();
  });

  it("uses latest callback ref without re-subscribing", async () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const { rerender } = renderHook(
      ({ cb }: { cb: (paths: string[]) => void }) => useDragDrop(cb),
      { initialProps: { cb: callback1 } },
    );
    await act(async () => {
      await Promise.resolve();
    });

    rerender({ cb: callback2 });

    fireEvent({
      type: "drop",
      paths: ["/path/to/puzzle.puz"],
      position: { x: 0, y: 0 },
    });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledWith(["/path/to/puzzle.puz"]);
    // onDragDropEvent should only be called once (no re-subscription)
    expect(mockOnDragDropEvent).toHaveBeenCalledTimes(1);
  });
});

describe("useDragDropCallback", () => {
  beforeEach(() => {
    capturedListener = null;
    mockUnlisten.mockClear();
    mockOnDragDropEvent.mockClear();
  });

  it("returns isDragOver as false initially", () => {
    const { result } = renderHook(() => useDragDropCallback());
    expect(result.current.isDragOver).toBe(false);
  });

  it("returns a mutable ref for onFilesDropped", () => {
    const { result } = renderHook(() => useDragDropCallback());
    expect(result.current.onFilesDropped).toBeDefined();
    expect(result.current.onFilesDropped.current).toBeNull();
  });

  it("calls onFilesDropped.current when puzzle files are dropped", async () => {
    const { result } = renderHook(() => useDragDropCallback());
    await act(async () => {
      await Promise.resolve();
    });

    const handler = vi.fn();
    result.current.onFilesDropped.current = handler;

    fireEvent({
      type: "drop",
      paths: ["/path/to/puzzle.puz"],
      position: { x: 0, y: 0 },
    });

    expect(handler).toHaveBeenCalledWith(["/path/to/puzzle.puz"]);
  });

  it("does not throw when onFilesDropped.current is null", async () => {
    renderHook(() => useDragDropCallback());
    await act(async () => {
      await Promise.resolve();
    });

    // onFilesDropped.current is null — should not throw
    expect(() => {
      fireEvent({
        type: "drop",
        paths: ["/path/to/puzzle.puz"],
        position: { x: 0, y: 0 },
      });
    }).not.toThrow();
  });

  it("sets isDragOver on enter/leave/drop", async () => {
    const { result } = renderHook(() => useDragDropCallback());
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent({ type: "enter", position: { x: 0, y: 0 } });
    expect(result.current.isDragOver).toBe(true);

    fireEvent({ type: "leave" });
    expect(result.current.isDragOver).toBe(false);
  });
});
