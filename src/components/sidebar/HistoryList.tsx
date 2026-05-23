import { useTranslation } from "react-i18next";
import type { HistoryEntry } from "../../types/history";

function methodBadgeColor(method: string): string {
  switch (method) {
    case "GET":
      return "text-success";
    case "POST":
      return "text-warning";
    default:
      return "text-foreground/70";
  }
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "text-success";
  if (status >= 400 && status < 500) return "text-warning";
  if (status >= 500) return "text-red-400";
  return "text-foreground/50";
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
}

export function HistoryList({
  entries,
  selectedId,
  onSelect,
}: HistoryListProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("de") ? "de-DE" : "en-US";

  if (entries.length === 0) {
    return (
      <p className="rounded-md bg-background/50 px-3 py-2 text-xs text-foreground/40">
        {t("sidebar.empty")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {entries.map((entry) => {
        const isSelected = entry.id === selectedId;
        return (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className={`w-full rounded-md px-2 py-2 text-left transition-colors ${
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
                className="mt-1 truncate font-mono text-xs text-foreground/80"
                title={entry.url}
              >
                {truncateUrl(entry.url)}
              </p>
              <p className="mt-0.5 text-[10px] text-foreground/40">
                {formatTimestamp(entry.timestamp, locale)} · {entry.duration_ms}
                {t("response.ms")}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
