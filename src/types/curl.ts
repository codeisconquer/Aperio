export interface ParsedCurlRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string | null;
}
