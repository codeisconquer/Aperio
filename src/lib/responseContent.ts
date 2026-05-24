import { tryParseJson } from "../components/response/JsonTreeView";

export function getContentType(headers: Record<string, string>): string | null {
  const entry = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === "content-type",
  );
  if (!entry) return null;
  return entry[1].split(";")[0]?.trim().toLowerCase() ?? null;
}

export function isImageContentType(contentType: string | null): boolean {
  return contentType?.startsWith("image/") ?? false;
}

export function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.includes("json") || contentType.endsWith("+json");
}

export function isJsonResponse(
  body: string,
  contentType: string | null,
): boolean {
  if (isJsonContentType(contentType)) return true;
  return tryParseJson(body) !== null;
}

export function buildImageDataUrl(
  contentType: string,
  base64Body: string,
): string {
  return `data:${contentType};base64,${base64Body}`;
}

export function extensionForContentType(contentType: string | null): string {
  if (!contentType) return "txt";
  if (contentType.startsWith("image/")) {
    const subtype = contentType.slice("image/".length).split("+")[0];
    return subtype === "jpeg" ? "jpg" : subtype;
  }
  if (contentType.includes("json")) return "json";
  if (contentType.includes("html")) return "html";
  if (contentType.includes("xml")) return "xml";
  return "txt";
}

export function defaultResponseFilename(
  contentType: string | null,
): string {
  return `response.${extensionForContentType(contentType)}`;
}

export function responseBodyToBytes(
  body: string,
  contentType: string | null,
): Uint8Array {
  if (isImageContentType(contentType)) {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new TextEncoder().encode(body);
}
