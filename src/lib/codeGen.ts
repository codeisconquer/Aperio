import type { RequestDraft } from "../types/history";

export interface CodeGenRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

function parseHeaderRecord(headersJson: string): Record<string, string> {
  const trimmed = headersJson.trim();
  if (!trimmed) return {};

  const parsed = JSON.parse(trimmed) as Record<string, unknown>;
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!key.trim()) continue;
    record[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return record;
}

function sortedHeaderEntries(headers: Record<string, string>): [string, string][] {
  return Object.entries(headers).sort(([a], [b]) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
}

export function requestDraftToCodeGen(draft: RequestDraft): CodeGenRequest {
  const url = draft.url.trim();
  if (!url) {
    throw new Error("URL is required");
  }

  return {
    method: draft.method.trim().toUpperCase() || "GET",
    url,
    headers: parseHeaderRecord(draft.headers),
    body: draft.body,
  };
}

function tryParseJsonBody(body: string): unknown | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function formatPythonLiteral(value: unknown, indent = 0): string {
  const pad = "    ".repeat(indent);
  const padInner = "    ".repeat(indent + 1);

  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value
      .map((item) => `${padInner}${formatPythonLiteral(item, indent + 1)}`)
      .join(",\n");
    return `[\n${items}\n${pad}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const lines = entries.map(
      ([key, item]) =>
        `${padInner}${JSON.stringify(key)}: ${formatPythonLiteral(item, indent + 1)}`,
    );
    return `{\n${lines.join(",\n")}\n${pad}}`;
  }

  return JSON.stringify(String(value));
}

function formatPythonHeaders(headers: Record<string, string>): string {
  const entries = sortedHeaderEntries(headers);
  if (entries.length === 0) return "headers = {}";

  const lines = entries.map(
    ([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`,
  );
  return `headers = {\n${lines.join(",\n")}\n}`;
}

function pythonRequestsMethod(method: string): string {
  switch (method) {
    case "GET":
      return "get";
    case "POST":
      return "post";
    case "PUT":
      return "put";
    case "PATCH":
      return "patch";
    case "DELETE":
      return "delete";
    case "HEAD":
      return "head";
    case "OPTIONS":
      return "options";
    default:
      return "request";
  }
}

export function generatePythonRequests(draft: RequestDraft): string {
  const request = requestDraftToCodeGen(draft);
  const lines = [
    "import requests",
    "",
    `url = ${JSON.stringify(request.url)}`,
    formatPythonHeaders(request.headers),
  ];

  const parsedBody = tryParseJsonBody(request.body);
  const method = pythonRequestsMethod(request.method);
  const hasBody = request.body.trim().length > 0;

  if (method === "request") {
    lines.push("");
    if (parsedBody !== null && typeof parsedBody === "object") {
      lines.push(`payload = ${formatPythonLiteral(parsedBody)}`);
      lines.push("");
      lines.push(
        `response = requests.request(${JSON.stringify(request.method)}, url, json=payload, headers=headers)`,
      );
    } else if (hasBody) {
      lines.push(`payload = ${JSON.stringify(request.body)}`);
      lines.push("");
      lines.push(
        `response = requests.request(${JSON.stringify(request.method)}, url, data=payload, headers=headers)`,
      );
    } else {
      lines.push("");
      lines.push(
        `response = requests.request(${JSON.stringify(request.method)}, url, headers=headers)`,
      );
    }
  } else if (parsedBody !== null && typeof parsedBody === "object") {
    lines.push("");
    lines.push(`payload = ${formatPythonLiteral(parsedBody)}`);
    lines.push("");
    lines.push(`response = requests.${method}(url, json=payload, headers=headers)`);
  } else if (hasBody) {
    lines.push("");
    lines.push(`payload = ${JSON.stringify(request.body)}`);
    lines.push("");
    lines.push(`response = requests.${method}(url, data=payload, headers=headers)`);
  } else {
    lines.push("");
    lines.push(`response = requests.${method}(url, headers=headers)`);
  }

  lines.push("print(response.json())");
  return lines.join("\n");
}

function jsStringLiteral(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function formatJavaScriptHeaders(headers: Record<string, string>): string {
  const entries = sortedHeaderEntries(headers);
  if (entries.length === 0) return "{}";

  const lines = entries.map(
    ([key, value]) => `    ${jsStringLiteral(key)}: ${jsStringLiteral(value)}`,
  );
  return `{\n${lines.join(",\n")}\n  }`;
}

export function generateNodeFetch(draft: RequestDraft): string {
  const request = requestDraftToCodeGen(draft);
  const hasBody = request.body.trim().length > 0;
  const parsedBody = tryParseJsonBody(request.body);

  const optionLines = [
    `  method: ${jsStringLiteral(request.method)}`,
    `  headers: ${formatJavaScriptHeaders(request.headers)}`,
  ];

  if (hasBody) {
    if (parsedBody !== null) {
      optionLines.push(`  body: JSON.stringify(${JSON.stringify(parsedBody)})`);
    } else {
      optionLines.push(`  body: ${JSON.stringify(request.body)}`);
    }
  }

  return [
    `const url = ${jsStringLiteral(request.url)};`,
    "const options = {",
    optionLines.join(",\n"),
    "};",
    "",
    "(async () => {",
    "  try {",
    "    const response = await fetch(url, options);",
    "    const data = await response.json();",
    "    console.log(data);",
    "  } catch (error) {",
    "    console.error(error);",
    "  }",
    "})();",
  ].join("\n");
}
