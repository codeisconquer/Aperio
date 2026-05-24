use std::fs;

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub fn save_response_to_file(
    app: AppHandle,
    content: Vec<u8>,
    default_filename: String,
) -> Result<(), String> {
    let picked = app
        .dialog()
        .file()
        .set_title("Save response")
        .set_file_name(&default_filename)
        .blocking_save_file();

    let destination = picked.ok_or_else(|| "Save cancelled".to_string())?;
    let destination = destination
        .into_path()
        .map_err(|e| format!("Invalid save path: {e}"))?;

    fs::write(&destination, content).map_err(|e| format!("Failed to write file: {e}"))?;
    Ok(())
}
