import { describe, expect, it } from "vitest";
import { applyEnvironmentToDraft } from "./substituteVariables";

describe("substituteVariables", () => {
  it("replaces placeholders in url, headers, and body", () => {
    const resolved = applyEnvironmentToDraft(
      {
        method: "GET",
        url: "{{base_url}}/users?page={{page}}",
        headers: '{"Authorization":"Bearer {{token}}"}',
        body: '{"env":"{{env_name}}"}',
      },
      {
        base_url: "https://api.example.com",
        page: "1",
        token: "secret",
        env_name: "staging",
      },
    );

    expect(resolved.url).toBe("https://api.example.com/users?page=1");
    expect(resolved.headers).toBe('{"Authorization":"Bearer secret"}');
    expect(resolved.body).toBe('{"env":"staging"}');
  });

  it("leaves unknown placeholders unchanged", () => {
    const resolved = applyEnvironmentToDraft(
      {
        method: "GET",
        url: "{{unknown}}/path",
        headers: "",
        body: "",
      },
      { base_url: "https://api.example.com" },
    );

    expect(resolved.url).toBe("{{unknown}}/path");
  });
});
