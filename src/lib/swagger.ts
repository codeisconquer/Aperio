import { invoke } from "@tauri-apps/api/core";
import type { SwaggerProject } from "../types/swagger";

export async function importSwaggerFile(): Promise<SwaggerProject> {
  return invoke<SwaggerProject>("import_swagger_file");
}
