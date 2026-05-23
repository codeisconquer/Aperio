import { describe, expect, it } from "vitest";
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
