export type ArrowKeyBehavior = "stay" | "move";
export type SpacebarBehavior = "clear_advance" | "toggle_direction";
export type EndOfWordAction =
  | "stop"
  | "jump_back_to_blank"
  | "jump_to_next_clue";
export type TabSkipMode = "none" | "ink_only" | "all_filled";
export type AutoCheckMode = "off" | "check" | "reveal";
export type TimerDirection = "up" | "down";
export type ClueFontSize = "small" | "medium" | "large";
export type Theme = "light" | "dark" | "system";

export type KeyBindingAction =
  | "move_left"
  | "move_right"
  | "move_up"
  | "move_down"
  | "next_clue"
  | "previous_clue"
  | "next_clue_alt"
  | "spacebar"
  | "backspace"
  | "delete"
  | "rebus_mode"
  | "pause"
  | "pencil_mode";

export interface KeyBindings {
  move_left: string;
  move_right: string;
  move_up: string;
  move_down: string;
  next_clue: string;
  previous_clue: string;
  next_clue_alt: string;
  spacebar: string;
  backspace: string;
  delete: string;
  rebus_mode: string;
  pause: string;
  pencil_mode: string;
}

export interface NavigationSettings {
  arrow_key_behavior: ArrowKeyBehavior;
  spacebar_behavior: SpacebarBehavior;
  backspace_into_previous_word: boolean;
  skip_filled_cells: TabSkipMode;
  end_of_word_action: EndOfWordAction;
  tab_skip_completed_clues: TabSkipMode;
  scroll_clue_to_top: boolean;
  shift_activates_pencil_mode: boolean;
}

export interface FeedbackSettings {
  play_sound_on_solve: boolean;
  show_timer: boolean;
  show_milestones: boolean;
  suppress_disqualification_warnings: boolean;
}

export interface AppearanceSettings {
  theme: Theme;
  highlight_color: string;
  clue_font_size: ClueFontSize;
  grid_scale: number;
  show_incorrect_count: boolean;
}

export interface Settings {
  navigation: NavigationSettings;
  feedback: FeedbackSettings;
  appearance: AppearanceSettings;
  keybindings: KeyBindings;
  auto_check: AutoCheckMode;
  timer_direction: TimerDirection;
}

export const DEFAULT_SETTINGS: Settings = {
  navigation: {
    arrow_key_behavior: "stay",
    spacebar_behavior: "clear_advance",
    backspace_into_previous_word: false,
    skip_filled_cells: "all_filled",
    end_of_word_action: "stop",
    tab_skip_completed_clues: "ink_only",
    scroll_clue_to_top: true,
    shift_activates_pencil_mode: true,
  },
  feedback: {
    play_sound_on_solve: true,
    show_timer: true,
    show_milestones: true,
    suppress_disqualification_warnings: false,
  },
  appearance: {
    theme: "system",
    highlight_color: "#3478F6",
    clue_font_size: "medium",
    grid_scale: 1,
    show_incorrect_count: false,
  },
  keybindings: {
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
    pause: ";",
    pencil_mode: ".",
  },
  auto_check: "off",
  timer_direction: "up",
};
