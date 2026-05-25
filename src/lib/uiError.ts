import type { TFunction } from "i18next";

export const CLIPBOARD_UNAVAILABLE = "CLIPBOARD_UNAVAILABLE";

const CLIPBOARD_DENIED_RE =
  /not allowed by the user agent|denied permission|clipboard|NotAllowedError/i;

export function formatUiError(message: string, t: TFunction): string {
  if (
    message === CLIPBOARD_UNAVAILABLE ||
    CLIPBOARD_DENIED_RE.test(message)
  ) {
    return t("common.clipboardUnavailable");
  }
  return message;
}
