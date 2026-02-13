use serde::{Deserialize, Serialize};

/// A parsed crossword puzzle, independent of source format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Puzzle {
    pub title: String,
    pub author: String,
    pub copyright: String,
    pub notes: String,
    pub width: u8,
    pub height: u8,
    pub grid: Vec<Vec<Cell>>,
    pub clues: Clues,
    pub has_solution: bool,
    pub is_scrambled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cell {
    pub kind: CellKind,
    /// Clue number displayed in the top-left of the cell, if any.
    pub number: Option<u32>,
    /// The correct single-character solution (for normal cells).
    pub solution: Option<String>,
    /// Multi-character solution for rebus squares.
    pub rebus_solution: Option<String>,
    /// What the player has entered so far.
    pub player_value: Option<String>,
    /// Whether this cell has a circle indicator.
    pub is_circled: bool,
    /// Whether the player's answer was previously marked incorrect.
    pub was_incorrect: bool,
    /// Whether this cell was revealed to the player.
    pub is_revealed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CellKind {
    Black,
    Letter,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clues {
    pub across: Vec<Clue>,
    pub down: Vec<Clue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clue {
    /// The clue number (e.g., 1, 5, 14).
    pub number: u32,
    /// The clue text.
    pub text: String,
    /// Starting cell row (0-indexed).
    pub row: usize,
    /// Starting cell col (0-indexed).
    pub col: usize,
    /// Number of cells in the answer.
    pub length: u8,
}
