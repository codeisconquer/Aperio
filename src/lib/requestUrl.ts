export type RequestUrlIssue = "empty" | "invalid";

/** Validates request target: absolute http(s) URL, relative API path, or {{var}} prefix. */
export function getRequestUrlIssue(value: string): RequestUrlIssue | null {
  const trimmed = value.trim();
  if (!trimmed) return "empty";

  const templateMatch = trimmed.match(/^\{\{[^}]+\}\}(.*)$/);
  if (templateMatch) {
    const rest = templateMatch[1] ?? "";
    if (!rest || rest.startsWith("/") || rest.startsWith("?") || rest.startsWith("#")) {
      return null;
    }
  }

  if (trimmed.startsWith("/")) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      new URL(trimmed);
      return null;
    } catch {
      return "invalid";
    }
  }

  if (/^[a-zA-Z0-9.-]+(:\d+)?(\/|$)/.test(trimmed)) {
    try {
      new URL(`http://${trimmed}`);
      return null;
    } catch {
      return "invalid";
    }
  }

  return "invalid";
}

export function isValidRequestUrl(value: string): boolean {
  return getRequestUrlIssue(value) === null;
}
