import { invoke } from "@tauri-apps/api/core";
import type {
  Environment,
  SaveEnvironmentPayload,
} from "../types/environment";

const ACTIVE_ENV_BY_PROJECT_KEY = "aperio.activeEnvironmentByProject";

function readActiveEnvironmentMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ACTIVE_ENV_BY_PROJECT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value) {
        record[key] = value;
      }
    }
    return record;
  } catch {
    return {};
  }
}

export async function getEnvironments(): Promise<Environment[]> {
  return invoke<Environment[]>("get_environments");
}

export async function saveEnvironment(
  payload: SaveEnvironmentPayload,
): Promise<Environment> {
  return invoke<Environment>("save_environment_cmd", { payload });
}

export async function deleteEnvironment(id: string): Promise<void> {
  return invoke("delete_environment_cmd", { id });
}

export function loadActiveEnvironmentId(projectId: string | null): string | null {
  if (!projectId) return null;
  return readActiveEnvironmentMap()[projectId] ?? null;
}

export function persistActiveEnvironmentId(
  projectId: string | null,
  id: string | null,
): void {
  if (!projectId) return;

  const map = readActiveEnvironmentMap();
  if (id) {
    map[projectId] = id;
  } else {
    delete map[projectId];
  }
  localStorage.setItem(ACTIVE_ENV_BY_PROJECT_KEY, JSON.stringify(map));
}

export function environmentsForProject(
  environments: Environment[],
  projectId: string | null,
): Environment[] {
  if (!projectId) return [];
  return environments.filter((env) => env.project_id === projectId);
}
