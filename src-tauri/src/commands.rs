use crossword_parser::Puzzle;

#[tauri::command]
pub fn open_puzzle(file_path: String) -> Result<Puzzle, String> {
    let data = std::fs::read(&file_path).map_err(|e| format!("Failed to read file: {e}"))?;

    let extension = file_path.rsplit('.').next().unwrap_or("");

    crossword_parser::parse(&data, extension).map_err(|e| e.to_string())
}
