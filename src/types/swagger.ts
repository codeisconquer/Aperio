export interface SwaggerEndpoint {
  method: string;
  path: string;
  summary?: string | null;
  description?: string | null;
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

export function buildEndpointUrl(
  baseUrl: string | null | undefined,
  path: string,
): string {
  if (!baseUrl?.trim()) return path;
  const base = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
