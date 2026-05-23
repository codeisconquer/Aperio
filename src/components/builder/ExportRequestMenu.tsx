import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Code2, Copy, Loader2 } from "lucide-react";
import { copyToClipboard, exportRequestCommands } from "../../lib/exportRequest";
import type { RequestDraft } from "../../types/history";
import { ExportSnippetsModal } from "./ExportSnippetsModal";

type CopiedKind = "curl" | "wget" | null;

interface ExportRequestMenuProps {
  draft: RequestDraft;
  disabled?: boolean;
}

export function ExportRequestMenu({ draft, disabled }: ExportRequestMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<CopiedKind>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleQuickCopy(kind: CopiedKind) {
    if (!kind) return;
    if (!draft.url.trim()) {
      setError(t("export.noUrl"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const commands = await exportRequestCommands(draft);
      const text = kind === "curl" ? commands.curl : commands.wget;
      await copyToClipboard(text);
      setCopied(kind);
      setToast(
        kind === "curl" ? t("export.copiedCurl") : t("export.copiedWget"),
      );
      setOpen(false);
      window.setTimeout(() => setCopied(null), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function openSnippetsModal() {
    setOpen(false);
    setModalOpen(true);
  }

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => setOpen((value) => !value)}
          title={t("export.open")}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-surface px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : copied ? (
            <Check className="size-3.5 text-success" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {t("export.open")}
          <ChevronDown className="size-3" aria-hidden />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 min-w-52 overflow-hidden rounded-md border border-white/10 bg-surface py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              disabled={loading}
              onClick={() => void handleQuickCopy("curl")}
              className="flex w-full px-3 py-2 text-left text-xs text-foreground hover:bg-background/60 disabled:opacity-50"
            >
              {t("export.copyCurl")}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={loading}
              onClick={() => void handleQuickCopy("wget")}
              className="flex w-full px-3 py-2 text-left text-xs text-foreground hover:bg-background/60 disabled:opacity-50"
            >
              {t("export.copyWget")}
            </button>
            <div className="my-1 border-t border-white/10" />
            <button
              type="button"
              role="menuitem"
              onClick={openSnippetsModal}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground hover:bg-background/60"
            >
              <Code2 className="size-3.5 text-accent" aria-hidden />
              {t("export.openSnippets")}
            </button>
          </div>
        )}

        {toast && (
          <p
            role="status"
            className="absolute right-0 top-full z-30 mt-1 whitespace-nowrap rounded-md border border-success/30 bg-success/10 px-2 py-1 text-[10px] text-success"
          >
            {toast}
          </p>
        )}

        {error && !open && !modalOpen && (
          <p className="absolute right-0 top-full z-30 mt-1 max-w-48 text-[10px] text-red-300">
            {error}
          </p>
        )}
      </div>

      {modalOpen && (
        <ExportSnippetsModal
          draft={draft}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
