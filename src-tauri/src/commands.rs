use log::{error, info};
use tauri::Manager;
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

/// Set the native window theme. Pass "dark", "light", or null/empty to follow system.
#[tauri::command]
pub fn set_native_theme(app: tauri::AppHandle, theme: Option<String>) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;

    let tauri_theme = match theme.as_deref() {
        Some("dark") => Some(tauri::Theme::Dark),
        Some("light") => Some(tauri::Theme::Light),
        _ => None,
    };

    window.set_theme(tauri_theme).map_err(|e| e.to_string())
}
