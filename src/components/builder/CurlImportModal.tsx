import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Terminal, X } from "lucide-react";
import { parseCurlCommand, parsedCurlToDraft } from "../../lib/curl";
import type { RequestDraft } from "../../types/history";

interface CurlImportModalProps {
  onClose: () => void;
  onImported: (draft: RequestDraft) => void;
}

export function CurlImportModal({ onClose, onImported }: CurlImportModalProps) {
  const { t } = useTranslation();
  const [curlInput, setCurlInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!curlInput.trim()) return;

    setImporting(true);
    setError(null);
    try {
      const parsed = await parseCurlCommand(curlInput);
      onImported(parsedCurlToDraft(parsed));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="curl-import-title"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col rounded-lg border border-white/10 bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-accent" aria-hidden />
            <h2
              id="curl-import-title"
              className="text-sm font-semibold text-foreground"
            >
              {t("curlImport.title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-foreground/50 hover:bg-background/60 hover:text-foreground"
            aria-label={t("curlImport.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <form onSubmit={handleImport} className="flex flex-col gap-3 p-4">
          <p className="text-xs text-foreground/50">{t("curlImport.hint")}</p>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground/70">
              {t("curlImport.label")}
            </span>
            <textarea
              data-testid="curl-import-input"
              value={curlInput}
              onChange={(e) => setCurlInput(e.target.value)}
              placeholder={t("curlImport.placeholder")}
              rows={10}
              autoFocus
              spellCheck={false}
              className="min-h-48 resize-y rounded-md border border-white/10 bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground outline-none focus:border-accent"
            />
          </label>

          {error && (
            <p className="text-xs text-red-300" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="rounded-md border border-white/10 px-4 py-2 text-sm text-foreground/70 hover:bg-background/60 disabled:opacity-50"
            >
              {t("curlImport.cancel")}
            </button>
            <button
              type="submit"
              disabled={importing || !curlInput.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing && <Loader2 className="size-4 animate-spin" />}
              {importing ? t("curlImport.importing") : t("curlImport.import")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
