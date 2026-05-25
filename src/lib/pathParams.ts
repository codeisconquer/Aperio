import { extractPathParamNames, PATH_PARAM_RE } from "./pathParamPattern";

/** Extract unique `{param}` names from a URL or path template. */
export function extractPathParamsFromUrl(url: string): string[] {
  return extractPathParamNames(url);
}

export function emptyPathParamValues(names: string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [name, ""]));
}

/** Prefill path-param fields from environment variables with matching keys. */
export function initialPathParamValues(
  names: string[],
  envVars: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    names.map((name) => [name, envVars[name]?.trim() ?? ""]),
  );
}

export function mergeEnvIntoEmptyPathParams(
  values: Record<string, string>,
  names: string[],
  envVars: Record<string, string>,
): Record<string, string> {
  let changed = false;
  const next = { ...values };
  for (const name of names) {
    if (!next[name]?.trim() && envVars[name]?.trim()) {
      next[name] = envVars[name].trim();
      changed = true;
    }
  }
  return changed ? next : values;
}

/** Replace `{key}` placeholders with values from the map before sending. */
export function applyPathParams(
  url: string,
  values: Record<string, string>,
): string {
  return url.replace(PATH_PARAM_RE, (placeholder, name: string) => {
    const value = values[name];
    if (value !== undefined && value !== "") {
      return encodeURIComponent(value);
    }
    return placeholder;
  });
}
