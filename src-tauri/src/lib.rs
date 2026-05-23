mod crypto;
mod database;
mod environments;
mod http;
mod swagger;
mod vault;
mod workspace;

use tauri::{Emitter, Manager};
use tauri_plugin_cli::CliExt;

fn handle_cli_import(app: &tauri::App) {
    let Ok(matches) = app.cli().matches() else {
        return;
    };

    let Some(file_arg) = matches.args.get("file") else {
        return;
    };

    let Some(path) = file_arg.value.as_str() else {
        return;
    };

    if path.is_empty() {
        return;
    }

    match swagger::parse_swagger_path(std::path::Path::new(path)) {
        Ok(project) => {
            let handle = app.handle().clone();
            let _ = handle.emit("cli-import", project);
        }
        Err(err) => eprintln!("CLI OpenAPI import failed: {err}"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            crypto::ensure_master_key()?;
            let pool = database::init_db(app.handle())?;
            app.manage(pool);
            handle_cli_import(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            http::send_request,
            http::parse_curl_command,
            http::export_request_commands_cmd,
            database::get_history,
            environments::get_environments,
            environments::save_environment_cmd,
            environments::delete_environment_cmd,
            swagger::import_swagger_file,
            vault::save_secure_token,
            vault::delete_secure_token_cmd,
            vault::has_secure_token_cmd,
            vault::list_secure_token_projects_cmd,
            workspace::export_workspace,
            workspace::import_workspace
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
