export interface HttpResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
  duration_ms: number;
}

export interface SendRequestPayload {
  method: string;
  url: string;
  headers: string;
  body: string;
  environment_id?: string | null;
}
