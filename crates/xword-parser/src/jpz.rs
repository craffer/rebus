use std::collections::HashMap;
use std::io::{Cursor, Read};

use quick_xml::events::Event;
use quick_xml::Reader;

use crate::error::ParseError;
use crate::types::{Cell, CellKind, Clue, Clues, Puzzle};

/// ZIP magic bytes (PK\x03\x04).
const ZIP_MAGIC: &[u8] = &[0x50, 0x4B, 0x03, 0x04];

/// Parse a JPZ or Crossword Compiler XML file into a `Puzzle`.
///
/// JPZ files are ZIP archives containing an XML file. If the data starts with
/// the ZIP magic bytes, it is decompressed first. Otherwise, it is parsed
/// directly as XML.
pub fn parse(data: &[u8]) -> Result<Puzzle, ParseError> {
    let xml_data = if data.starts_with(ZIP_MAGIC) {
        extract_from_zip(data)?
    } else {
        data.to_vec()
    };

    parse_xml(&xml_data)
}

/// Extract the first file from a ZIP archive.
fn extract_from_zip(data: &[u8]) -> Result<Vec<u8>, ParseError> {
    let cursor = Cursor::new(data);
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| ParseError::Xml(format!("ZIP error: {}", e)))?;

    if archive.is_empty() {
        return Err(ParseError::Xml("ZIP archive is empty".into()));
    }

    let mut file = archive
        .by_index(0)
        .map_err(|e| ParseError::Xml(format!("ZIP read error: {}", e)))?;

    let mut contents = Vec::new();
    file.read_to_end(&mut contents)
        .map_err(|e| ParseError::Xml(format!("ZIP decompress error: {}", e)))?;

    Ok(contents)
}

/// A word definition from <word> elements.
#[derive(Debug, Clone)]
struct WordDef {
    id: String,
    start_col: usize, // 0-indexed
    start_row: usize, // 0-indexed
    length: u8,
}

/// A parsed cell from <cell> elements.
#[derive(Debug)]
struct RawCell {
    x: usize, // 1-indexed from XML
    y: usize, // 1-indexed from XML
    solution: Option<String>,
    number: Option<u32>,
    is_block: bool,
    is_circled: bool,
}

/// A parsed clue from <clue> elements.
#[derive(Debug)]
struct RawClue {
    word_id: String,
    number: u32,
    text: String,
}

/// Parse Crossword Compiler XML into a `Puzzle`.
fn parse_xml(data: &[u8]) -> Result<Puzzle, ParseError> {
    let mut reader = Reader::from_reader(data);
    reader.config_mut().trim_text(true);

    let mut title = String::new();
    let mut creator = String::new();
    let mut copyright = String::new();
    let mut description = String::new();

    let mut grid_width: u8 = 0;
    let mut grid_height: u8 = 0;
    let mut raw_cells: Vec<RawCell> = Vec::new();
    let mut word_defs: Vec<WordDef> = Vec::new();
    let mut across_clues: Vec<RawClue> = Vec::new();
    let mut down_clues: Vec<RawClue> = Vec::new();

    // State tracking
    let mut in_metadata = false;
    let mut in_title = false;
    let mut in_creator = false;
    let mut in_copyright = false;
    let mut in_description = false;
    let mut in_clues = false;
    let mut current_clue_direction: Option<bool> = None; // true = across
    let mut in_clue = false;
    let mut current_clue_word_id = String::new();
    let mut current_clue_number: u32 = 0;
    let mut current_clue_text = String::new();
    let mut in_clue_title = false;

    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Eof) => break,
            Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
                let local_name = e.local_name();
                let name = std::str::from_utf8(local_name.as_ref()).unwrap_or("");

                match name {
                    "metadata" => in_metadata = true,
                    "title" if in_metadata => in_title = true,
                    "creator" if in_metadata => in_creator = true,
                    "copyright" if in_metadata => in_copyright = true,
                    "description" if in_metadata => in_description = true,
                    "grid" => {
                        for attr in e.attributes().flatten() {
                            let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("");
                            let val = std::str::from_utf8(&attr.value).unwrap_or("");
                            match key {
                                "width" => grid_width = val.parse().unwrap_or(0),
                                "height" => grid_height = val.parse().unwrap_or(0),
                                _ => {}
                            }
                        }
                    }
                    "cell" => {
                        let cell = parse_cell_element(&e)?;
                        raw_cells.push(cell);
                    }
                    "word" => {
                        if let Some(word) = parse_word_element(&e)? {
                            word_defs.push(word);
                        }
                    }
                    "clues" => {
                        in_clues = true;
                        current_clue_direction = None;
                    }
                    "title" if in_clues => in_clue_title = true,
                    "clue" if in_clues => {
                        in_clue = true;
                        current_clue_text.clear();
                        current_clue_word_id.clear();
                        current_clue_number = 0;
                        for attr in e.attributes().flatten() {
                            let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("");
                            let val = std::str::from_utf8(&attr.value).unwrap_or("");
                            match key {
                                "word" => current_clue_word_id = val.to_string(),
                                "number" => current_clue_number = val.parse().unwrap_or(0),
                                _ => {}
                            }
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::Text(e)) => {
                let text = e.unescape().unwrap_or_default().to_string();
                if in_title && in_metadata {
                    title.push_str(&text);
                } else if in_creator {
                    creator.push_str(&text);
                } else if in_copyright {
                    copyright.push_str(&text);
                } else if in_description {
                    description.push_str(&text);
                } else if in_clue_title && in_clues {
                    // Determine direction from title text
                    let lower = text.to_lowercase();
                    if lower.contains("across") {
                        current_clue_direction = Some(true);
                    } else if lower.contains("down") {
                        current_clue_direction = Some(false);
                    }
                } else if in_clue {
                    current_clue_text.push_str(&text);
                }
            }
            Ok(Event::End(e)) => {
                let local_name = e.local_name();
                let name = std::str::from_utf8(local_name.as_ref()).unwrap_or("");
                match name {
                    "metadata" => in_metadata = false,
                    "title" if in_metadata => in_title = false,
                    "title" if in_clues => in_clue_title = false,
                    "creator" => in_creator = false,
                    "copyright" => in_copyright = false,
                    "description" => in_description = false,
                    "clues" => {
                        in_clues = false;
                        current_clue_direction = None;
                    }
                    "clue" => {
                        if in_clue && current_clue_number > 0 {
                            let raw = RawClue {
                                word_id: current_clue_word_id.clone(),
                                number: current_clue_number,
                                text: strip_html_tags(&current_clue_text),
                            };
                            match current_clue_direction {
                                Some(true) => across_clues.push(raw),
                                Some(false) => down_clues.push(raw),
                                None => {} // skip if direction unknown
                            }
                        }
                        in_clue = false;
                    }
                    _ => {}
                }
            }
            Err(e) => return Err(ParseError::Xml(format!("XML parse error: {}", e))),
            _ => {}
        }
        buf.clear();
    }

    if grid_width == 0 || grid_height == 0 {
        return Err(ParseError::InvalidDimensions {
            width: grid_width,
            height: grid_height,
        });
    }

    // Build grid from raw cells
    let w = grid_width as usize;
    let h = grid_height as usize;
    let mut grid: Vec<Vec<Cell>> = vec![
        vec![
            Cell {
                kind: CellKind::Letter,
                number: None,
                solution: None,
                rebus_solution: None,
                player_value: None,
                is_circled: false,
                was_incorrect: false,
                is_revealed: false,
            };
            w
        ];
        h
    ];

    let mut has_solution = false;
    for cell in &raw_cells {
        let col = cell.x.saturating_sub(1); // convert 1-indexed to 0-indexed
        let row = cell.y.saturating_sub(1);
        if row >= h || col >= w {
            continue;
        }

        if cell.is_block {
            grid[row][col] = Cell {
                kind: CellKind::Black,
                number: None,
                solution: None,
                rebus_solution: None,
                player_value: None,
                is_circled: false,
                was_incorrect: false,
                is_revealed: false,
            };
        } else {
            if cell.solution.is_some() {
                has_solution = true;
            }
            let (solution, rebus_solution) = if let Some(ref sol) = cell.solution {
                let upper = sol.to_uppercase();
                if upper.len() > 1 {
                    let first = upper.chars().next().unwrap().to_string();
                    (Some(first), Some(upper))
                } else {
                    (Some(upper), None)
                }
            } else {
                (None, None)
            };

            grid[row][col] = Cell {
                kind: CellKind::Letter,
                number: cell.number,
                solution,
                rebus_solution,
                player_value: None,
                is_circled: cell.is_circled,
                was_incorrect: false,
                is_revealed: false,
            };
        }
    }

    // Build word lookup: word_id -> WordDef
    let word_map: HashMap<String, &WordDef> = word_defs.iter().map(|w| (w.id.clone(), w)).collect();

    // Build clue structs
    let final_across = build_clues_from_raw(&across_clues, &word_map)?;
    let final_down = build_clues_from_raw(&down_clues, &word_map)?;

    Ok(Puzzle {
        title,
        author: creator,
        copyright,
        notes: description,
        width: grid_width,
        height: grid_height,
        grid,
        clues: Clues {
            across: final_across,
            down: final_down,
        },
        has_solution,
        is_scrambled: false,
    })
}

/// Parse a <cell> XML element.
fn parse_cell_element(e: &quick_xml::events::BytesStart) -> Result<RawCell, ParseError> {
    let mut x: usize = 0;
    let mut y: usize = 0;
    let mut solution: Option<String> = None;
    let mut number: Option<u32> = None;
    let mut is_block = false;
    let mut is_circled = false;

    for attr in e.attributes().flatten() {
        let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("");
        let val = std::str::from_utf8(&attr.value).unwrap_or("");
        match key {
            "x" => x = val.parse().unwrap_or(0),
            "y" => y = val.parse().unwrap_or(0),
            "solution" => solution = Some(val.to_string()),
            "number" => number = val.parse().ok(),
            "type" if val == "block" => is_block = true,
            "background-shape" if val == "circle" => is_circled = true,
            _ => {}
        }
    }

    Ok(RawCell {
        x,
        y,
        solution,
        number,
        is_block,
        is_circled,
    })
}

/// Parse a <word> XML element.
/// Word elements define spans: `x="1-6" y="2"` (across) or `x="2" y="1-4"` (down).
fn parse_word_element(e: &quick_xml::events::BytesStart) -> Result<Option<WordDef>, ParseError> {
    let mut id = String::new();
    let mut x_attr = String::new();
    let mut y_attr = String::new();

    for attr in e.attributes().flatten() {
        let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("");
        let val = std::str::from_utf8(&attr.value).unwrap_or("");
        match key {
            "id" => id = val.to_string(),
            "x" => x_attr = val.to_string(),
            "y" => y_attr = val.to_string(),
            _ => {}
        }
    }

    if id.is_empty() {
        return Ok(None);
    }

    // Determine if across (x has range) or down (y has range)
    let (start_col, start_row, length) = if x_attr.contains('-') {
        // Across: x="1-6", y="2"
        let (start, end) = parse_range(&x_attr)?;
        let row: usize = y_attr
            .parse()
            .map_err(|_| ParseError::Xml(format!("invalid word y: {}", y_attr)))?;
        (start, row, (end - start + 1) as u8)
    } else if y_attr.contains('-') {
        // Down: x="2", y="1-4"
        let (start, end) = parse_range(&y_attr)?;
        let col: usize = x_attr
            .parse()
            .map_err(|_| ParseError::Xml(format!("invalid word x: {}", x_attr)))?;
        (col, start, (end - start + 1) as u8)
    } else {
        // Single cell word — skip
        return Ok(None);
    };

    Ok(Some(WordDef {
        id,
        start_col: start_col.saturating_sub(1), // 1-indexed to 0-indexed
        start_row: start_row.saturating_sub(1),
        length,
    }))
}

/// Parse a range string like "1-6" into (start, end).
fn parse_range(s: &str) -> Result<(usize, usize), ParseError> {
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 2 {
        return Err(ParseError::Xml(format!("invalid range: {}", s)));
    }
    let start: usize = parts[0]
        .parse()
        .map_err(|_| ParseError::Xml(format!("invalid range start: {}", s)))?;
    let end: usize = parts[1]
        .parse()
        .map_err(|_| ParseError::Xml(format!("invalid range end: {}", s)))?;
    Ok((start, end))
}

/// Build Clue structs from raw clues using word definitions.
fn build_clues_from_raw(
    raw_clues: &[RawClue],
    word_map: &HashMap<String, &WordDef>,
) -> Result<Vec<Clue>, ParseError> {
    let mut clues = Vec::new();

    for raw in raw_clues {
        if let Some(word) = word_map.get(&raw.word_id) {
            clues.push(Clue {
                number: raw.number,
                text: raw.text.clone(),
                row: word.start_row,
                col: word.start_col,
                length: word.length,
            });
        }
    }

    Ok(clues)
}

/// Strip HTML tags from a string (e.g., "<b>Across</b>" -> "Across").
fn strip_html_tags(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut in_tag = false;
    for c in s.chars() {
        if c == '<' {
            in_tag = true;
        } else if c == '>' {
            in_tag = false;
        } else if !in_tag {
            result.push(c);
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_xml_fixture() {
        let data = include_bytes!("../tests/fixtures/puzzleme-example-crossword.xml");
        let puzzle = parse(data).unwrap();

        assert_eq!(puzzle.title, "Example 13x13 British style crossword");
        assert_eq!(puzzle.author, "Amuse Labs");
        assert_eq!(puzzle.width, 13);
        assert_eq!(puzzle.height, 13);
        assert!(puzzle.has_solution);

        // Check grid dimensions
        assert_eq!(puzzle.grid.len(), 13);
        assert_eq!(puzzle.grid[0].len(), 13);

        // First cell (1,1) is a block
        assert!(matches!(puzzle.grid[0][0].kind, CellKind::Black));

        // Cell (2,1) = "H", number 1
        assert!(matches!(puzzle.grid[0][1].kind, CellKind::Letter));
        assert_eq!(puzzle.grid[0][1].number, Some(1));
        assert_eq!(puzzle.grid[0][1].solution, Some("H".to_string()));

        // Check clue counts
        assert_eq!(puzzle.clues.across.len(), 12);
        assert_eq!(puzzle.clues.down.len(), 10);

        // Check first across clue
        assert_eq!(puzzle.clues.across[0].number, 7);
        assert_eq!(puzzle.clues.across[0].text, "One under, in golf");
    }

    #[test]
    fn test_parse_jpz_zip_fixture() {
        let data = include_bytes!("../tests/fixtures/puzzleme-example-crossword.jpz");
        let puzzle = parse(data).unwrap();

        // Should successfully decompress and parse
        assert!(puzzle.width > 0);
        assert!(puzzle.height > 0);
        assert!(!puzzle.clues.across.is_empty());
        assert!(!puzzle.clues.down.is_empty());
    }

    #[test]
    fn test_strip_html_tags() {
        assert_eq!(strip_html_tags("<b>Across</b>"), "Across");
        assert_eq!(strip_html_tags("plain text"), "plain text");
        assert_eq!(
            strip_html_tags("Old-fashioned record player: Hyph."),
            "Old-fashioned record player: Hyph."
        );
    }

    #[test]
    fn test_parse_range() {
        assert_eq!(parse_range("1-6").unwrap(), (1, 6));
        assert_eq!(parse_range("10-13").unwrap(), (10, 13));
        assert!(parse_range("invalid").is_err());
    }
}
