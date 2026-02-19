import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  eventToKeyString,
  eventMatchesBinding,
  formatKeyForDisplay,
  buildActionLookup,
  findConflictingAction,
} from "./keyboardUtils";
import type { KeyBindings } from "../types/settings";

describe("keyboardUtils", () => {
  describe("eventToKeyString", () => {
    it("converts simple key to string", () => {
      const event = new KeyboardEvent("keydown", { key: "a" });
      expect(eventToKeyString(event)).toBe("a");
    });

    it("converts arrow key to string", () => {
      const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
      expect(eventToKeyString(event)).toBe("ArrowLeft");
    });

    it("converts key with Shift modifier", () => {
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
      });
      expect(eventToKeyString(event)).toBe("Shift+Tab");
    });

    it("converts key with Meta modifier", () => {
      const event = new KeyboardEvent("keydown", { key: "o", metaKey: true });
      expect(eventToKeyString(event)).toBe("Meta+o");
    });

    it("converts key with Ctrl modifier", () => {
      const event = new KeyboardEvent("keydown", { key: "o", ctrlKey: true });
      expect(eventToKeyString(event)).toBe("Ctrl+o");
    });

    it("converts key with Alt modifier", () => {
      const event = new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        altKey: true,
      });
      expect(eventToKeyString(event)).toBe("Alt+ArrowLeft");
    });

    it("converts key with multiple modifiers in correct order", () => {
      const event = new KeyboardEvent("keydown", {
        key: "a",
        shiftKey: true,
        metaKey: true,
        ctrlKey: true,
        altKey: true,
      });
      expect(eventToKeyString(event)).toBe("Shift+Meta+Ctrl+Alt+a");
    });

    it("handles space key", () => {
      const event = new KeyboardEvent("keydown", { key: " " });
      expect(eventToKeyString(event)).toBe(" ");
    });

    it("handles Escape key", () => {
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      expect(eventToKeyString(event)).toBe("Escape");
    });
  });

  describe("eventMatchesBinding", () => {
    it("matches simple key", () => {
      const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
      expect(eventMatchesBinding(event, "ArrowLeft")).toBe(true);
    });

    it("matches key with Shift", () => {
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
      });
      expect(eventMatchesBinding(event, "Shift+Tab")).toBe(true);
    });

    it("does not match if modifier is missing", () => {
      const event = new KeyboardEvent("keydown", { key: "Tab" });
      expect(eventMatchesBinding(event, "Shift+Tab")).toBe(false);
    });

    it("does not match if extra modifier is present", () => {
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        ctrlKey: true,
      });
      expect(eventMatchesBinding(event, "Shift+Tab")).toBe(false);
    });

    it("matches key with multiple modifiers", () => {
      const event = new KeyboardEvent("keydown", {
        key: "a",
        shiftKey: true,
        metaKey: true,
      });
      expect(eventMatchesBinding(event, "Shift+Meta+a")).toBe(true);
    });
  });

  describe("formatKeyForDisplay", () => {
    let originalPlatform: string;

    beforeEach(() => {
      originalPlatform = navigator.platform;
    });

    afterEach(() => {
      Object.defineProperty(navigator, "platform", {
        value: originalPlatform,
        writable: true,
        configurable: true,
      });
    });

    it("formats arrow keys with symbols", () => {
      expect(formatKeyForDisplay("ArrowLeft")).toBe("←");
      expect(formatKeyForDisplay("ArrowRight")).toBe("→");
      expect(formatKeyForDisplay("ArrowUp")).toBe("↑");
      expect(formatKeyForDisplay("ArrowDown")).toBe("↓");
    });

    it("formats special keys", () => {
      expect(formatKeyForDisplay(" ")).toBe("Space");
      expect(formatKeyForDisplay("Enter")).toMatch(/Enter|↵/);
      expect(formatKeyForDisplay("Escape")).toBe("Esc");
      expect(formatKeyForDisplay("Tab")).toBe("Tab");
    });

    it("formats modifiers on Mac", () => {
      Object.defineProperty(navigator, "platform", {
        value: "MacIntel",
        writable: true,
        configurable: true,
      });

      expect(formatKeyForDisplay("Meta+o")).toBe("⌘o");
      expect(formatKeyForDisplay("Shift+Tab")).toBe("⇧Tab");
      expect(formatKeyForDisplay("Alt+ArrowLeft")).toBe("⌥←");
      expect(formatKeyForDisplay("Ctrl+a")).toBe("⌃a");
    });

    it("formats Delete and Backspace on Mac", () => {
      Object.defineProperty(navigator, "platform", {
        value: "MacIntel",
        writable: true,
        configurable: true,
      });

      expect(formatKeyForDisplay("Backspace")).toBe("⌫");
      expect(formatKeyForDisplay("Delete")).toBe("⌦");
    });

    it("keeps modifiers spelled out on Windows", () => {
      Object.defineProperty(navigator, "platform", {
        value: "Win32",
        writable: true,
        configurable: true,
      });

      expect(formatKeyForDisplay("Ctrl+o")).toBe("Ctrl+o");
      expect(formatKeyForDisplay("Shift+Tab")).toBe("Shift+Tab");
      expect(formatKeyForDisplay("Alt+ArrowLeft")).toBe("Alt+←");
    });

    it("formats multiple modifiers on Mac", () => {
      Object.defineProperty(navigator, "platform", {
        value: "MacIntel",
        writable: true,
        configurable: true,
      });

      expect(formatKeyForDisplay("Shift+Meta+a")).toBe("⇧⌘a");
      expect(formatKeyForDisplay("Ctrl+Alt+Delete")).toBe("⌃⌥⌦");
    });
  });

  describe("buildActionLookup", () => {
    it("builds reverse lookup map from keybindings", () => {
      const keybindings: KeyBindings = {
        move_left: "ArrowLeft",
        move_right: "ArrowRight",
        move_up: "ArrowUp",
        move_down: "ArrowDown",
        next_clue: "Tab",
        previous_clue: "Shift+Tab",
        next_clue_alt: "Enter",
        spacebar: " ",
        backspace: "Backspace",
        delete: "Delete",
        rebus_mode: "Escape",
      };

      const lookup = buildActionLookup(keybindings);

      expect(lookup.get("ArrowLeft")).toBe("move_left");
      expect(lookup.get("Shift+Tab")).toBe("previous_clue");
      expect(lookup.get("Escape")).toBe("rebus_mode");
      expect(lookup.get(" ")).toBe("spacebar");
    });

    it("handles custom keybindings", () => {
      const keybindings: KeyBindings = {
        move_left: "h",
        move_right: "l",
        move_up: "k",
        move_down: "j",
        next_clue: "n",
        previous_clue: "p",
        next_clue_alt: "Ctrl+n",
        spacebar: "Space",
        backspace: "Backspace",
        delete: "Delete",
        rebus_mode: "r",
      };

      const lookup = buildActionLookup(keybindings);

      expect(lookup.get("h")).toBe("move_left");
      expect(lookup.get("l")).toBe("move_right");
      expect(lookup.get("Ctrl+n")).toBe("next_clue_alt");
    });

    it("returns undefined for unbound keys", () => {
      const keybindings: KeyBindings = {
        move_left: "ArrowLeft",
        move_right: "ArrowRight",
        move_up: "ArrowUp",
        move_down: "ArrowDown",
        next_clue: "Tab",
        previous_clue: "Shift+Tab",
        next_clue_alt: "Enter",
        spacebar: " ",
        backspace: "Backspace",
        delete: "Delete",
        rebus_mode: "Escape",
      };

      const lookup = buildActionLookup(keybindings);

      expect(lookup.get("a")).toBeUndefined();
      expect(lookup.get("Meta+k")).toBeUndefined();
    });
  });

  describe("findConflictingAction", () => {
    const keybindings: KeyBindings = {
      move_left: "ArrowLeft",
      move_right: "ArrowRight",
      move_up: "ArrowUp",
      move_down: "ArrowDown",
      next_clue: "Tab",
      previous_clue: "Shift+Tab",
      next_clue_alt: "Enter",
      spacebar: " ",
      backspace: "Backspace",
      delete: "Delete",
      rebus_mode: "Escape",
    };

    it("finds action bound to a key", () => {
      expect(findConflictingAction("Tab", keybindings)).toBe("next_clue");
      expect(findConflictingAction("Escape", keybindings)).toBe("rebus_mode");
      expect(findConflictingAction("ArrowLeft", keybindings)).toBe("move_left");
    });

    it("returns undefined for unbound key", () => {
      expect(findConflictingAction("a", keybindings)).toBeUndefined();
      expect(findConflictingAction("Meta+k", keybindings)).toBeUndefined();
      expect(findConflictingAction("Ctrl+s", keybindings)).toBeUndefined();
    });

    it("finds action bound to key with modifiers", () => {
      expect(findConflictingAction("Shift+Tab", keybindings)).toBe(
        "previous_clue",
      );
    });

    it("handles space key", () => {
      expect(findConflictingAction(" ", keybindings)).toBe("spacebar");
    });
  });
});
