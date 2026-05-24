import { describe, expect, it } from "vitest";
import { generateNodeFetch, generatePythonRequests } from "./codeGen";
import type { RequestDraft } from "../types/history";

const complexPostDraft: RequestDraft = {
  method: "POST",
  url: "http://example.com/api/v1/users/jviebrock?notify=true",
  headers: JSON.stringify(
    {
      Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      Cookie: "session=abc123; theme=dark",
      "Content-Type": "application/json",
    },
    null,
    2,
  ),
  body: JSON.stringify({ firstname: "Jörg", lastname: "Viebrock" }, null, 2),
};

describe("generatePythonRequests", () => {
  it("generates a requests snippet with headers and json payload", () => {
    const code = generatePythonRequests(complexPostDraft);

    expect(code).toContain("import requests");
    expect(code).toContain(
      'url = "http://example.com/api/v1/users/jviebrock?notify=true"',
    );
    expect(code).toContain('"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"');
    expect(code).toContain('"Cookie": "session=abc123; theme=dark"');
    expect(code).toContain('"firstname": "Jörg"');
    expect(code).toContain('"lastname": "Viebrock"');
    expect(code).toContain("requests.post(url, json=payload, headers=headers)");
    expect(code).toContain("print(response.json())");
  });
});

describe("generateNodeFetch", () => {
  it("generates a fetch snippet with headers and stringified body", () => {
    const code = generateNodeFetch(complexPostDraft);

    expect(code).toContain(
      "const url = 'http://example.com/api/v1/users/jviebrock?notify=true';",
    );
    expect(code).toContain("method: 'POST'");
    expect(code).toContain("'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'");
    expect(code).toContain("'Cookie': 'session=abc123; theme=dark'");
    expect(code).toContain("body: JSON.stringify(");
    expect(code).toContain('"firstname":"Jörg"');
    expect(code).toContain("await fetch(url, options)");
    expect(code).toContain("console.log(data);");
  });
});
