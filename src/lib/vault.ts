import { invoke } from "@tauri-apps/api/core";

export async function saveSecureToken(
  projectId: string,
  token: string,
): Promise<void> {
  await invoke("save_secure_token", {
    payload: { project_id: projectId, token },
  });
}

export async function deleteSecureToken(projectId: string): Promise<void> {
  await invoke("delete_secure_token_cmd", { projectId });
}

export async function hasSecureToken(projectId: string): Promise<boolean> {
  return invoke<boolean>("has_secure_token_cmd", { projectId });
}

export async function listSecureTokenProjects(): Promise<string[]> {
  return invoke<string[]>("list_secure_token_projects_cmd");
}
