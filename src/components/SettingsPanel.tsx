import { useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";
import Toggle from "./ui/Toggle";
import Select from "./ui/Select";
import type {
  ArrowKeyBehavior,
  SpacebarBehavior,
  EndOfWordAction,
  TabSkipMode,
  AutoCheckMode,
  TimerDirection,
  ClueFontSize,
  Theme,
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
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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
