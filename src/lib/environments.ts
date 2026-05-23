import { invoke } from "@tauri-apps/api/core";
import type {
  Environment,
  SaveEnvironmentPayload,
} from "../types/environment";

const ACTIVE_ENV_STORAGE_KEY = "aperio.activeEnvironmentId";

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

export function loadActiveEnvironmentId(): string | null {
  return localStorage.getItem(ACTIVE_ENV_STORAGE_KEY);
}

export function persistActiveEnvironmentId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_ENV_STORAGE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_ENV_STORAGE_KEY);
  }
}
