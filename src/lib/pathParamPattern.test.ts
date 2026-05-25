import { describe, expect, it } from "vitest";
import { extractPathParamNames } from "./pathParamPattern";

describe("extractPathParamNames", () => {
  it("finds OpenAPI path placeholders", () => {
    expect(extractPathParamNames("/users/{username}/posts/{postId}")).toEqual([
      "username",
      "postId",
    ]);
  });

  it("ignores env placeholders with double braces", () => {
    expect(extractPathParamNames("{{base_url}}/connections")).toEqual([]);
  });

  it("ignores JSON object braces in request bodies", () => {
    const json = `{
  "conn_type": "mysql",
  "login": "",
  "password": "",
  "port": 0,
  "schema": ""
}`;
    expect(extractPathParamNames(json)).toEqual([]);
  });
});
