use std::fs;
use std::io::ErrorKind;

const APP_DIR: &str = "com.codex.kemper-live-companion";
const LIBRARY_FILE: &str = "performance-library.json";

fn library_path() -> Result<std::path::PathBuf, String> {
    let base = dirs::data_dir().ok_or_else(|| "Could not resolve data directory".to_string())?;
    Ok(base.join(APP_DIR).join(LIBRARY_FILE))
}

#[tauri::command]
fn save_performance_library(contents: String) -> Result<(), String> {
    let path = library_path()?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    fs::write(path, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn load_performance_library() -> Result<String, String> {
    let path = library_path()?;

    match fs::read_to_string(path) {
        Ok(contents) => Ok(contents),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok("{}".to_string()),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn get_performance_library_path() -> Result<String, String> {
    library_path().map(|path| path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_performance_library,
            load_performance_library,
            get_performance_library_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
