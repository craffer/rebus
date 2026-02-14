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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unsupported_extension_returns_error() {
        let result = parse(b"data", "pdf");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            err.to_string().contains("pdf"),
            "Error should mention the unsupported extension"
        );
    }

    #[test]
    fn test_extension_is_case_insensitive() {
        // "PUZ" should route to the puz parser (which will fail on invalid data,
        // but that's a puz-level error, not UnsupportedFormat)
        let result = parse(b"short", "PUZ");
        assert!(result.is_err());
        // Should NOT be UnsupportedFormat
        let err_msg = result.unwrap_err().to_string();
        assert!(
            !err_msg.contains("unsupported format"),
            "PUZ (uppercase) should route to the puz parser, not unsupported"
        );
    }

    #[test]
    fn test_xml_extension_routes_to_jpz() {
        // "xml" should route to the jpz parser
        let result = parse(b"not xml", "xml");
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(
            !err_msg.contains("unsupported format"),
            "xml extension should route to jpz parser"
        );
    }

    #[test]
    fn test_ipuz_extension_routes_correctly() {
        let result = parse(b"{}", "ipuz");
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(
            !err_msg.contains("unsupported format"),
            "ipuz extension should route to ipuz parser"
        );
    }
}
