import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileUp, Globe, Loader2, X } from "lucide-react";
import { isTauriDialogCancel } from "../../lib/tauriDialog";
import {
  importSwaggerFile,
  importSwaggerFromUrl,
  isValidOpenApiUrl,
} from "../../lib/swagger";
import type { SwaggerProject } from "../../types/swagger";

const PETSTORE_EXAMPLE_URL =
  "https://petstore3.swagger.io/api/v3/openapi.json";

interface OpenApiImportModalProps {
  onClose: () => void;
  onImported: (project: SwaggerProject) => void;
}

type ImportStep = "choose" | "url";

export function OpenApiImportModal({
  onClose,
  onImported,
}: OpenApiImportModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<ImportStep>("choose");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileImport() {
    setLoading(true);
    setError(null);
    try {
      const project = await importSwaggerFile();
      onImported(project);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!isTauriDialogCancel(message)) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidOpenApiUrl(url)) {
      setError(t("workspaceImport.invalidUrl"));
      return;
    }

    setLoading(true);
    try {
      const project = await importSwaggerFromUrl(url.trim());
      onImported(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleBackdropClick() {
    if (!loading) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-import-title"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-md rounded-lg border border-white/10 bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2
            id="workspace-import-title"
            className="text-sm font-semibold text-foreground"
          >
            {t("workspaceImport.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded p-1 text-foreground/50 hover:bg-background/60 hover:text-foreground disabled:opacity-50"
            aria-label={t("workspaceImport.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-col gap-4 p-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-4 text-sm text-accent">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              <span>{t("workspaceImport.loading")}</span>
            </div>
          )}

          {!loading && step === "choose" && (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-xs text-foreground/50">
                  {t("workspaceImport.chooseHint")}
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-[10px] text-foreground/45">
                  <li>{t("workspaceImport.formatOpenApi")}</li>
                  <li>{t("workspaceImport.formatServerless")}</li>
                  <li>{t("workspaceImport.formatPostman")}</li>
                </ul>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleFileImport()}
                  className="flex flex-col items-center gap-2 rounded-md border border-white/10 bg-background/40 px-4 py-4 text-center transition-colors hover:border-accent/40 hover:bg-accent/10"
                >
                  <FileUp className="size-6 text-accent" aria-hidden />
                  <span className="text-sm font-medium text-foreground">
                    {t("workspaceImport.fromFile")}
                  </span>
                  <span className="text-[10px] text-foreground/50">
                    {t("workspaceImport.fromFileHint")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("url");
                  }}
                  className="flex flex-col items-center gap-2 rounded-md border border-white/10 bg-background/40 px-4 py-4 text-center transition-colors hover:border-accent/40 hover:bg-accent/10"
                >
                  <Globe className="size-6 text-accent" aria-hidden />
                  <span className="text-sm font-medium text-foreground">
                    {t("workspaceImport.fromUrl")}
                  </span>
                  <span className="text-[10px] text-foreground/50">
                    {t("workspaceImport.fromUrlHint")}
                  </span>
                </button>
              </div>
            </>
          )}

          {!loading && step === "url" && (
            <form onSubmit={handleUrlSubmit} className="flex flex-col gap-3">
              <p className="text-xs text-foreground/50">
                {t("workspaceImport.urlHint")}
              </p>
              <p className="text-[10px] text-foreground/40">
                {t("workspaceImport.formatsHint")}
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-foreground/70">
                  {t("workspaceImport.urlLabel")}
                </span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t("workspaceImport.urlPlaceholder")}
                  autoFocus
                  className="rounded-md border border-white/10 bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-accent"
                />
              </label>
              <button
                type="button"
                onClick={() => setUrl(PETSTORE_EXAMPLE_URL)}
                className="self-start text-[10px] text-accent hover:underline"
              >
                {t("workspaceImport.usePetstoreExample")}
              </button>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("choose");
                  }}
                  className="rounded-md border border-white/10 px-4 py-2 text-sm text-foreground/70 hover:bg-background/60"
                >
                  {t("workspaceImport.back")}
                </button>
                <button
                  type="submit"
                  disabled={!url.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("workspaceImport.load")}
                </button>
              </div>
            </form>
          )}

          {error && (
            <p className="text-xs text-red-300" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
