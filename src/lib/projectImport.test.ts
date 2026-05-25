import { describe, expect, it } from "vitest";
import { defaultEnvironmentPayload } from "./projectImport";

describe("defaultEnvironmentPayload", () => {
  it("creates base_url variable from OpenAPI server", () => {
    const payload = defaultEnvironmentPayload("p1", "/api/v1", "Default");
    expect(payload).not.toBeNull();
    expect(payload?.name).toBe("Default");
    expect(payload?.project_id).toBe("p1");
    expect(JSON.parse(payload?.variables ?? "{}")).toEqual({
      base_url: "/api/v1",
    });
  });

  it("returns null when no base URL is available", () => {
    expect(defaultEnvironmentPayload("p1", null, "Default")).toBeNull();
    expect(defaultEnvironmentPayload("p1", "  ", "Default")).toBeNull();
  });
});
