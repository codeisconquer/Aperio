import { describe, expect, it } from "vitest";
import {
  buildImageDataUrl,
  defaultResponseFilename,
  extensionForContentType,
  getContentType,
  isImageContentType,
  isJsonContentType,
  isJsonResponse,
  responseBodyToBytes,
} from "./responseContent";

describe("getContentType", () => {
  it("reads content-type case-insensitively", () => {
    expect(getContentType({ "Content-Type": "application/json; charset=utf-8" })).toBe(
      "application/json",
    );
  });
});

describe("content type helpers", () => {
  it("detects image types", () => {
    expect(isImageContentType("image/png")).toBe(true);
    expect(isImageContentType("text/plain")).toBe(false);
  });

  it("detects json types", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("application/problem+json")).toBe(true);
  });

  it("detects json bodies without header", () => {
    expect(isJsonResponse('{"ok":true}', null)).toBe(true);
    expect(isJsonResponse("plain text", null)).toBe(false);
  });
});

describe("buildImageDataUrl", () => {
  it("builds a data url from base64 body", () => {
    expect(buildImageDataUrl("image/png", "abcd")).toBe("data:image/png;base64,abcd");
  });
});

describe("defaultResponseFilename", () => {
  it("uses extension from content type", () => {
    expect(defaultResponseFilename("image/jpeg")).toBe("response.jpg");
    expect(defaultResponseFilename("application/json")).toBe("response.json");
    expect(extensionForContentType(null)).toBe("txt");
  });
});

describe("responseBodyToBytes", () => {
  it("decodes base64 image bodies", () => {
    const bytes = responseBodyToBytes("aGVsbG8=", "image/png");
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111]);
  });

  it("encodes text bodies as utf-8", () => {
    const bytes = responseBodyToBytes("hello", "text/plain");
    expect(new TextDecoder().decode(bytes)).toBe("hello");
  });
});
