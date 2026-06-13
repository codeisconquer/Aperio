import { describe, expect, it } from "vitest";
import {
  defaultEnvironmentPayload,
  importEnvironmentPayload,
  initialImportEnvironmentConfig,
} from "./projectImport";
import type { SwaggerProject } from "../types/swagger";

const sampleProject: SwaggerProject = {
  id: "p1",
  title: "Test API",
  version: "1.0.0",
  base_url: "http://localhost:5510",
  endpoints: [],
};

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

describe("initialImportEnvironmentConfig", () => {
  it("seeds base_url from imported project", () => {
    expect(initialImportEnvironmentConfig(sampleProject, "Standard")).toEqual({
      name: "Standard",
      variables: { base_url: "http://localhost:5510" },
    });
  });

  it("returns empty variables when project has no server", () => {
    expect(
      initialImportEnvironmentConfig(
        { ...sampleProject, base_url: null },
        "Standard",
      ),
    ).toEqual({
      name: "Standard",
      variables: {},
    });
  });
});

describe("importEnvironmentPayload", () => {
  it("builds save payload from wizard config", () => {
    const payload = importEnvironmentPayload("p1", {
      name: "Local",
      variables: { base_url: "http://localhost:8080" },
    });
    expect(payload).toEqual({
      name: "Local",
      project_id: "p1",
      variables: JSON.stringify(
        { base_url: "http://localhost:8080" },
        null,
        2,
      ),
    });
  });

  it("returns null when config has no variables", () => {
    expect(
      importEnvironmentPayload("p1", { name: "Local", variables: {} }),
    ).toBeNull();
  });
});
