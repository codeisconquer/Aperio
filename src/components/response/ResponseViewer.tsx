import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, Copy, Inbox, Loader2 } from "lucide-react";
import { formatResponseBody } from "../../lib/formatBody";
import { copyToClipboard } from "../../lib/exportRequest";
import type { HttpResponse } from "../../types/http";
import { JsonTreeViewFromText } from "./JsonTreeView";

interface ResponseViewerProps {
  response: HttpResponse | null;
  error: string | null;
  loading: boolean;
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "text-success";
  if (status >= 400 && status < 500) return "text-warning";
  if (status >= 500) return "text-red-400";
  return "text-foreground";
}

export function ResponseViewer({
  response,
  error,
  loading,
}: ResponseViewerProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const showEmpty = !loading && !response && !error;

  const displayBody = response
    ? formatResponseBody(response.body) || response.body
    : "";

  async function handleCopyBody() {
    if (!displayBody) return;
    await copyToClipboard(displayBody);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <aside
      data-testid="layout-response"
      className="flex h-full w-96 shrink-0 flex-col border-l border-white/10 bg-surface"
    >
      <header className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t("response.title")}
        </h2>
      </header>

      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <Loader2
            className="size-8 animate-spin text-accent"
            aria-hidden
          />
          <p className="text-sm text-foreground/50">{t("response.loading")}</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        </div>
      )}

      {showEmpty && (
        <div
          data-testid="response-empty"
          className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <Inbox className="size-10 text-foreground/20" aria-hidden />
          <p className="text-sm text-foreground/40">{t("response.empty")}</p>
        </div>
      )}

      {!loading && response && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex gap-4 border-b border-white/10 px-4 py-3 text-sm">
            <div>
              <span className="text-foreground/50">{t("response.status")}</span>
              <p
                data-testid="response-status"
                className={`font-mono font-semibold ${statusColor(response.status)}`}
              >
                {response.status}
              </p>
            </div>
            <div>
              <span className="text-foreground/50">
                {t("response.duration")}
              </span>
              <p
                data-testid="response-duration"
                className="font-mono font-semibold text-foreground"
              >
                {response.duration_ms} {t("response.ms")}
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                {t("response.body")}
              </span>
              {displayBody && (
                <button
                  type="button"
                  onClick={() => void handleCopyBody()}
                  title={t("response.copyBody")}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-background/60 px-2 py-1 text-[10px] font-medium text-foreground/70 transition-colors hover:border-accent/40 hover:text-accent"
                >
                  {copied ? (
                    <Check className="size-3.5 text-success" aria-hidden />
                  ) : (
                    <Copy className="size-3.5" aria-hidden />
                  )}
                  {copied ? t("response.copied") : t("response.copyBody")}
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {displayBody ? (
                <JsonTreeViewFromText body={displayBody} />
              ) : (
                <p className="text-xs text-foreground/40">{t("response.noBody")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
