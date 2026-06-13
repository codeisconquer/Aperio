import { invoke } from "@tauri-apps/api/core";
import type {
  Environment,
  SaveEnvironmentPayload,
} from "../types/environment";

export async function getEnvironments(): Promise<Environment[]> {
  return invoke<Environment[]>("get_environments");
}

export async function saveEnvironment(
  payload: SaveEnvironmentPayload,
): Promise<Environment> {
  return invoke<Environment>("save_environment_cmd", { payload });
}

export async function deleteEnvironment(id: string): Promise<void> {
  await invoke("delete_environment_cmd", { id });
}

export function environmentsForProject(
  environments: Environment[],
  projectId: string | null,
): Environment[] {
  if (!projectId) return [];
  return environments.filter((env) => env.project_id === projectId);
}
