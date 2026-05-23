import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { ExportCommands } from "../types/export";
import type { RequestDraft } from "../types/history";

export async function exportRequestCommands(
  draft: RequestDraft,
): Promise<ExportCommands> {
  return invoke<ExportCommands>("export_request_commands_cmd", {
    payload: {
      method: draft.method,
      url: draft.url,
      headers: draft.headers,
      body: draft.body,
    },
  });
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await writeText(text);
  } catch {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard is not available");
    }
    await navigator.clipboard.writeText(text);
  }
}
