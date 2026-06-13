import type { SaveEnvironmentPayload } from "../types/environment";
import type { SwaggerProject } from "../types/swagger";
import {
  createRow,
  ensureTrailingEmptyRow,
  rowsToRecord,
  type KeyValueRow,
} from "./keyValueRows";

export const BASE_URL_VARIABLE = "base_url";

export interface ImportEnvironmentConfig {
  name: string;
  variables: Record<string, string>;
  token?: string;
}

export interface WorkspaceImportResult {
  project: SwaggerProject;
  /** undefined = auto-create from spec; null = skip; object = wizard config */
  environment?: ImportEnvironmentConfig | null;
}

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

export function initialImportEnvironmentConfig(
  project: SwaggerProject,
  defaultName: string,
): ImportEnvironmentConfig {
  const baseUrl = project.base_url?.trim();
  return {
    name: defaultName,
    variables: baseUrl ? { [BASE_URL_VARIABLE]: baseUrl } : {},
  };
}

export function importEnvironmentRows(
  config: ImportEnvironmentConfig,
): KeyValueRow[] {
  const rows = Object.entries(config.variables).map(([key, value]) =>
    createRow(key, value),
  );
  return ensureTrailingEmptyRow(rows);
}

export function importEnvironmentPayload(
  projectId: string,
  config: ImportEnvironmentConfig,
): SaveEnvironmentPayload | null {
  const name = config.name.trim();
  const variables = rowsToRecord(
    Object.entries(config.variables).map(([key, value]) =>
      createRow(key, value),
    ),
  );
  const hasToken = Boolean(config.token?.trim());
  if (!name || (Object.keys(variables).length === 0 && !hasToken)) return null;

  return {
    name,
    project_id: projectId,
    variables: JSON.stringify(variables, null, 2),
  };
}
