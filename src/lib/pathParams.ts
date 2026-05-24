/** Extract unique `{param}` names from a URL or path template. */
export function extractPathParamsFromUrl(url: string): string[] {
  const params: string[] = [];
  const pattern = /\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(url)) !== null) {
    const name = match[1].trim();
    if (name && !params.includes(name)) {
      params.push(name);
    }
  }
  return params;
}

export function emptyPathParamValues(names: string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [name, ""]));
}

/** Replace `{key}` placeholders with values from the map before sending. */
export function applyPathParams(
  url: string,
  values: Record<string, string>,
): string {
  return url.replace(/\{([^}]+)\}/g, (placeholder, rawName: string) => {
    const name = rawName.trim();
    const value = values[name];
    if (value !== undefined && value !== "") {
      return encodeURIComponent(value);
    }
    return placeholder;
  });
}
