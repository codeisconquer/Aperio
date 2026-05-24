import { describe, expect, it } from "vitest";
import {
  applyPathParams,
  emptyPathParamValues,
  extractPathParamsFromUrl,
} from "./pathParams";

describe("extractPathParamsFromUrl", () => {
  it("finds path variables in URL templates", () => {
    expect(
      extractPathParamsFromUrl("https://api.example.com/users/{username}"),
    ).toEqual(["username"]);
  });

  it("deduplicates repeated variables", () => {
    expect(extractPathParamsFromUrl("/items/{id}/related/{id}")).toEqual(["id"]);
  });
});

describe("applyPathParams", () => {
  it("replaces placeholders with entered values", () => {
    const url = "http://example.com/api/v1/users/{username}";
    expect(applyPathParams(url, { username: "jviebrock" })).toBe(
      "http://example.com/api/v1/users/jviebrock",
    );
  });

  it("keeps unresolved placeholders", () => {
    expect(
      applyPathParams("https://api.example.com/{id}", { id: "" }),
    ).toBe("https://api.example.com/{id}");
  });

  it("encodes special characters in values", () => {
    expect(
      applyPathParams("https://api.example.com/users/{username}", {
        username: "a/b c",
      }),
    ).toBe("https://api.example.com/users/a%2Fb%20c");
  });
});

describe("emptyPathParamValues", () => {
  it("creates empty strings for each param name", () => {
    expect(emptyPathParamValues(["username", "delivery_id"])).toEqual({
      username: "",
      delivery_id: "",
    });
  });
});
