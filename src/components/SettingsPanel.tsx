import { useEffect, useState } from "react";
import { useSettingsStore } from "../store/settingsStore";
import Toggle from "./ui/Toggle";
import Select from "./ui/Select";
import KeyBindingInput from "./ui/KeyBindingInput";
import type {
  ArrowKeyBehavior,
  SpacebarBehavior,
  EndOfWordAction,
  TabSkipMode,
  AutoCheckMode,
  TimerDirection,
  ClueFontSize,
  Theme,
  KeyBindingAction,
} from "../types/settings";

interface SettingsPanelProps {
  onClose: () => void;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="mb-1 mt-4 border-b border-gray-200 pb-1 text-xs font-bold uppercase tracking-wider text-gray-500 first:mt-0 dark:border-gray-700 dark:text-gray-400">
      {title}
    </h3>
  );
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const settings = useSettingsStore((s) => s.settings);
  const updateNavigation = useSettingsStore((s) => s.updateNavigation);
  const updateFeedback = useSettingsStore((s) => s.updateFeedback);
  const updateAppearance = useSettingsStore((s) => s.updateAppearance);
  const updateKeybindings = useSettingsStore((s) => s.updateKeybindings);
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults);
  const [showAdvancedBindings, setShowAdvancedBindings] = useState(false);

  const handleKeyBindingChange = (action: KeyBindingAction, keyStr: string) => {
    updateKeybindings({ [action]: keyStr });
  };

  const handleKeyBindingSwap = (
    conflictingAction: KeyBindingAction,
    newBinding: string,
  ) => {
    updateKeybindings({ [conflictingAction]: newBinding });
  };

  // Close on Escape (unless a KeyBindingInput is listening)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Don't close if a KeyBindingInput is currently listening for a key
        if (document.body.dataset.keybindingListening === "true") {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Close settings"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Appearance */}
        <SectionHeader title="Appearance" />
        <Select<Theme>
          label="Theme"
          value={settings.appearance.theme}
          onChange={(v) => updateAppearance({ theme: v })}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        <Select<ClueFontSize>
          label="Clue font size"
          value={settings.appearance.clue_font_size}
          onChange={(v) => updateAppearance({ clue_font_size: v })}
          options={[
            { value: "small", label: "Small" },
            { value: "medium", label: "Medium" },
            { value: "large", label: "Large" },
          ]}
        />
        <Toggle
          label="Show incorrect count"
          checked={settings.appearance.show_incorrect_count}
          onChange={(v) => updateAppearance({ show_incorrect_count: v })}
        />

        {/* Navigation */}
        <SectionHeader title="Navigation" />
        <Select<ArrowKeyBehavior>
          label="Arrow keys change direction"
          value={settings.navigation.arrow_key_behavior}
          onChange={(v) => updateNavigation({ arrow_key_behavior: v })}
          options={[
            { value: "stay", label: "Stay in cell" },
            { value: "move", label: "Move to next cell" },
          ]}
        />
        <Select<SpacebarBehavior>
          label="Spacebar behavior"
          value={settings.navigation.spacebar_behavior}
          onChange={(v) => updateNavigation({ spacebar_behavior: v })}
          options={[
            { value: "clear_advance", label: "Clear & advance" },
            { value: "toggle_direction", label: "Toggle direction" },
          ]}
        />
        <Select<EndOfWordAction>
          label="At end of word"
          value={settings.navigation.end_of_word_action}
          onChange={(v) => updateNavigation({ end_of_word_action: v })}
          options={[
            { value: "stop", label: "Stop" },
            { value: "jump_back_to_blank", label: "Jump to first blank" },
            { value: "jump_to_next_clue", label: "Jump to next clue" },
          ]}
        />
        <Toggle
          label="Backspace into previous word"
          checked={settings.navigation.backspace_into_previous_word}
          onChange={(v) =>
            updateNavigation({ backspace_into_previous_word: v })
          }
        />
        <Select<TabSkipMode>
          label="Skip filled squares"
          value={settings.navigation.skip_filled_cells}
          onChange={(v) => updateNavigation({ skip_filled_cells: v })}
          options={[
            { value: "all_filled", label: "All filled (ink + pencil)" },
            { value: "ink_only", label: "Ink only" },
            { value: "none", label: "Off" },
          ]}
        />
        <Select<TabSkipMode>
          label="Skip filled clues"
          value={settings.navigation.tab_skip_completed_clues}
          onChange={(v) => updateNavigation({ tab_skip_completed_clues: v })}
          options={[
            { value: "all_filled", label: "All filled (ink + pencil)" },
            { value: "ink_only", label: "Ink only" },
            { value: "none", label: "Off" },
          ]}
        />
        <Toggle
          label="Scroll clue to top"
          checked={settings.navigation.scroll_clue_to_top}
          onChange={(v) => updateNavigation({ scroll_clue_to_top: v })}
        />
        <Toggle
          label="Shift activates pencil mode"
          checked={settings.navigation.shift_activates_pencil_mode}
          onChange={(v) => updateNavigation({ shift_activates_pencil_mode: v })}
        />

        {/* Keyboard Shortcuts */}
        <SectionHeader title="Keyboard Shortcuts" />

        {/* Next clue - show Tab and Enter together */}
        <div className="py-2">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Next clue
            </p>
            <div className="flex items-center gap-2">
              <KeyBindingInput
                label=""
                value={settings.keybindings.next_clue}
                currentAction="next_clue"
                allBindings={settings.keybindings}
                onChange={(v) => handleKeyBindingChange("next_clue", v)}
                onSwap={handleKeyBindingSwap}
                inline
              />
              <span className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-gray-500">
                OR
              </span>
              <KeyBindingInput
                label=""
                value={settings.keybindings.next_clue_alt}
                currentAction="next_clue_alt"
                allBindings={settings.keybindings}
                onChange={(v) => handleKeyBindingChange("next_clue_alt", v)}
                onSwap={handleKeyBindingSwap}
                inline
              />
            </div>
          </div>
        </div>

        <KeyBindingInput
          label="Previous clue"
          value={settings.keybindings.previous_clue}
          currentAction="previous_clue"
          allBindings={settings.keybindings}
          onChange={(v) => handleKeyBindingChange("previous_clue", v)}
          onSwap={handleKeyBindingSwap}
        />
        <KeyBindingInput
          label="Rebus mode"
          value={settings.keybindings.rebus_mode}
          currentAction="rebus_mode"
          allBindings={settings.keybindings}
          onChange={(v) => handleKeyBindingChange("rebus_mode", v)}
          onSwap={handleKeyBindingSwap}
        />
        <KeyBindingInput
          label="Pencil mode"
          value={settings.keybindings.pencil_mode}
          currentAction="pencil_mode"
          allBindings={settings.keybindings}
          onChange={(v) => handleKeyBindingChange("pencil_mode", v)}
          onSwap={handleKeyBindingSwap}
          description="Hold Shift for temporary pencil mode"
        />
        <KeyBindingInput
          label="Pause"
          value={settings.keybindings.pause}
          currentAction="pause"
          allBindings={settings.keybindings}
          onChange={(v) => handleKeyBindingChange("pause", v)}
          onSwap={handleKeyBindingSwap}
        />

        {/* Show more/less toggle */}
        <button
          type="button"
          onClick={() => setShowAdvancedBindings(!showAdvancedBindings)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-750"
        >
          <span>{showAdvancedBindings ? "Show less" : "Show more"}</span>
          <svg
            className={`h-3 w-3 transition-transform ${showAdvancedBindings ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 12 12"
          >
            <path
              d="M2 4l4 4 4-4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Advanced bindings */}
        {showAdvancedBindings && (
          <>
            <KeyBindingInput
              label="Move left"
              value={settings.keybindings.move_left}
              currentAction="move_left"
              allBindings={settings.keybindings}
              onChange={(v) => handleKeyBindingChange("move_left", v)}
              onSwap={handleKeyBindingSwap}
            />
            <KeyBindingInput
              label="Move right"
              value={settings.keybindings.move_right}
              currentAction="move_right"
              allBindings={settings.keybindings}
              onChange={(v) => handleKeyBindingChange("move_right", v)}
              onSwap={handleKeyBindingSwap}
            />
            <KeyBindingInput
              label="Move up"
              value={settings.keybindings.move_up}
              currentAction="move_up"
              allBindings={settings.keybindings}
              onChange={(v) => handleKeyBindingChange("move_up", v)}
              onSwap={handleKeyBindingSwap}
            />
            <KeyBindingInput
              label="Move down"
              value={settings.keybindings.move_down}
              currentAction="move_down"
              allBindings={settings.keybindings}
              onChange={(v) => handleKeyBindingChange("move_down", v)}
              onSwap={handleKeyBindingSwap}
            />
            <KeyBindingInput
              label="Spacebar action"
              value={settings.keybindings.spacebar}
              currentAction="spacebar"
              allBindings={settings.keybindings}
              onChange={(v) => handleKeyBindingChange("spacebar", v)}
              onSwap={handleKeyBindingSwap}
              description="Behavior configured above"
            />
            <KeyBindingInput
              label="Backspace"
              value={settings.keybindings.backspace}
              currentAction="backspace"
              allBindings={settings.keybindings}
              onChange={(v) => handleKeyBindingChange("backspace", v)}
              onSwap={handleKeyBindingSwap}
            />
            <KeyBindingInput
              label="Delete"
              value={settings.keybindings.delete}
              currentAction="delete"
              allBindings={settings.keybindings}
              onChange={(v) => handleKeyBindingChange("delete", v)}
              onSwap={handleKeyBindingSwap}
            />
          </>
        )}

        {/* Feedback */}
        <SectionHeader title="Feedback" />
        <Toggle
          label="Play sound on solve"
          checked={settings.feedback.play_sound_on_solve}
          onChange={(v) => updateFeedback({ play_sound_on_solve: v })}
        />
        <Toggle
          label="Show timer"
          checked={settings.feedback.show_timer}
          onChange={(v) => updateFeedback({ show_timer: v })}
        />
        <Toggle
          label="Show puzzle milestones"
          checked={settings.feedback.show_milestones}
          onChange={(v) => updateFeedback({ show_milestones: v })}
        />
        <Toggle
          label="Suppress disqualification warnings"
          checked={settings.feedback.suppress_disqualification_warnings}
          onChange={(v) =>
            updateFeedback({ suppress_disqualification_warnings: v })
          }
        />

        {/* Other */}
        <SectionHeader title="Other" />
        <Select<AutoCheckMode>
          label="Auto-check mode"
          value={settings.auto_check}
          onChange={(v) =>
            useSettingsStore.setState((state) => ({
              settings: { ...state.settings, auto_check: v },
            }))
          }
          options={[
            { value: "off", label: "Off" },
            { value: "check", label: "Check" },
            { value: "reveal", label: "Reveal" },
          ]}
        />
        <Select<TimerDirection>
          label="Timer direction"
          value={settings.timer_direction}
          onChange={(v) =>
            useSettingsStore.setState((state) => ({
              settings: { ...state.settings, timer_direction: v },
            }))
          }
          options={[
            { value: "up", label: "Count up" },
            { value: "down", label: "Count down" },
          ]}
        />

        {/* Reset */}
        <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            onClick={resetToDefaults}
            className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
