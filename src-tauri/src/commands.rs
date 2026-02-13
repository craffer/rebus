use log::{error, info};
use xword_parser::Puzzle;

#[tauri::command]
pub fn open_puzzle(file_path: String) -> Result<Puzzle, String> {
    info!("Opening puzzle: {file_path}");

    let data = std::fs::read(&file_path).map_err(|e| {
        error!("Failed to read file {file_path}: {e}");
        format!("Failed to read file: {e}")
    })?;

    let extension = file_path.rsplit('.').next().unwrap_or("");

    let puzzle = xword_parser::parse(&data, extension).map_err(|e| {
        error!("Failed to parse puzzle {file_path}: {e}");
        e.to_string()
    })?;

    info!(
        "Loaded puzzle: {}x{} \"{}\"",
        puzzle.width, puzzle.height, puzzle.title
    );

    Ok(puzzle)
}
