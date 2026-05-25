import type { SaveEnvironmentPayload } from "../types/environment";

export const BASE_URL_VARIABLE = "base_url";

export function defaultEnvironmentPayload(
  projectId: string,
  baseUrl: string | null | undefined,
  name: string,
): SaveEnvironmentPayload | null {
  const trimmed = baseUrl?.trim();
  if (!trimmed) return null;

  return {
    name,
    project_id: projectId,
    variables: JSON.stringify({ [BASE_URL_VARIABLE]: trimmed }, null, 2),
  };
}
