export function formatResponseBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return body;
  }
}
