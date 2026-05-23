import { invoke } from "@tauri-apps/api/core";
import type { HttpResponse, SendRequestPayload } from "../types/http";

export async function sendRequest(
  payload: SendRequestPayload,
): Promise<HttpResponse> {
  return invoke<HttpResponse>("send_request", { payload });
}
