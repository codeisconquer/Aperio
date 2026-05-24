import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Loader2, X } from "lucide-react";
import { copyToClipboard, exportRequestCommands } from "../../lib/exportRequest";
import { formatUiError } from "../../lib/uiError";
import type { ExportCommands, ExportSnippetTab } from "../../types/export";
import type { RequestDraft } from "../../types/history";

interface ExportSnippetsModalProps {
  draft: RequestDraft;
  onClose: () => void;
}

const TABS: ExportSnippetTab[] = ["curl", "wget", "go", "rust"];

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
  }
}

function snippetForTab(commands: ExportCommands, tab: ExportSnippetTab): string {
  return commands[tab];
}

export function ExportSnippetsModal({ draft, onClose }: ExportSnippetsModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ExportSnippetTab>("curl");
  const [commands, setCommands] = useState<ExportCommands | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedTab, setCopiedTab] = useState<ExportSnippetTab | null>(null);

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
    if (!commands) return;
    await copyToClipboard(snippetForTab(commands, tab));
    setCopiedTab(tab);
    window.setTimeout(() => setCopiedTab(null), 1500);
  }

  const activeSnippet = commands ? snippetForTab(commands, activeTab) : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-snippets-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-white/10 bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2
            id="export-snippets-title"
            className="text-sm font-semibold text-foreground"
          >
            {t("export.modalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-foreground/50 hover:bg-background/60 hover:text-foreground"
            aria-label={t("export.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 pt-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-t-md px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-background text-accent"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {tabLabel(tab, t)}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          {loading && (
            <div className="flex flex-1 items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-accent" />
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && commands && (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleCopy(activeTab)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
                >
                  {copiedTab === activeTab ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Copy className="size-3.5" aria-hidden />
                  )}
                  {copiedTab === activeTab
                    ? t("export.copied")
                    : t("export.copy")}
                </button>
              </div>
              <pre className="max-h-[50vh] flex-1 overflow-auto rounded-md border border-white/10 bg-surface p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words">
                <code className="text-foreground/90">{activeSnippet}</code>
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
