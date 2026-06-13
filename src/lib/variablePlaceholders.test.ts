import { describe, expect, it } from "vitest";
import {
  findPlaceholderAtOffset,
  findVariablePlaceholders,
} from "./variablePlaceholders";

describe("findVariablePlaceholders", () => {
  it("finds env and path placeholders with positions", () => {
    expect(
      findVariablePlaceholders("{{base_url}}/users/{username}"),
    ).toEqual([
      { kind: "env", name: "base_url", start: 0, end: 12 },
      { kind: "path", name: "username", start: 19, end: 29 },
    ]);
  });

  it("ignores double-brace env placeholders as path params", () => {
    expect(findVariablePlaceholders("{{base_url}}/connections")).toEqual([
      { kind: "env", name: "base_url", start: 0, end: 12 },
    ]);
  });
});

describe("findPlaceholderAtOffset", () => {
  it("returns placeholder when offset is inside token", () => {
    expect(
      findPlaceholderAtOffset("{{base_url}}/path", 5)?.name,
    ).toBe("base_url");
  });

  it("returns null outside placeholders", () => {
    expect(findPlaceholderAtOffset("{{base_url}}/path", 14)).toBeNull();
  });
});
