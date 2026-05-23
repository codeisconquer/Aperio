export interface KeyValueRow {
  id: string;
  key: string;
  value: string;
}

export function createRow(key = "", value = ""): KeyValueRow {
  return { id: crypto.randomUUID(), key, value };
}

export function ensureTrailingEmptyRow(rows: KeyValueRow[]): KeyValueRow[] {
  if (rows.length === 0) {
    return [createRow()];
  }
  const last = rows[rows.length - 1];
  if (last.key.trim() || last.value.trim()) {
    return [...rows, createRow()];
  }
  return rows;
}

export function rowsToRecord(rows: KeyValueRow[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (key) record[key] = row.value;
  }
  return record;
}

export function headersToRows(headersJson: string): KeyValueRow[] {
  const trimmed = headersJson.trim();
  if (!trimmed) return ensureTrailingEmptyRow([]);

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const rows = Object.entries(parsed).map(([key, value]) =>
      createRow(key, stringifyHeaderValue(value)),
    );
    return ensureTrailingEmptyRow(rows);
  } catch {
    return ensureTrailingEmptyRow([createRow()]);
  }
}

export function rowsToHeadersJson(rows: KeyValueRow[]): string {
  const record = rowsToRecord(rows);
  if (Object.keys(record).length === 0) return "";
  return JSON.stringify(record, null, 2);
}

function stringifyHeaderValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function parseRequestUrl(url: string): {
  baseUrl: string;
  queryRows: KeyValueRow[];
} {
  const trimmed = url.trim();
  if (!trimmed) {
    return { baseUrl: "", queryRows: ensureTrailingEmptyRow([]) };
  }

  const hashIndex = trimmed.indexOf("#");
  const withoutHash = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  const queryIndex = withoutHash.indexOf("?");

  const baseUrl =
    queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const queryString = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "";

  const params = new URLSearchParams(queryString);
  const queryRows = ensureTrailingEmptyRow(
    Array.from(params.entries()).map(([key, value]) => createRow(key, value)),
  );

  return { baseUrl, queryRows };
}

export function buildRequestUrl(
  baseUrl: string,
  queryRows: KeyValueRow[],
  hash = "",
): string {
  const base = baseUrl.trim();
  if (!base) return "";

  const params = new URLSearchParams();
  for (const row of queryRows) {
    const key = row.key.trim();
    if (key) params.append(key, row.value);
  }

  const query = params.toString();
  const withQuery = query ? `${base}?${query}` : base;
  return hash ? `${withQuery}${hash}` : withQuery;
}

export function extractUrlHash(url: string): string {
  const index = url.indexOf("#");
  return index >= 0 ? url.slice(index) : "";
}
