import type { RequestDraft } from "./history";

export interface SwaggerEndpoint {
  method: string;
  path: string;
  summary?: string | null;
  description?: string | null;
  default_body?: string | null;
  default_headers?: string | null;
  path_params: string[];
  query_params: string[];
}

export interface SwaggerProject {
  id: string;
  title: string;
  version: string;
  base_url?: string | null;
  endpoints: SwaggerEndpoint[];
}

export function endpointKey(
  projectId: string,
  method: string,
  path: string,
): string {
  return `${projectId}:${method}:${path}`;
}

export function joinBaseUrlAndPath(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  const normalizedPath = path.trim().startsWith("/")
    ? path.trim()
    : `/${path.trim()}`;

  if (!base) return normalizedPath;
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;

  if (normalizedPath === base || normalizedPath.startsWith(`${base}/`)) {
    return normalizedPath;
  }

  if (base.startsWith("/")) {
    return `${base}${normalizedPath}`;
  }

  return `${base}${normalizedPath}`;
}

export function buildEndpointUrl(
  baseUrl: string | null | undefined,
  path: string,
): string {
  if (!baseUrl?.trim()) return path;
  return joinBaseUrlAndPath(baseUrl, path);
}

/** Uses {{base_url}} when a server URL was imported; path-only endpoints stay as-is. */
export function buildEndpointRequestUrl(
  baseUrl: string | null | undefined,
  path: string,
  queryParams: string[],
): string {
  const trimmedPath = path.trim();
  if (/^https?:\/\//i.test(trimmedPath)) {
    return appendQueryParamNames(trimmedPath, queryParams);
  }

  const pathPart = trimmedPath.startsWith("/")
    ? trimmedPath
    : `/${trimmedPath}`;

  const trimmedBase = baseUrl?.trim();
  if (!trimmedBase) {
    return appendQueryParamNames(pathPart, queryParams);
  }

  return appendQueryParamNames(`{{base_url}}${pathPart}`, queryParams);
}

/** Appends OpenAPI/Postman query parameter names as empty-valued query pairs. */
export function appendQueryParamNames(url: string, queryParams: string[]): string {
  if (!url.trim() || queryParams.length === 0) return url;

  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;

  const params = new URLSearchParams(
    withoutHash.includes("?") ? withoutHash.split("?")[1] ?? "" : "",
  );
  for (const name of queryParams) {
    if (!name.trim()) continue;
    if (!params.has(name)) params.append(name, "");
  }

  const base = withoutHash.split("?")[0] ?? withoutHash;
  const query = params.toString();
  return query ? `${base}?${query}${hash}` : `${base}${hash}`;
}

export function buildEndpointUrlWithQuery(
  baseUrl: string | null | undefined,
  path: string,
  queryParams: string[],
): string {
  const trimmedPath = path.trim();
  if (/^https?:\/\//i.test(trimmedPath)) {
    return appendQueryParamNames(trimmedPath, queryParams);
  }
  return appendQueryParamNames(
    buildEndpointUrl(baseUrl, path),
    queryParams,
  );
}

/** Postman stores headers as `Key: value` lines; the builder expects JSON. */
export function headersTextToJson(headers: string): string {
  const trimmed = headers.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("{")) return trimmed;

  const record: Record<string, string> = {};
  for (const line of trimmed.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key) record[key] = value;
  }

  return Object.keys(record).length > 0
    ? JSON.stringify(record, null, 2)
    : "";
}

export function endpointToRequestDraft(
  project: SwaggerProject,
  endpoint: SwaggerEndpoint,
): RequestDraft {
  return {
    method: endpoint.method,
    url: buildEndpointRequestUrl(
      project.base_url,
      endpoint.path,
      endpoint.query_params,
    ),
    headers: headersTextToJson(endpoint.default_headers ?? ""),
    body: endpoint.default_body ?? "",
  };
}
