// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
} from "@testing-library/react";
import KeyBindingInput from "./KeyBindingInput";
import type { KeyBindings, KeyBindingAction } from "../../types/settings";

const defaultBindings: KeyBindings = {
  move_left: "ArrowLeft",
  move_right: "ArrowRight",
  move_up: "ArrowUp",
  move_down: "ArrowDown",
  next_clue: "Tab",
  previous_clue: "Shift+Tab",
  next_clue_alt: "",
  spacebar: " ",
  backspace: "Backspace",
  delete: "Delete",
  rebus_mode: "Insert",
  pause: "Escape",
  pencil_mode: "",
};

const defaultProps = {
  label: "Move Left",
  value: "ArrowLeft",
  currentAction: "move_left" as KeyBindingAction,
  allBindings: defaultBindings,
  onChange: vi.fn(),
  onSwap: vi.fn(),
};

describe("KeyBindingInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("rendering", () => {
    it("renders label and current binding button", () => {
      render(<KeyBindingInput {...defaultProps} />);
      expect(screen.getByText("Move Left")).toBeTruthy();
      expect(screen.getByRole("button")).toBeTruthy();
    });

    it("renders <UNSET> when value is empty", () => {
      render(<KeyBindingInput {...defaultProps} value="" />);
      expect(screen.getByRole("button").textContent).toBe("<UNSET>");
    });

    it("renders description when provided", () => {
      render(
        <KeyBindingInput
          {...defaultProps}
          description="Moves the cursor left"
        />,
      );
      expect(screen.getByText("Moves the cursor left")).toBeTruthy();
    });

    it("does not render label in inline layout", () => {
      render(<KeyBindingInput {...defaultProps} inline />);
      expect(screen.queryByText("Move Left")).toBeNull();
      expect(screen.getByRole("button")).toBeTruthy();
    });
  });

  describe("listening state", () => {
    it("shows 'Press a key...' when listening", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("button").textContent).toBe("Press a key...");
    });

    it("sets keybindingListening dataset attribute when listening", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      expect(document.body.dataset.keybindingListening).toBe("true");
    });
  });

  describe("single letter rejection", () => {
    it("shows error message when a single letter is pressed without modifiers", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      // Dispatch directly (not via RTL's act-wrapped fireEvent) so component's
      // internal flushSync can apply the state update synchronously
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "a",
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(screen.queryByText(/Single letters are reserved/)).toBeTruthy();
    });

    it("does not call onChange when a single letter is pressed", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "z" });
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });

    it("keeps listening after a single letter is pressed", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "a" });
      expect(screen.getByRole("button").textContent).toBe("Press a key...");
    });

    it("clears the error after 3 seconds", async () => {
      vi.useFakeTimers();
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "a",
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(screen.queryByText(/Single letters are reserved/)).toBeTruthy();
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.queryByText(/Single letters are reserved/)).toBeNull();
      vi.useRealTimers();
    });

    it("rejects uppercase letters too", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "A",
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(screen.queryByText(/Single letters are reserved/)).toBeTruthy();
    });

    it("shows error in inline layout", () => {
      render(<KeyBindingInput {...defaultProps} inline />);
      fireEvent.click(screen.getByRole("button"));
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "s",
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(screen.queryByText(/Single letters are reserved/)).toBeTruthy();
    });
  });

  describe("valid key acceptance", () => {
    it("accepts a single letter with Ctrl modifier", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "a", ctrlKey: true });
      expect(defaultProps.onChange).toHaveBeenCalledWith("Ctrl+a");
    });

    it("accepts a single letter with Meta modifier", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "a", metaKey: true });
      expect(defaultProps.onChange).toHaveBeenCalledWith("Meta+a");
    });

    it("accepts a single letter with Alt modifier", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "a", altKey: true });
      expect(defaultProps.onChange).toHaveBeenCalledWith("Alt+a");
    });

    it("accepts arrow keys without modifiers", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "ArrowLeft" });
      expect(defaultProps.onChange).toHaveBeenCalledWith("ArrowLeft");
    });

    it("accepts Tab key without modifiers", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "Tab" });
      expect(defaultProps.onChange).toHaveBeenCalledWith("Tab");
    });

    it("stops listening after accepting a valid key", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "Tab" });
      expect(screen.getByRole("button").textContent).not.toBe("Press a key...");
    });
  });

  describe("modifier-only presses", () => {
    it("ignores Shift key alone", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "Shift" });
      expect(defaultProps.onChange).not.toHaveBeenCalled();
      expect(screen.getByRole("button").textContent).toBe("Press a key...");
    });

    it("ignores Meta key alone", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "Meta" });
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });

    it("ignores Ctrl key alone", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "Ctrl" });
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });

    it("ignores Alt key alone", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "Alt" });
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });
  });

  describe("conflict detection", () => {
    it("shows conflict warning and calls onSwap when key is already bound to another action", () => {
      render(<KeyBindingInput {...defaultProps} />);
      fireEvent.click(screen.getByRole("button"));

      // "Tab" is bound to "next_clue" — pressing it while editing "move_left" is a conflict
      fireEvent.keyDown(window, { key: "Tab" });

      expect(defaultProps.onSwap).toHaveBeenCalledWith("next_clue", "");
      expect(screen.queryByText(/was bound to "Next clue"/)).toBeTruthy();
    });

    it("does not call onSwap when rebinding the same action", () => {
      // Editing "next_clue" and pressing Tab (already bound to next_clue) — no conflict
      render(
        <KeyBindingInput
          {...defaultProps}
          currentAction="next_clue"
          value="Tab"
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(window, { key: "Tab" });
      expect(defaultProps.onSwap).not.toHaveBeenCalled();
    });
  });

  describe("exclusive listening — only one input active at a time", () => {
    it("clicking a second input deactivates the first", () => {
      render(
        <>
          <KeyBindingInput {...defaultProps} label="First" />
          <KeyBindingInput
            {...defaultProps}
            label="Second"
            currentAction="move_right"
          />
        </>,
      );

      const [firstButton, secondButton] = screen.getAllByRole("button");

      fireEvent.click(firstButton);
      expect(firstButton.textContent).toBe("Press a key...");

      fireEvent.click(secondButton);
      expect(firstButton.textContent).not.toBe("Press a key...");
      expect(secondButton.textContent).toBe("Press a key...");
    });

    it("only the most-recently clicked input listens for keys", () => {
      render(
        <>
          <KeyBindingInput {...defaultProps} label="First" />
          <KeyBindingInput
            {...defaultProps}
            label="Second"
            currentAction="move_right"
          />
        </>,
      );

      const [firstButton, secondButton] = screen.getAllByRole("button");

      // Start listening on first, then switch to second
      fireEvent.click(firstButton);
      fireEvent.click(secondButton);

      // A keypress should be captured by the second input only
      fireEvent.keyDown(window, { key: "Tab" });

      // Second input should have accepted Tab and stopped listening
      expect(secondButton.textContent).not.toBe("Press a key...");
      // First input should not have captured Tab — onChange called exactly once
      expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    });
  });
});
