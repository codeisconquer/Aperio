export interface HistoryEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  headers: string;
  body: string;
  status_code: number;
  duration_ms: number;
}

export interface RequestDraft {
  method: string;
  url: string;
  headers: string;
  body: string;
}

export const emptyRequestDraft = (): RequestDraft => ({
  method: "GET",
  url: "",
  headers: "",
  body: "",
});
