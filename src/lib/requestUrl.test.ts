import { describe, expect, it } from "vitest";
import { getRequestUrlIssue, isValidRequestUrl } from "./requestUrl";

describe("isValidRequestUrl", () => {
  it("accepts relative API paths", () => {
    expect(isValidRequestUrl("/v1/forecast")).toBe(true);
    expect(isValidRequestUrl("/users/{username}")).toBe(true);
  });

  it("accepts absolute http(s) URLs", () => {
    expect(isValidRequestUrl("https://api.example.com/v1/forecast")).toBe(true);
    expect(isValidRequestUrl("http://localhost:8080/ping")).toBe(true);
  });

  it("accepts host-style URLs without scheme", () => {
    expect(isValidRequestUrl("api.example.com/v1/forecast")).toBe(true);
  });

  it("accepts template URLs with {{base_url}}", () => {
    expect(isValidRequestUrl("{{base_url}}/connections")).toBe(true);
    expect(isValidRequestUrl("{{base_url}}/users?limit=10")).toBe(true);
  });

  it("rejects empty and plain text", () => {
    expect(getRequestUrlIssue("")).toBe("empty");
    expect(getRequestUrlIssue("   ")).toBe("empty");
    expect(getRequestUrlIssue("not a url")).toBe("invalid");
    expect(getRequestUrlIssue("ht!tp://bad")).toBe("invalid");
  });
});
