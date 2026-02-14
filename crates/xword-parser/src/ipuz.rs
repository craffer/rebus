use serde::Deserialize;
use serde_json::Value;

use crate::error::ParseError;
use crate::types::{Cell, CellKind, Clue, Clues, Puzzle};

/// Intermediate deserialization types for the ipuz JSON format.

#[derive(Deserialize)]
struct IpuzFile {
    #[serde(default)]
    kind: Vec<String>,
    dimensions: Option<IpuzDimensions>,
    puzzle: Option<Vec<Vec<Value>>>,
    solution: Option<Vec<Vec<Value>>>,
    clues: Option<IpuzClues>,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    author: Option<String>,
    #[serde(default)]
    copyright: Option<String>,
    #[serde(default)]
    notes: Option<String>,
}

#[derive(Deserialize)]
struct IpuzDimensions {
    width: u8,
    height: u8,
}

#[derive(Deserialize)]
struct IpuzClues {
    #[serde(rename = "Across", default)]
    across: Vec<Value>,
    #[serde(rename = "Down", default)]
    down: Vec<Value>,
}

/// Parse an ipuz (JSON) crossword file into a `Puzzle`.
pub fn parse(data: &[u8]) -> Result<Puzzle, ParseError> {
    let ipuz: IpuzFile = serde_json::from_slice(data)?;

    // Validate kind
    let is_crossword = ipuz
        .kind
        .iter()
        .any(|k| k.starts_with("http://ipuz.org/crossword"));
    if !is_crossword {
        return Err(ParseError::InvalidData(
            "ipuz file is not a crossword puzzle (missing crossword kind)".into(),
        ));
    }

    let dims = ipuz
        .dimensions
        .ok_or_else(|| ParseError::InvalidData("missing dimensions".into()))?;
    let w = dims.width as usize;
    let h = dims.height as usize;
    if w == 0 || h == 0 {
        return Err(ParseError::InvalidDimensions {
            width: dims.width,
            height: dims.height,
        });
    }

    let puzzle_grid = ipuz
        .puzzle
        .ok_or_else(|| ParseError::InvalidData("missing puzzle grid".into()))?;
    let solution_grid = ipuz.solution.as_ref();

    if puzzle_grid.len() != h {
        return Err(ParseError::InvalidData(format!(
            "puzzle grid has {} rows, expected {}",
            puzzle_grid.len(),
            h
        )));
    }

    // Build grid
    let mut grid: Vec<Vec<Cell>> = Vec::with_capacity(h);
    for (row, puzzle_row) in puzzle_grid.iter().enumerate().take(h) {
        if puzzle_row.len() != w {
            return Err(ParseError::InvalidData(format!(
                "row {} has {} cells, expected {}",
                row,
                puzzle_row.len(),
                w
            )));
        }

        let mut grid_row: Vec<Cell> = Vec::with_capacity(w);
        for (col, cell_val) in puzzle_row.iter().enumerate().take(w) {
            let (is_black, cell_number, is_circled) = parse_puzzle_cell(cell_val);

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

            // Extract solution
            let (solution, rebus_solution) = if let Some(sol_grid) = solution_grid {
                if let Some(sol_row) = sol_grid.get(row) {
                    if let Some(sol_val) = sol_row.get(col) {
                        parse_solution_cell(sol_val)
                    } else {
                        (None, None)
                    }
                } else {
                    (None, None)
                }
            } else {
                (None, None)
            };

            grid_row.push(Cell {
                kind: CellKind::Letter,
                number: cell_number,
                solution,
                rebus_solution,
                player_value: None,
                is_circled,
                was_incorrect: false,
                is_revealed: false,
            });
        }
        grid.push(grid_row);
    }

    // Parse clues
    let ipuz_clues = ipuz
        .clues
        .ok_or_else(|| ParseError::InvalidData("missing clues".into()))?;

    let across_clues = build_clues(&ipuz_clues.across, &grid, w, h, true)?;
    let down_clues = build_clues(&ipuz_clues.down, &grid, w, h, false)?;

    Ok(Puzzle {
        title: ipuz.title.unwrap_or_default(),
        author: ipuz.author.unwrap_or_default(),
        copyright: ipuz.copyright.unwrap_or_default(),
        notes: ipuz.notes.unwrap_or_default(),
        width: dims.width,
        height: dims.height,
        grid,
        clues: Clues {
            across: across_clues,
            down: down_clues,
        },
        has_solution: solution_grid.is_some(),
        is_scrambled: false,
    })
}

/// Parse a cell value from the puzzle array.
/// Returns (is_black, clue_number, is_circled).
fn parse_puzzle_cell(val: &Value) -> (bool, Option<u32>, bool) {
    match val {
        // "#" means black cell
        Value::String(s) if s == "#" => (true, None, false),
        // 0 means normal empty cell (no number)
        Value::Number(n) if n.as_u64() == Some(0) => (false, None, false),
        // Positive number means clue number
        Value::Number(n) => {
            let num = n.as_u64().unwrap_or(0) as u32;
            if num > 0 {
                (false, Some(num), false)
            } else {
                (false, None, false)
            }
        }
        // null means omitted — treat as black
        Value::Null => (true, None, false),
        // Object with "cell" key and optional "style"
        Value::Object(obj) => {
            let cell_num = obj.get("cell").and_then(|v| v.as_u64()).map(|n| n as u32);
            let is_circled = obj
                .get("style")
                .and_then(|s| s.get("shapebg"))
                .and_then(|v| v.as_str())
                .map(|s| s == "circle")
                .unwrap_or(false);
            // Check if this is a block
            let is_block = obj
                .get("cell")
                .map(|v| v.as_str() == Some("#"))
                .unwrap_or(false);
            if is_block {
                (true, None, false)
            } else {
                (false, cell_num.filter(|&n| n > 0), is_circled)
            }
        }
        _ => (false, None, false),
    }
}

/// Parse a solution cell value.
/// Returns (solution, rebus_solution).
fn parse_solution_cell(val: &Value) -> (Option<String>, Option<String>) {
    match val {
        Value::String(s) if s == "#" || s.is_empty() => (None, None),
        Value::String(s) => {
            let upper = s.to_uppercase();
            if upper.len() > 1 {
                // Rebus: first char as solution, full string as rebus
                let first = upper.chars().next().unwrap().to_string();
                (Some(first), Some(upper))
            } else {
                (Some(upper), None)
            }
        }
        Value::Null => (None, None),
        // Object with value key
        Value::Object(obj) => {
            if let Some(v) = obj.get("value").and_then(|v| v.as_str()) {
                let upper = v.to_uppercase();
                if upper.len() > 1 {
                    let first = upper.chars().next().unwrap().to_string();
                    (Some(first), Some(upper))
                } else {
                    (Some(upper), None)
                }
            } else {
                (None, None)
            }
        }
        _ => (None, None),
    }
}

/// Build clue list from ipuz clue array.
/// Each clue is either [number, "text"] or [number, "text", ...extra].
fn build_clues(
    clue_values: &[Value],
    grid: &[Vec<Cell>],
    w: usize,
    h: usize,
    is_across: bool,
) -> Result<Vec<Clue>, ParseError> {
    let mut clues = Vec::new();

    for val in clue_values {
        let (number, text) = match val {
            Value::Array(arr) if arr.len() >= 2 => {
                let num = arr[0]
                    .as_u64()
                    .ok_or_else(|| ParseError::InvalidData("clue number is not a number".into()))?
                    as u32;
                let text = arr[1].as_str().unwrap_or("").to_string();
                (num, text)
            }
            _ => continue, // Skip malformed clues
        };

        // Find the grid position for this clue number
        let (row, col) = find_clue_position(grid, number)
            .ok_or_else(|| ParseError::InvalidData(format!("clue {} not found in grid", number)))?;

        let length = if is_across {
            compute_word_length_across(grid, w, row, col)
        } else {
            compute_word_length_down(grid, h, row, col)
        };

        clues.push(Clue {
            number,
            text,
            row,
            col,
            length,
        });
    }

    Ok(clues)
}

/// Find the grid position (row, col) of a cell with the given clue number.
fn find_clue_position(grid: &[Vec<Cell>], number: u32) -> Option<(usize, usize)> {
    for (r, row) in grid.iter().enumerate() {
        for (c, cell) in row.iter().enumerate() {
            if cell.number == Some(number) {
                return Some((r, c));
            }
        }
    }
    None
}

/// Compute length of an across word starting at (row, col) using the Cell grid.
fn compute_word_length_across(grid: &[Vec<Cell>], w: usize, row: usize, col: usize) -> u8 {
    let mut length = 0u8;
    let mut c = col;
    while c < w {
        if matches!(grid[row][c].kind, CellKind::Black) {
            break;
        }
        length += 1;
        c += 1;
    }
    length
}

/// Compute length of a down word starting at (row, col) using the Cell grid.
fn compute_word_length_down(grid: &[Vec<Cell>], h: usize, row: usize, col: usize) -> u8 {
    let mut length = 0u8;
    let mut r = row;
    while r < h {
        if matches!(grid[r][col].kind, CellKind::Black) {
            break;
        }
        length += 1;
        r += 1;
    }
    length
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_ipuz() -> Vec<u8> {
        let json = r##"{
            "version": "http://ipuz.org/v2",
            "kind": ["http://ipuz.org/crossword#1"],
            "dimensions": { "width": 3, "height": 3 },
            "title": "Test Puzzle",
            "author": "Test Author",
            "puzzle": [
                [1, 2, 3],
                ["#", 0, "#"],
                [4, 0, 5]
            ],
            "solution": [
                ["C", "A", "T"],
                ["#", "O", "#"],
                ["D", "G", "S"]
            ],
            "clues": {
                "Across": [[1, "A feline"], [4, "Plural of something"]],
                "Down": [[1, "A fish"], [2, "Exclamation"], [3, "Several of these"]]
            }
        }"##;
        json.as_bytes().to_vec()
    }

    #[test]
    fn test_parse_basic_ipuz() {
        let data = make_test_ipuz();
        let puzzle = parse(&data).unwrap();

        assert_eq!(puzzle.title, "Test Puzzle");
        assert_eq!(puzzle.author, "Test Author");
        assert_eq!(puzzle.width, 3);
        assert_eq!(puzzle.height, 3);
        assert!(puzzle.has_solution);
        assert!(!puzzle.is_scrambled);

        // Check grid structure
        assert!(matches!(puzzle.grid[0][0].kind, CellKind::Letter));
        assert_eq!(puzzle.grid[0][0].number, Some(1));
        assert_eq!(puzzle.grid[0][0].solution, Some("C".to_string()));

        assert!(matches!(puzzle.grid[1][0].kind, CellKind::Black));
        assert!(matches!(puzzle.grid[1][1].kind, CellKind::Letter));
        assert_eq!(puzzle.grid[1][1].number, None); // 0 means no number

        // Check clues
        assert_eq!(puzzle.clues.across.len(), 2);
        assert_eq!(puzzle.clues.down.len(), 3);

        assert_eq!(puzzle.clues.across[0].number, 1);
        assert_eq!(puzzle.clues.across[0].text, "A feline");
        assert_eq!(puzzle.clues.across[0].row, 0);
        assert_eq!(puzzle.clues.across[0].col, 0);
        assert_eq!(puzzle.clues.across[0].length, 3);

        assert_eq!(puzzle.clues.down[1].number, 2);
        assert_eq!(puzzle.clues.down[1].text, "Exclamation");
        assert_eq!(puzzle.clues.down[1].row, 0);
        assert_eq!(puzzle.clues.down[1].col, 1);
        assert_eq!(puzzle.clues.down[1].length, 3);
    }

    #[test]
    fn test_parse_ipuz_with_circled_cells() {
        let json = r##"{
            "version": "http://ipuz.org/v2",
            "kind": ["http://ipuz.org/crossword#1"],
            "dimensions": { "width": 3, "height": 1 },
            "puzzle": [
                [{"cell": 1, "style": {"shapebg": "circle"}}, 0, 0]
            ],
            "solution": [["A", "B", "C"]],
            "clues": {
                "Across": [[1, "Test"]],
                "Down": []
            }
        }"##;

        let puzzle = parse(json.as_bytes()).unwrap();
        assert!(puzzle.grid[0][0].is_circled);
        assert!(!puzzle.grid[0][1].is_circled);
    }

    #[test]
    fn test_parse_ipuz_rebus() {
        let json = r##"{
            "version": "http://ipuz.org/v2",
            "kind": ["http://ipuz.org/crossword#1"],
            "dimensions": { "width": 3, "height": 1 },
            "puzzle": [[1, 0, 0]],
            "solution": [["HEART", "B", "C"]],
            "clues": {
                "Across": [[1, "Test"]],
                "Down": []
            }
        }"##;

        let puzzle = parse(json.as_bytes()).unwrap();
        assert_eq!(puzzle.grid[0][0].solution, Some("H".to_string()));
        assert_eq!(puzzle.grid[0][0].rebus_solution, Some("HEART".to_string()));
        assert_eq!(puzzle.grid[0][1].solution, Some("B".to_string()));
        assert!(puzzle.grid[0][1].rebus_solution.is_none());
    }

    #[test]
    fn test_reject_non_crossword_kind() {
        let json = r##"{
            "version": "http://ipuz.org/v2",
            "kind": ["http://ipuz.org/sudoku#1"],
            "dimensions": { "width": 3, "height": 3 },
            "puzzle": [[0,0,0],[0,0,0],[0,0,0]],
            "clues": { "Across": [], "Down": [] }
        }"##;

        let err = parse(json.as_bytes()).unwrap_err();
        assert!(matches!(err, ParseError::InvalidData(_)));
    }

    #[test]
    fn test_reject_malformed_json() {
        let err = parse(b"not json").unwrap_err();
        assert!(matches!(err, ParseError::Json(_)));
    }
}
