import { useEffect, useState, useRef } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { info } from "@tauri-apps/plugin-log";

const PUZZLE_EXTENSIONS = new Set(["puz", "ipuz", "jpz", "xml"]);

function isPuzzleFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return PUZZLE_EXTENSIONS.has(ext);
}

/**
 * Hook that listens for Tauri v2 drag-drop events and opens dropped puzzle files.
 * Browser native drag-drop doesn't provide file paths in Tauri v2 —
 * we must use the webview's onDragDropEvent API instead.
 */
export function useDragDrop(onFilesDropped: (paths: string[]) => void): {
  isDragOver: boolean;
} {
  const [isDragOver, setIsDragOver] = useState(false);
  const callbackRef = useRef(onFilesDropped);
  callbackRef.current = onFilesDropped;

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const { type } = event.payload;

        if (type === "enter" || type === "over") {
          setIsDragOver(true);
        } else if (type === "leave" || type === "cancel") {
          setIsDragOver(false);
        } else if (type === "drop") {
          setIsDragOver(false);
          const puzzlePaths = event.payload.paths.filter(isPuzzleFile);
          if (puzzlePaths.length > 0) {
            info(`Drag-drop: received ${puzzlePaths.length} puzzle file(s)`);
            callbackRef.current(puzzlePaths);
          }
        }
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => {
      unlisten?.();
    };
  }, []);

  // Prevent browser default drag behavior (shows "not allowed" cursor otherwise)
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  return { isDragOver };
}

/**
 * Simpler callback version: just fires when puzzle files are dropped.
 * Used by components that need the isDragOver state locally.
 */
export function useDragDropCallback(): {
  isDragOver: boolean;
  onFilesDropped: React.MutableRefObject<((paths: string[]) => void) | null>;
} {
  const onFilesDropped = useRef<((paths: string[]) => void) | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const { type } = event.payload;

        if (type === "enter" || type === "over") {
          setIsDragOver(true);
        } else if (type === "leave" || type === "cancel") {
          setIsDragOver(false);
        } else if (type === "drop") {
          setIsDragOver(false);
          const puzzlePaths = event.payload.paths.filter(isPuzzleFile);
          if (puzzlePaths.length > 0 && onFilesDropped.current) {
            onFilesDropped.current(puzzlePaths);
          }
        }
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => {
      unlisten?.();
    };
  }, []);

  return { isDragOver, onFilesDropped };
}
