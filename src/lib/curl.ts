import { invoke } from "@tauri-apps/api/core";
import type { ParsedCurlRequest } from "../types/curl";
import type { RequestDraft } from "../types/history";

export async function parseCurlCommand(
  curlString: string,
): Promise<ParsedCurlRequest> {
  return invoke<ParsedCurlRequest>("parse_curl_command", { curlString });
}

export function parsedCurlToDraft(parsed: ParsedCurlRequest): RequestDraft {
  const headers =
    Object.keys(parsed.headers).length > 0
      ? JSON.stringify(parsed.headers, null, 2)
      : "";

  return {
    method: parsed.method,
    url: parsed.url,
    headers,
    body: parsed.body ?? "",
  };
}
