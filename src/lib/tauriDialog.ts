/** Matches Tauri native file-dialog cancel messages from the Rust backend. */
export const TAURI_DIALOG_CANCEL = {
  IMPORT: "Import cancelled",
  EXPORT: "Export cancelled",
} as const;

export function isTauriDialogCancel(message: string): boolean {
  return (
    message === TAURI_DIALOG_CANCEL.IMPORT ||
    message === TAURI_DIALOG_CANCEL.EXPORT
  );
}
