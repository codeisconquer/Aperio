import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Loader2, X } from "lucide-react";
import { generateNodeFetch, generatePythonRequests } from "../../lib/codeGen";
import { copyToClipboard, exportRequestCommands } from "../../lib/exportRequest";
import { formatUiError } from "../../lib/uiError";
import type { ExportCommands, ExportSnippetTab } from "../../types/export";
import type { RequestDraft } from "../../types/history";

interface ExportSnippetsModalProps {
  draft: RequestDraft;
  onClose: () => void;
}

const TABS: ExportSnippetTab[] = [
  "curl",
  "wget",
  "go",
  "rust",
  "python",
  "node",
];

function tabLabel(tab: ExportSnippetTab, t: (key: string) => string): string {
  switch (tab) {
    case "curl":
      return t("export.tabs.curl");
    case "wget":
      return t("export.tabs.wget");
    case "go":
      return t("export.tabs.go");
    case "rust":
      return t("export.tabs.rust");
    case "python":
      return t("export.tabs.python");
    case "node":
      return t("export.tabs.node");
  }
}

function snippetForTab(
  commands: ExportCommands,
  tab: ExportSnippetTab,
  draft: RequestDraft,
): string {
  switch (tab) {
    case "python":
      return generatePythonRequests(draft);
    case "node":
      return generateNodeFetch(draft);
    default:
      return commands[tab];
  }
}

function usesBackendCommands(tab: ExportSnippetTab): boolean {
  return tab !== "python" && tab !== "node";
}

export function ExportSnippetsModal({ draft, onClose }: ExportSnippetsModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ExportSnippetTab>("curl");
  const [commands, setCommands] = useState<ExportCommands | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedTab, setCopiedTab] = useState<ExportSnippetTab | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!draft.url.trim()) {
          throw new Error(t("export.noUrl"));
        }
        const result = await exportRequestCommands(draft);
        if (!cancelled) setCommands(result);
      } catch (err) {
        if (!cancelled) {
          setError(formatUiError(err instanceof Error ? err.message : String(err), t));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draft, t]);

  async function handleCopy(tab: ExportSnippetTab) {
    const text = snippetForTab(
      commands ?? { curl: "", wget: "", go: "", rust: "" },
      tab,
      draft,
    );
    if (!text.trim()) return;

    setCopying(true);
    setCopyError(null);
    try {
      await copyToClipboard(text);
      setCopiedTab(tab);
      window.setTimeout(() => setCopiedTab(null), 1500);
    } catch (err) {
      setCopyError(formatUiError(err instanceof Error ? err.message : String(err), t));
    } finally {
      setCopying(false);
    }
  }

  const activeSnippet = snippetForTab(
    commands ?? { curl: "", wget: "", go: "", rust: "" },
    activeTab,
    draft,
  );

  const showLoading = loading && usesBackendCommands(activeTab);
  const canShowSnippet =
    !error && (commands !== null || !usesBackendCommands(activeTab));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-snippets-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2
            id="export-snippets-title"
            className="text-sm font-semibold text-foreground"
          >
            {t("export.modalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-background/60 hover:text-foreground"
            aria-label={t("export.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-t-md px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-background text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tabLabel(tab, t)}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          {showLoading && (
            <div className="flex flex-1 items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-accent" />
            </div>
          )}

          {!showLoading && error && (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          {canShowSnippet && (
            <>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  disabled={copying || !activeSnippet}
                  onClick={() => void handleCopy(activeTab)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copying ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : copiedTab === activeTab ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Copy className="size-3.5" aria-hidden />
                  )}
                  {copiedTab === activeTab
                    ? t("export.copied")
                    : t("export.copy")}
                </button>
                {copyError && (
                  <p
                    role="alert"
                    className="max-w-full rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-red-200"
                  >
                    {copyError}
                  </p>
                )}
              </div>
              <pre className="max-h-[50vh] flex-1 overflow-auto rounded-md border border-border bg-background p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-foreground">
                <code>{activeSnippet}</code>
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
