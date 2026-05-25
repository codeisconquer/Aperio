import { invoke } from "@tauri-apps/api/core";
import type { HistoryEntry } from "../types/history";

export async function getHistory(): Promise<HistoryEntry[]> {
  return invoke<HistoryEntry[]>("get_history");
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  await invoke("delete_history_entry_cmd", { id });
}

export async function clearHistory(): Promise<void> {
  await invoke("clear_history_cmd");
}
