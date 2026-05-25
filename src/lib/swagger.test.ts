import { describe, expect, it } from "vitest";
import {
  appendQueryParamNames,
  buildEndpointRequestUrl,
  buildEndpointUrlWithQuery,
  endpointToRequestDraft,
  headersTextToJson,
} from "../types/swagger";
import type { SwaggerEndpoint, SwaggerProject } from "../types/swagger";
import { isValidOpenApiUrl } from "./swagger";

describe("isValidOpenApiUrl", () => {
  it("accepts http and https URLs", () => {
    expect(
      isValidOpenApiUrl("https://petstore.swagger.io/v2/swagger.json"),
    ).toBe(true);
    expect(isValidOpenApiUrl("http://localhost:8080/openapi.yaml")).toBe(true);
  });

  it("rejects empty and non-http schemes", () => {
    expect(isValidOpenApiUrl("")).toBe(false);
    expect(isValidOpenApiUrl("ftp://example.com/spec.json")).toBe(false);
    expect(isValidOpenApiUrl("not-a-url")).toBe(false);
  });
});

describe("endpointToRequestDraft", () => {
  const project: SwaggerProject = {
    id: "p1",
    title: "Demo API",
    version: "2.1.0",
    base_url: "https://api.example.com",
    endpoints: [],
  };

  const postmanGet: SwaggerEndpoint = {
    method: "GET",
    path: "/users",
    summary: "Users / List users",
    default_headers: "Accept: application/json",
    default_body: null,
    path_params: [],
    query_params: ["limit", "offset"],
  };

  const postmanPost: SwaggerEndpoint = {
    method: "POST",
    path: "/users",
    summary: "Users / Create user",
    default_headers: "Content-Type: application/json",
    default_body: '{\n  "name": "Ada"\n}',
    path_params: [],
    query_params: [],
  };

  it("maps Postman headers to JSON and appends query params", () => {
    const draft = endpointToRequestDraft(project, postmanGet);

    expect(draft.method).toBe("GET");
    expect(draft.url).toBe(
      "{{base_url}}/users?limit=&offset=",
    );
    expect(JSON.parse(draft.headers)).toEqual({
      Accept: "application/json",
    });
    expect(draft.body).toBe("");
  });

  it("maps Postman raw body", () => {
    const draft = endpointToRequestDraft(project, postmanPost);

    expect(draft.method).toBe("POST");
    expect(draft.url).toBe("{{base_url}}/users");
    expect(JSON.parse(draft.headers)).toEqual({
      "Content-Type": "application/json",
    });
    expect(draft.body).toContain("Ada");
  });

  it("uses {{base_url}} for relative server imports", () => {
    const relativeProject: SwaggerProject = {
      ...project,
      base_url: "/api/v1",
    };
    const draft = endpointToRequestDraft(relativeProject, postmanGet);
    expect(draft.url).toBe("{{base_url}}/users?limit=&offset=");
  });
});

describe("headersTextToJson", () => {
  it("passes through JSON", () => {
    expect(headersTextToJson('{"X":"y"}')).toBe('{"X":"y"}');
  });

  it("converts header lines", () => {
    const json = headersTextToJson("Accept: application/json\nX-Api-Key: secret");
    expect(JSON.parse(json)).toEqual({
      Accept: "application/json",
      "X-Api-Key": "secret",
    });
  });
});

describe("buildEndpointRequestUrl", () => {
  it("uses {{base_url}} placeholder for relative OpenAPI server prefix", () => {
    expect(
      buildEndpointRequestUrl("/api/v1", "/connections", []),
    ).toBe("{{base_url}}/connections");
  });

  it("uses {{base_url}} for absolute OpenAPI servers too", () => {
    expect(
      buildEndpointRequestUrl("http://localhost:5510", "/api/submit", []),
    ).toBe("{{base_url}}/api/submit");
  });

  it("uses path only when no base URL is defined", () => {
    expect(buildEndpointRequestUrl(null, "/connections", [])).toBe(
      "/connections",
    );
  });
});

describe("appendQueryParamNames", () => {
  it("preserves existing query string values", () => {
    expect(
      appendQueryParamNames("https://api.example.com/users?limit=10", [
        "limit",
        "offset",
      ]),
    ).toBe("https://api.example.com/users?limit=10&offset=");
  });
});

describe("buildEndpointUrlWithQuery", () => {
  it("joins relative OpenAPI server prefix with path", () => {
    expect(
      buildEndpointUrlWithQuery("/api/v1", "/connections", []),
    ).toBe("/api/v1/connections");
  });

  it("uses absolute path from Postman raw URL", () => {
    expect(
      buildEndpointUrlWithQuery(null, "https://api.example.com/ping", ["q"]),
    ).toBe("https://api.example.com/ping?q=");
  });
});
