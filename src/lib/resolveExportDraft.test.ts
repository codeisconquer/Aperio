import { describe, expect, it } from "vitest";
import { resolveExportDraft, resolveRequestUrl } from "./resolveExportDraft";
import type { RequestDraft } from "../types/history";

const draft: RequestDraft = {
  method: "DELETE",
  url: "{{base_url}}/connections/{connection_id}",
  headers: '{"X-Env":"{{token}}"}',
  body: "",
};

describe("resolveExportDraft", () => {
  it("substitutes environment variables and path params", () => {
    const resolved = resolveExportDraft(
      draft,
      { connection_id: "1" },
      { base_url: "https://www.test.de", token: "secret" },
    );

    expect(resolved.url).toBe("https://www.test.de/connections/1");
    expect(JSON.parse(resolved.headers)).toEqual({ "X-Env": "secret" });
  });
});

describe("resolveRequestUrl", () => {
  it("resolves url placeholders only", () => {
    expect(
      resolveRequestUrl(
        "{{base_url}}/connections/{id}",
        { id: "test" },
        { base_url: "https://www.test.de" },
      ),
    ).toBe("https://www.test.de/connections/test");
  });
});
