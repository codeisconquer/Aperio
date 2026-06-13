import { invoke } from "@tauri-apps/api/core";

export async function saveSecureToken(
  environmentId: string,
  token: string,
): Promise<void> {
  await invoke("save_secure_token", {
    payload: { environment_id: environmentId, token },
  });
}

export async function deleteSecureToken(environmentId: string): Promise<void> {
  await invoke("delete_secure_token_cmd", { environmentId });
}

export async function hasSecureToken(environmentId: string): Promise<boolean> {
  return invoke<boolean>("has_secure_token_cmd", { environmentId });
}

export async function listSecureTokenEnvironments(): Promise<string[]> {
  return invoke<string[]>("list_secure_token_environments_cmd");
}

export async function copySecureToken(
  fromEnvironmentId: string,
  toEnvironmentId: string,
): Promise<void> {
  await invoke("copy_secure_token_cmd", {
    fromEnvironmentId,
    toEnvironmentId,
  });
}
