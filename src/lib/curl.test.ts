import { describe, expect, it } from "vitest";
import { parsedCurlToDraft } from "./curl";

describe("parsedCurlToDraft", () => {
  it("maps headers to formatted JSON", () => {
    const draft = parsedCurlToDraft({
      method: "POST",
      url: "https://api.example.com/items",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: '{"ok":true}',
    });

    expect(draft.method).toBe("POST");
    expect(draft.url).toBe("https://api.example.com/items");
    expect(JSON.parse(draft.headers)).toEqual({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    expect(draft.body).toBe('{"ok":true}');
  });

  it("uses empty strings when headers and body are absent", () => {
    const draft = parsedCurlToDraft({
      method: "GET",
      url: "https://api.example.com/health",
      headers: {},
    });

    expect(draft.headers).toBe("");
    expect(draft.body).toBe("");
  });
});
