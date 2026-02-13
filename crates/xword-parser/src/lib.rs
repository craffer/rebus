pub mod error;
pub mod puz;
pub mod types;

pub use error::ParseError;
pub use types::{Cell, CellKind, Clue, Clues, Puzzle};

/// Parse crossword puzzle bytes, auto-detecting format by extension.
pub fn parse(data: &[u8], extension: &str) -> Result<Puzzle, ParseError> {
    match extension.to_lowercase().as_str() {
        "puz" => puz::parse(data),
        "ipuz" => Err(ParseError::UnsupportedFormat("ipuz".into())),
        "jpz" => Err(ParseError::UnsupportedFormat("jpz".into())),
        ext => Err(ParseError::UnsupportedFormat(ext.into())),
    }
}
