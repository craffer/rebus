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

export interface NavigationSettings {
  arrow_key_behavior: ArrowKeyBehavior;
  spacebar_behavior: SpacebarBehavior;
  backspace_into_previous_word: boolean;
  skip_filled_cells: TabSkipMode;
  end_of_word_action: EndOfWordAction;
  tab_skip_completed_clues: TabSkipMode;
  scroll_clue_to_top: boolean;
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
  auto_check: "off",
  timer_direction: "up",
};
