import { invoke } from "@tauri-apps/api/core";
import type { SwaggerProject } from "../types/swagger";

export async function importSwaggerFile(): Promise<SwaggerProject> {
  return invoke<SwaggerProject>("import_swagger_file");
}

export async function importSwaggerFromUrl(url: string): Promise<SwaggerProject> {
  return invoke<SwaggerProject>("import_swagger_from_url", { url });
}

export function isValidOpenApiUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
