pub mod error;
pub mod ipuz;
pub mod jpz;
pub mod puz;
pub mod types;

pub use error::ParseError;
pub use types::{Cell, CellKind, Clue, Clues, Puzzle};

/// Parse crossword puzzle bytes, auto-detecting format by extension.
pub fn parse(data: &[u8], extension: &str) -> Result<Puzzle, ParseError> {
    match extension.to_lowercase().as_str() {
        "puz" => puz::parse(data),
        "ipuz" => ipuz::parse(data),
        "jpz" | "xml" => jpz::parse(data),
        ext => Err(ParseError::UnsupportedFormat(ext.into())),
    }
}
