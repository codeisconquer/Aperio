import type { RequestDraft } from "../types/history";

export const VARIABLE_PLACEHOLDER_RE = /\{\{([^}]+)\}\}/g;

export function parseEnvironmentVariables(
  variablesJson: string,
): Record<string, string> {
  const trimmed = variablesJson.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      record[key] = String(value);
    }
    return record;
  } catch {
    return {};
  }
}

export function substituteVariables(
  text: string,
  variables: Record<string, string>,
): string {
  if (!text || Object.keys(variables).length === 0) return text;

  return text.replace(VARIABLE_PLACEHOLDER_RE, (match, rawName: string) => {
    const name = rawName.trim();
    if (!name) return match;
    return Object.prototype.hasOwnProperty.call(variables, name)
      ? variables[name]
      : match;
  });
}

/** Rewrites a resolved URL back to {{base_url}} when it matches the env base_url value. */
export function urlToTemplateForm(
  url: string,
  environmentVariables: Record<string, string>,
): string {
  const base = environmentVariables.base_url?.trim();
  if (!base || url.includes("{{")) return url;

  const normalizedBase = base.replace(/\/+$/, "");
  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const queryIndex = withoutHash.indexOf("?");
  const pathPart =
    queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : "";

  if (pathPart === normalizedBase || pathPart.startsWith(`${normalizedBase}/`)) {
    const suffix = pathPart.slice(normalizedBase.length) || "";
    return `{{base_url}}${suffix}${query}${hash}`;
  }

  return url;
}

export function applyEnvironmentToDraft(
  draft: RequestDraft,
  variables: Record<string, string>,
): RequestDraft {
  if (Object.keys(variables).length === 0) return draft;

  return {
    method: draft.method,
    url: substituteVariables(draft.url, variables),
    headers: substituteVariables(draft.headers, variables),
    body: substituteVariables(draft.body, variables),
  };
}
