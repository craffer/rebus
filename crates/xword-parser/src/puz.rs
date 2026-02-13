//! Parser for the .puz (Across Lite) binary crossword format.
//!
//! File format reference:
//! https://code.google.com/archive/p/puz/wikis/FileFormat.wiki

use byteorder::{LittleEndian, ReadBytesExt};
use std::io::Cursor;

use crate::error::ParseError;
use crate::types::*;

const MAGIC: &[u8; 12] = b"ACROSS&DOWN\0";

// Header offsets — some are unused now but defined for completeness per the spec.
#[allow(dead_code)]
const OFFSET_FILE_CHECKSUM: usize = 0x00;
const OFFSET_MAGIC: usize = 0x02;
#[allow(dead_code)]
const OFFSET_HEADER_CHECKSUM: usize = 0x0E;
#[allow(dead_code)]
const OFFSET_MASKED_CHECKSUMS: usize = 0x10;
#[allow(dead_code)]
const OFFSET_VERSION: usize = 0x18;
#[allow(dead_code)]
const OFFSET_SCRAMBLED_CHECKSUM: usize = 0x1E;
const OFFSET_WIDTH: usize = 0x2C;
const OFFSET_HEIGHT: usize = 0x2D;
const OFFSET_NUM_CLUES: usize = 0x2E;
#[allow(dead_code)]
const OFFSET_PUZZLE_TYPE: usize = 0x30;
const OFFSET_SCRAMBLED_TAG: usize = 0x32;
const HEADER_SIZE: usize = 0x34;

// Extension section names
const EXT_GRBS: &[u8; 4] = b"GRBS";
const EXT_RTBL: &[u8; 4] = b"RTBL";
const EXT_GEXT: &[u8; 4] = b"GEXT";
const EXT_LTIM: &[u8; 4] = b"LTIM";

// GEXT flags
const GEXT_CIRCLED: u8 = 0x80;
const GEXT_WAS_INCORRECT: u8 = 0x10;
const GEXT_REVEALED: u8 = 0x40;

/// Parse a .puz file from raw bytes.
pub fn parse(data: &[u8]) -> Result<Puzzle, ParseError> {
    if data.len() < HEADER_SIZE {
        return Err(ParseError::FileTooShort {
            expected: HEADER_SIZE,
            actual: data.len(),
        });
    }

    // Verify magic string
    if &data[OFFSET_MAGIC..OFFSET_MAGIC + 12] != MAGIC {
        return Err(ParseError::InvalidMagic);
    }

    // Read header fields
    let width = data[OFFSET_WIDTH];
    let height = data[OFFSET_HEIGHT];
    if width == 0 || height == 0 {
        return Err(ParseError::InvalidDimensions { width, height });
    }

    let num_clues = {
        let mut cursor = Cursor::new(&data[OFFSET_NUM_CLUES..]);
        cursor.read_u16::<LittleEndian>().unwrap()
    } as usize;

    let scrambled_tag = {
        let mut cursor = Cursor::new(&data[OFFSET_SCRAMBLED_TAG..]);
        cursor.read_u16::<LittleEndian>().unwrap()
    };
    let is_scrambled = scrambled_tag != 0;

    let grid_size = (width as usize) * (height as usize);

    // Check we have enough data for the grids
    let solution_start = HEADER_SIZE;
    let solution_end = solution_start + grid_size;
    let state_start = solution_end;
    let state_end = state_start + grid_size;

    if data.len() < state_end {
        return Err(ParseError::FileTooShort {
            expected: state_end,
            actual: data.len(),
        });
    }

    let solution_grid = &data[solution_start..solution_end];
    let state_grid = &data[state_start..state_end];

    // Parse null-terminated strings after the grids
    let strings = parse_strings(&data[state_end..], num_clues + 4)?;
    // strings: [title, author, copyright, clue0, clue1, ..., clueN-1, notes]
    let title = strings.first().cloned().unwrap_or_default();
    let author = strings.get(1).cloned().unwrap_or_default();
    let copyright = strings.get(2).cloned().unwrap_or_default();

    let clue_texts: Vec<String> = strings[3..3 + num_clues].to_vec();
    let notes = strings.get(3 + num_clues).cloned().unwrap_or_default();

    // Parse extension sections
    let extensions_start = find_extensions_start(&data[state_end..], num_clues + 4);
    let extensions = if let Some(ext_offset) = extensions_start {
        parse_extensions(&data[state_end + ext_offset..])
    } else {
        Extensions::default()
    };

    // Build the grid with numbering
    let (grid, across_clues, down_clues) = build_grid(
        width,
        height,
        solution_grid,
        state_grid,
        &clue_texts,
        &extensions,
    )?;

    Ok(Puzzle {
        title,
        author,
        copyright,
        notes,
        width,
        height,
        grid,
        clues: Clues {
            across: across_clues,
            down: down_clues,
        },
        has_solution: !is_scrambled,
        is_scrambled,
    })
}

/// Parse null-terminated strings from the data section.
fn parse_strings(data: &[u8], expected_count: usize) -> Result<Vec<String>, ParseError> {
    let mut strings = Vec::with_capacity(expected_count);
    let mut pos = 0;

    for _ in 0..expected_count {
        match data[pos..].iter().position(|&b| b == 0) {
            Some(end) => {
                let s = decode_string(&data[pos..pos + end]);
                strings.push(s);
                pos += end + 1;
            }
            None => {
                // Last string may not be null-terminated
                if pos < data.len() {
                    let s = decode_string(&data[pos..]);
                    strings.push(s);
                    break;
                } else {
                    // Pad with empty strings if we've run out of data
                    strings.push(String::new());
                }
            }
        }
    }

    Ok(strings)
}

/// Decode bytes to string, trying UTF-8 first, then falling back to ISO-8859-1.
fn decode_string(bytes: &[u8]) -> String {
    match std::str::from_utf8(bytes) {
        Ok(s) => s.to_string(),
        Err(_) => {
            let (cow, _, _) = encoding_rs::WINDOWS_1252.decode(bytes);
            cow.into_owned()
        }
    }
}

/// Find where extension sections start by skipping past all null-terminated strings.
fn find_extensions_start(data: &[u8], string_count: usize) -> Option<usize> {
    let mut pos = 0;

    for _ in 0..string_count {
        match data[pos..].iter().position(|&b| b == 0) {
            Some(end) => pos += end + 1,
            None => return None,
        }
    }

    if pos < data.len() {
        Some(pos)
    } else {
        None
    }
}

#[derive(Default)]
struct Extensions {
    /// GRBS: grid of rebus indices (0 = no rebus, 1+ = index into RTBL + 1)
    grbs: Vec<u8>,
    /// RTBL: rebus table mapping indices to solution strings
    rtbl: std::collections::HashMap<u8, String>,
    /// GEXT: grid of extra flags (circled, revealed, was_incorrect)
    gext: Vec<u8>,
    /// LTIM: timer state "elapsed,is_running"
    ltim: Option<String>,
}

/// Parse extension sections from the data after the strings.
fn parse_extensions(data: &[u8]) -> Extensions {
    let mut ext = Extensions::default();
    let mut pos = 0;

    while pos + 8 <= data.len() {
        let name = &data[pos..pos + 4];
        let length = {
            let mut cursor = Cursor::new(&data[pos + 4..]);
            match cursor.read_u16::<LittleEndian>() {
                Ok(v) => v as usize,
                Err(_) => break,
            }
        };
        // Skip checksum at pos+6..pos+8
        let section_data_start = pos + 8;
        let section_data_end = section_data_start + length;

        if section_data_end > data.len() {
            break;
        }

        let section_data = &data[section_data_start..section_data_end];

        if name == EXT_GRBS {
            ext.grbs = section_data.to_vec();
        } else if name == EXT_RTBL {
            ext.rtbl = parse_rtbl(section_data);
        } else if name == EXT_GEXT {
            ext.gext = section_data.to_vec();
        } else if name == EXT_LTIM {
            ext.ltim = Some(decode_string(section_data));
        }

        // Skip past section data + null terminator
        pos = section_data_end + 1;
    }

    ext
}

/// Parse the RTBL (rebus table) section.
/// Format: " 0:HEART; 1:SPADE;" etc.
fn parse_rtbl(data: &[u8]) -> std::collections::HashMap<u8, String> {
    let s = decode_string(data);
    let mut map = std::collections::HashMap::new();

    for entry in s.split(';') {
        let entry = entry.trim();
        if entry.is_empty() {
            continue;
        }
        if let Some((key_str, value)) = entry.split_once(':') {
            if let Ok(key) = key_str.trim().parse::<u8>() {
                map.insert(key, value.to_string());
            }
        }
    }

    map
}

type BuildGridResult = (Vec<Vec<Cell>>, Vec<Clue>, Vec<Clue>);

/// Build the puzzle grid with clue numbering.
fn build_grid(
    width: u8,
    height: u8,
    solution_grid: &[u8],
    state_grid: &[u8],
    clue_texts: &[String],
    extensions: &Extensions,
) -> Result<BuildGridResult, ParseError> {
    let w = width as usize;
    let h = height as usize;
    let mut grid: Vec<Vec<Cell>> = Vec::with_capacity(h);
    let mut across_clues: Vec<Clue> = Vec::new();
    let mut down_clues: Vec<Clue> = Vec::new();
    let mut clue_number: u32 = 1;
    let mut clue_idx: usize = 0;

    for row in 0..h {
        let mut grid_row: Vec<Cell> = Vec::with_capacity(w);
        for col in 0..w {
            let idx = row * w + col;
            let sol_byte = solution_grid[idx];
            let state_byte = state_grid[idx];

            let is_black = sol_byte == b'.';

            if is_black {
                grid_row.push(Cell {
                    kind: CellKind::Black,
                    number: None,
                    solution: None,
                    rebus_solution: None,
                    player_value: None,
                    is_circled: false,
                    was_incorrect: false,
                    is_revealed: false,
                });
                continue;
            }

            // Determine if this cell starts an across or down word
            let starts_across = is_across_start(solution_grid, w, h, row, col);
            let starts_down = is_down_start(solution_grid, w, h, row, col);

            let cell_number = if starts_across || starts_down {
                let n = clue_number;
                clue_number += 1;

                // Assign across clue
                if starts_across {
                    let length = word_length_across(solution_grid, w, row, col);
                    let text = clue_texts.get(clue_idx).cloned().unwrap_or_default();
                    clue_idx += 1;
                    across_clues.push(Clue {
                        number: n,
                        text,
                        row,
                        col,
                        length,
                    });
                }

                // Assign down clue
                if starts_down {
                    let length = word_length_down(solution_grid, w, h, row, col);
                    let text = clue_texts.get(clue_idx).cloned().unwrap_or_default();
                    clue_idx += 1;
                    down_clues.push(Clue {
                        number: n,
                        text,
                        row,
                        col,
                        length,
                    });
                }

                Some(n)
            } else {
                None
            };

            // Solution character
            let solution = if sol_byte != b'-' && sol_byte != b':' {
                Some((sol_byte as char).to_uppercase().to_string())
            } else {
                None
            };

            // Rebus solution
            let rebus_solution = if !extensions.grbs.is_empty() && idx < extensions.grbs.len() {
                let rebus_key = extensions.grbs[idx];
                if rebus_key > 0 {
                    extensions.rtbl.get(&(rebus_key - 1)).cloned()
                } else {
                    None
                }
            } else {
                None
            };

            // Player value from state grid
            let player_value = if state_byte != b'-' && state_byte != b'.' && state_byte != 0 {
                Some((state_byte as char).to_uppercase().to_string())
            } else {
                None
            };

            // GEXT flags
            let gext_byte = extensions.gext.get(idx).copied().unwrap_or(0);
            let is_circled = gext_byte & GEXT_CIRCLED != 0;
            let was_incorrect = gext_byte & GEXT_WAS_INCORRECT != 0;
            let is_revealed = gext_byte & GEXT_REVEALED != 0;

            grid_row.push(Cell {
                kind: CellKind::Letter,
                number: cell_number,
                solution,
                rebus_solution,
                player_value,
                is_circled,
                was_incorrect,
                is_revealed,
            });
        }
        grid.push(grid_row);
    }

    Ok((grid, across_clues, down_clues))
}

/// Check if a cell starts an across word.
/// A cell starts an across word if:
/// 1. It's a letter cell
/// 2. The cell to its left is black or is the left edge
/// 3. The cell to its right is a letter cell
fn is_across_start(grid: &[u8], w: usize, _h: usize, row: usize, col: usize) -> bool {
    let idx = row * w + col;
    if grid[idx] == b'.' {
        return false;
    }
    let left_is_boundary = col == 0 || grid[idx - 1] == b'.';
    let right_is_letter = col + 1 < w && grid[idx + 1] != b'.';
    left_is_boundary && right_is_letter
}

/// Check if a cell starts a down word.
fn is_down_start(grid: &[u8], w: usize, h: usize, row: usize, col: usize) -> bool {
    let idx = row * w + col;
    if grid[idx] == b'.' {
        return false;
    }
    let above_is_boundary = row == 0 || grid[(row - 1) * w + col] == b'.';
    let below_is_letter = row + 1 < h && grid[(row + 1) * w + col] != b'.';
    above_is_boundary && below_is_letter
}

/// Count the length of an across word starting at (row, col).
fn word_length_across(grid: &[u8], w: usize, row: usize, col: usize) -> u8 {
    let mut length = 0u8;
    let mut c = col;
    while c < w && grid[row * w + c] != b'.' {
        length += 1;
        c += 1;
    }
    length
}

/// Count the length of a down word starting at (row, col).
fn word_length_down(grid: &[u8], w: usize, h: usize, row: usize, col: usize) -> u8 {
    let mut length = 0u8;
    let mut r = row;
    while r < h && grid[r * w + col] != b'.' {
        length += 1;
        r += 1;
    }
    length
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Create a minimal valid .puz file for testing.
    fn make_test_puz() -> Vec<u8> {
        let width: u8 = 3;
        let height: u8 = 3;
        // Solution: CAT / .O. / DOG
        let solution = b"CAT.O.DOG";
        // Player state: all empty
        let state = b"---------";

        // Build header
        let mut data = vec![0u8; HEADER_SIZE];

        // Magic string at offset 0x02
        data[OFFSET_MAGIC..OFFSET_MAGIC + 12].copy_from_slice(MAGIC);

        // Width and height
        data[OFFSET_WIDTH] = width;
        data[OFFSET_HEIGHT] = height;

        // Number of clues: 3 (1-Across, 2-Down, 3-Across)
        data[OFFSET_NUM_CLUES] = 3;
        data[OFFSET_NUM_CLUES + 1] = 0;

        // Scrambled tag = 0
        data[OFFSET_SCRAMBLED_TAG] = 0;
        data[OFFSET_SCRAMBLED_TAG + 1] = 0;

        // Append solution and state grids
        data.extend_from_slice(solution);
        data.extend_from_slice(state);

        // Append strings: title, author, copyright, 3 clues, notes
        // Clue order in .puz: across clues before down clues for the same number,
        // then ordered by number. So: 1-Across, 2-Down, 3-Across.
        let strings = [
            "Test Puzzle",
            "Test Author",
            "2024",
            "Feline friend",          // 1-Across
            "Letter between N and P", // 2-Down
            "Canine friend",          // 3-Across
            "",                       // notes
        ];
        for s in &strings {
            data.extend_from_slice(s.as_bytes());
            data.push(0); // null terminator
        }

        data
    }

    #[test]
    fn test_parse_basic_puz() {
        let data = make_test_puz();
        let puzzle = parse(&data).expect("should parse");

        assert_eq!(puzzle.title, "Test Puzzle");
        assert_eq!(puzzle.author, "Test Author");
        assert_eq!(puzzle.width, 3);
        assert_eq!(puzzle.height, 3);
        assert_eq!(puzzle.grid.len(), 3);
        assert_eq!(puzzle.grid[0].len(), 3);

        // Check black cells
        assert!(matches!(puzzle.grid[1][0].kind, CellKind::Black));
        assert!(matches!(puzzle.grid[1][2].kind, CellKind::Black));

        // Check letter cells
        assert!(matches!(puzzle.grid[0][0].kind, CellKind::Letter));
        assert_eq!(puzzle.grid[0][0].solution.as_deref(), Some("C"));
        assert_eq!(puzzle.grid[0][0].number, Some(1));

        // Check clues: 1-Across(CAT), 2-Down(AOO), 3-Across(DOG)
        assert_eq!(puzzle.clues.across.len(), 2);
        assert_eq!(puzzle.clues.down.len(), 1);
        assert_eq!(puzzle.clues.across[0].number, 1);
        assert_eq!(puzzle.clues.across[0].text, "Feline friend");
        assert_eq!(puzzle.clues.across[0].length, 3);
        assert_eq!(puzzle.clues.down[0].number, 2);
        assert_eq!(puzzle.clues.down[0].text, "Letter between N and P");
        assert_eq!(puzzle.clues.down[0].length, 3);
        assert_eq!(puzzle.clues.across[1].number, 3);
        assert_eq!(puzzle.clues.across[1].text, "Canine friend");
        assert_eq!(puzzle.clues.across[1].length, 3);
    }

    #[test]
    fn test_clue_numbering() {
        let data = make_test_puz();
        let puzzle = parse(&data).expect("should parse");

        // Grid: CAT / .O. / DOG
        // (0,0) C: starts 1-Across (left=edge, right=A). No down (below=black).
        assert_eq!(puzzle.grid[0][0].number, Some(1));
        // (0,1) A: no across (left=letter). Starts 2-Down (above=edge, below=O).
        assert_eq!(puzzle.grid[0][1].number, Some(2));
        // (0,2) T: no across (left=letter). No down (below=black).
        assert_eq!(puzzle.grid[0][2].number, None);
        // (1,1) O: no across (left=black, right=black). No down (above=letter).
        assert_eq!(puzzle.grid[1][1].number, None);
        // (2,0) D: starts 3-Across (left=edge, right=O). No down (above=black, below=edge).
        assert_eq!(puzzle.grid[2][0].number, Some(3));
    }

    #[test]
    fn test_reject_invalid_magic() {
        let mut data = make_test_puz();
        data[OFFSET_MAGIC] = b'X';
        assert!(parse(&data).is_err());
    }

    #[test]
    fn test_reject_too_short() {
        let data = vec![0u8; 10];
        assert!(parse(&data).is_err());
    }
}
