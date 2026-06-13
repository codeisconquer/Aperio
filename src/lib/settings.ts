import { invoke } from "@tauri-apps/api/core";

const ACTIVE_ENV_BY_PROJECT_KEY = "aperio.activeEnvironmentByProject";

let activeEnvironmentByProject: Record<string, string> = {};
let settingsLoaded = false;

function parseActiveEnvironmentMap(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};

  try {
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

function readLegacyActiveEnvironmentMap(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};

  try {
    return parseActiveEnvironmentMap(
      localStorage.getItem(ACTIVE_ENV_BY_PROJECT_KEY),
    );
  } catch {
    return {};
  }
}

async function persistActiveEnvironmentMap(): Promise<void> {
  const serialized = JSON.stringify(activeEnvironmentByProject);
  await invoke("set_app_setting_cmd", {
    key: ACTIVE_ENV_BY_PROJECT_KEY,
    value: serialized,
  });

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ACTIVE_ENV_BY_PROJECT_KEY, serialized);
  }
}

export async function loadAppSettings(): Promise<void> {
  if (import.meta.env.DEV && typeof localStorage !== "undefined") {
    localStorage.removeItem(ACTIVE_ENV_BY_PROJECT_KEY);
  }

  const stored = await invoke<string | null>("get_app_setting_cmd", {
    key: ACTIVE_ENV_BY_PROJECT_KEY,
  });

  const fromDb = parseActiveEnvironmentMap(stored ?? undefined);
  if (Object.keys(fromDb).length > 0) {
    activeEnvironmentByProject = fromDb;
    settingsLoaded = true;
    return;
  }

  const legacy = readLegacyActiveEnvironmentMap();
  activeEnvironmentByProject = legacy;
  settingsLoaded = true;

  if (Object.keys(legacy).length > 0) {
    await persistActiveEnvironmentMap();
  }
}

export function loadActiveEnvironmentId(projectId: string | null): string | null {
  if (!projectId) return null;
  return activeEnvironmentByProject[projectId] ?? null;
}

export function persistActiveEnvironmentId(
  projectId: string | null,
  id: string | null,
): void {
  if (!projectId) return;

  if (id) {
    activeEnvironmentByProject[projectId] = id;
  } else {
    delete activeEnvironmentByProject[projectId];
  }

  if (!settingsLoaded) return;

  void persistActiveEnvironmentMap().catch((err) => {
    console.error("Failed to persist active environment setting:", err);
  });
}

export function removeActiveEnvironmentForProject(projectId: string): void {
  persistActiveEnvironmentId(projectId, null);
}
