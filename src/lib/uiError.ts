import type { TFunction } from "i18next";

export const CLIPBOARD_UNAVAILABLE = "CLIPBOARD_UNAVAILABLE";

export function formatUiError(message: string, t: TFunction): string {
  if (message === CLIPBOARD_UNAVAILABLE) {
    return t("common.clipboardUnavailable");
  }
  return message;
}
