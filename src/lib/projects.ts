import { invoke } from "@tauri-apps/api/core";
import type { SwaggerProject } from "../types/swagger";

export async function getProjects(): Promise<SwaggerProject[]> {
  return invoke<SwaggerProject[]>("get_projects_cmd");
}

export async function saveProject(project: SwaggerProject): Promise<void> {
  await invoke("save_project_cmd", { project });
}

export async function deleteProject(id: string): Promise<void> {
  await invoke("delete_project_cmd", { id });
}
