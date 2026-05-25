import { describe, expect, it } from "vitest";
import {
  cloneEnvironmentName,
  cloneSwaggerProject,
  environmentCopyPayload,
} from "./projectClone";
import type { Environment } from "../types/environment";

describe("cloneSwaggerProject", () => {
  it("creates a new id and title suffix", () => {
    const cloned = cloneSwaggerProject(
      {
        id: "old-id",
        title: "Example.com",
        version: "1.0.0",
        base_url: "https://example.com",
        endpoints: [{ method: "GET", path: "/users", path_params: [], query_params: [] }],
      },
      "(copy)",
    );

    expect(cloned.id).not.toBe("old-id");
    expect(cloned.title).toBe("Example.com (copy)");
    expect(cloned.endpoints).toHaveLength(1);
  });
});

describe("environmentCopyPayload", () => {
  it("copies variables to another project", () => {
    const source: Environment = {
      id: "env-1",
      name: "Local",
      variables: '{"username":"ada"}',
      project_id: "project-a",
    };

    expect(
      environmentCopyPayload(source, "project-b", "(copy)"),
    ).toEqual({
      name: "Local (copy)",
      variables: '{"username":"ada"}',
      project_id: "project-b",
    });
  });
});

describe("cloneEnvironmentName", () => {
  it("appends suffix", () => {
    expect(cloneEnvironmentName("Staging", "(Kopie)")).toBe("Staging (Kopie)");
  });
});
