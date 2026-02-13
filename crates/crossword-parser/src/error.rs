use thiserror::Error;

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("invalid magic string: expected ACROSS&DOWN")]
    InvalidMagic,

    #[error("file too short: expected at least {expected} bytes, got {actual}")]
    FileTooShort { expected: usize, actual: usize },

    #[error("checksum mismatch: expected {expected:#06x}, got {actual:#06x}")]
    ChecksumMismatch { expected: u16, actual: u16 },

    #[error("invalid grid dimensions: {width}x{height}")]
    InvalidDimensions { width: u8, height: u8 },

    #[error("unexpected end of string data")]
    UnexpectedEndOfStrings,

    #[error("encoding error: {0}")]
    Encoding(String),

    #[error("unsupported format: {0}")]
    UnsupportedFormat(String),

    #[error("invalid data: {0}")]
    InvalidData(String),

    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("XML parse error: {0}")]
    Xml(String),
}
