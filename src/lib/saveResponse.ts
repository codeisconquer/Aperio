import { invoke } from "@tauri-apps/api/core";

export async function saveResponseToFile(
  content: Uint8Array,
  defaultFilename: string,
): Promise<void> {
  await invoke("save_response_to_file", {
    content: Array.from(content),
    defaultFilename,
  });
}
