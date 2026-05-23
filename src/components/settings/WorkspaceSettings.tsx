import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Loader2, Upload } from "lucide-react";
import { exportWorkspace, importWorkspace } from "../../lib/workspace";

interface WorkspaceSettingsProps {
  onImported: () => void;
}

export function WorkspaceSettings({ onImported }: WorkspaceSettingsProps) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      await exportWorkspace();
      setMessage(t("settings.exportSuccess"));
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      if (text !== "Export cancelled") setError(text);
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      await importWorkspace();
      setMessage(t("settings.importSuccess"));
      onImported();
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      if (text !== "Import cancelled") setError(text);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
      <p className="px-1 text-xs font-medium uppercase tracking-wider text-foreground/50">
        {t("settings.title")}
      </p>
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={exporting || importing}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-background/60 px-3 py-2 text-xs text-foreground hover:bg-background disabled:opacity-50"
      >
        {exporting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        {t("settings.export")}
      </button>
      <button
        type="button"
        onClick={() => void handleImport()}
        disabled={exporting || importing}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-background/60 px-3 py-2 text-xs text-foreground hover:bg-background disabled:opacity-50"
      >
        {importing ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Upload className="size-3.5" />
        )}
        {t("settings.import")}
      </button>
      {message && <p className="text-[10px] text-success">{message}</p>}
      {error && <p className="text-[10px] text-red-300">{error}</p>}
    </div>
  );
}
