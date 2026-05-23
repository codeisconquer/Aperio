import { invoke } from "@tauri-apps/api/core";

export async function exportWorkspace(): Promise<void> {
  await invoke("export_workspace");
}

export async function importWorkspace(): Promise<void> {
  await invoke("import_workspace");
}
