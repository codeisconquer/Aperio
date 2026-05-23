import { invoke } from "@tauri-apps/api/core";
import type { HistoryEntry } from "../types/history";

export async function getHistory(): Promise<HistoryEntry[]> {
  return invoke<HistoryEntry[]>("get_history");
}
