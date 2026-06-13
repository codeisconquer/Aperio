import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import type { HistoryEntry } from "../../types/history";

function methodBadgeColor(method: string): string {
  switch (method) {
    case "GET":
      return "text-success";
    case "POST":
      return "text-warning";
    default:
      return "text-muted";
  }
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "text-success";
  if (status >= 400 && status < 500) return "text-warning";
  if (status >= 500) return "text-red-400";
  return "text-muted";
}

function formatTimestamp(timestamp: string, locale: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateUrl(url: string, max = 42): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max - 1)}…`;
}

interface HistoryListProps {
  entries: HistoryEntry[];
  selectedId: string | null;
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryList({
  entries,
  selectedId,
  onSelect,
  onDelete,
  onClearAll,
}: HistoryListProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("de") ? "de-DE" : "en-US";

  if (entries.length === 0) {
    return (
      <p className="rounded-md bg-panel px-3 py-2 text-xs text-muted">
        {t("sidebar.empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end px-1">
        <button
          type="button"
          onClick={onClearAll}
          className="text-[10px] font-medium text-muted transition-colors hover:text-red-300"
        >
          {t("sidebar.clearHistory")}
        </button>
        </div>
      <ul className="flex flex-col gap-1">
        {entries.map((entry) => {
          const isSelected = entry.id === selectedId;
          return (
            <li key={entry.id} className="flex items-stretch gap-0.5">
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className={`min-w-0 flex-1 rounded-md px-2 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-accent/15 ring-1 ring-accent/40"
                    : "hover:bg-background/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`shrink-0 font-mono text-xs font-semibold ${methodBadgeColor(entry.method)}`}
                  >
                    {entry.method}
                  </span>
                  <span
                    className={`font-mono text-xs ${statusColor(entry.status_code)}`}
                  >
                    {entry.status_code}
                  </span>
                </div>
                <p
                  className="mt-1 truncate font-mono text-xs text-foreground"
                  title={entry.url}
                >
                  {truncateUrl(entry.url)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {formatTimestamp(entry.timestamp, locale)} · {entry.duration_ms}
                  {t("response.ms")}
                </p>
              </button>
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                title={t("sidebar.deleteHistoryEntry")}
                aria-label={t("sidebar.deleteHistoryEntry")}
                className="shrink-0 self-center rounded p-1.5 text-subtle transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
