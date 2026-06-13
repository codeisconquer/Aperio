import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileUp,
  Globe,
  Layers,
  Loader2,
  X,
} from "lucide-react";
import { KeyValueTable } from "../common/KeyValueTable";
import {
  importEnvironmentRows,
  initialImportEnvironmentConfig,
  type ImportEnvironmentConfig,
  type WorkspaceImportResult,
} from "../../lib/projectImport";
import {
  ensureTrailingEmptyRow,
  rowsToRecord,
  type KeyValueRow,
} from "../../lib/keyValueRows";
import { EnvironmentTokenField } from "../vault/EnvironmentTokenField";
import { isTauriDialogCancel } from "../../lib/tauriDialog";
import {
  importSwaggerFile,
  importSwaggerFromUrl,
  isValidOpenApiUrl,
} from "../../lib/swagger";
import type { SwaggerProject } from "../../types/swagger";

const PETSTORE_EXAMPLE_URL =
  "https://petstore3.swagger.io/api/v3/openapi.json";

type WizardStep = "source" | "url" | "preview" | "environment";

interface WorkspaceImportWizardProps {
  onClose: () => void;
  onImported: (result: WorkspaceImportResult) => void;
}

function stepIndex(step: WizardStep): number {
  switch (step) {
    case "source":
    case "url":
      return 0;
    case "preview":
      return 1;
    case "environment":
      return 2;
  }
}

export function WorkspaceImportWizard({
  onClose,
  onImported,
}: WorkspaceImportWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<WizardStep>("source");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<SwaggerProject | null>(null);
  const [envName, setEnvName] = useState("");
  const [envRows, setEnvRows] = useState<KeyValueRow[]>(() =>
    ensureTrailingEmptyRow([]),
  );
  const [envToken, setEnvToken] = useState("");

  const wizardSteps = useMemo(
    () => [
      t("workspaceImport.wizard.stepSource"),
      t("workspaceImport.wizard.stepPreview"),
      t("workspaceImport.wizard.stepEnvironment"),
    ],
    [t],
  );
  const currentStepIndex = stepIndex(step);

  function resetEnvironmentDraft(imported: SwaggerProject) {
    const config = initialImportEnvironmentConfig(
      imported,
      t("projectSettings.defaultEnvironmentName"),
    );
    setEnvName(config.name);
    setEnvRows(importEnvironmentRows(config));
    setEnvToken("");
  }

  async function loadProject(
    loader: () => Promise<SwaggerProject>,
  ): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const imported = await loader();
      setProject(imported);
      resetEnvironmentDraft(imported);
      setStep("preview");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!isTauriDialogCancel(message)) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleFileImport() {
    await loadProject(importSwaggerFile);
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidOpenApiUrl(url)) {
      setError(t("workspaceImport.invalidUrl"));
      return;
    }

    await loadProject(() => importSwaggerFromUrl(url.trim()));
  }

  function handleFinish() {
    if (!project) return;

    const variables = rowsToRecord(envRows);
    const trimmedToken = envToken.trim();
    const hasVariables = Object.keys(variables).length > 0;
    const config: ImportEnvironmentConfig | null =
      envName.trim() && (hasVariables || trimmedToken)
        ? {
            name: envName.trim(),
            variables,
            token: trimmedToken || undefined,
          }
        : null;

    onImported({ project, environment: config });
  }

  function handleBack() {
    setError(null);
    if (step === "url") {
      setStep("source");
      return;
    }
    if (step === "preview") {
      setStep(url.trim() ? "url" : "source");
      return;
    }
    if (step === "environment") {
      setStep("preview");
    }
  }

  function handleNext() {
    setError(null);
    if (step === "preview") {
      setStep("environment");
    }
  }

  function handleBackdropClick() {
    if (!loading) onClose();
  }

  const canGoBack =
    !loading &&
    (step === "url" || step === "preview" || step === "environment");
  const showNext = !loading && step === "preview";
  const showFinish = !loading && step === "environment";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-import-title"
      onClick={handleBackdropClick}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
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
              className="rounded p-1 text-muted hover:bg-background/60 hover:text-foreground disabled:opacity-50"
              aria-label={t("workspaceImport.close")}
            >
              <X className="size-4" />
            </button>
          </div>

          <nav
            aria-label={t("workspaceImport.wizard.progress")}
            className="mt-3 flex items-center gap-1.5"
          >
            {wizardSteps.map((label, index) => {
              const active = index === currentStepIndex;
              const done = index < currentStepIndex;
              return (
                <div key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
                  {index > 0 && (
                    <span
                      className={`h-px flex-1 ${done ? "bg-accent/50" : "bg-white/10"}`}
                      aria-hidden
                    />
                  )}
                  <div
                    className={`flex min-w-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      active
                        ? "bg-accent/15 text-accent"
                        : done
                          ? "text-muted"
                          : "text-foreground/30"
                    }`}
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                        active
                          ? "bg-accent text-accent-foreground"
                          : done
                            ? "bg-accent/25 text-accent"
                            : "bg-white/10"
                      }`}
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    <span className="truncate">{label}</span>
                  </div>
                </div>
              );
            })}
          </nav>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-8 text-sm text-accent">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              <span>{t("workspaceImport.loading")}</span>
            </div>
          )}

          {!loading && step === "source" && (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted">
                  {t("workspaceImport.chooseHint")}
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-[10px] text-muted">
                  <li>{t("workspaceImport.formatOpenApi")}</li>
                  <li>{t("workspaceImport.formatServerless")}</li>
                  <li>{t("workspaceImport.formatPostman")}</li>
                </ul>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleFileImport()}
                  className="flex flex-col items-center gap-2 rounded-md border border-border bg-background/40 px-4 py-4 text-center transition-colors hover:border-accent/40 hover:bg-accent/10"
                >
                  <FileUp className="size-6 text-accent" aria-hidden />
                  <span className="text-sm font-medium text-foreground">
                    {t("workspaceImport.fromFile")}
                  </span>
                  <span className="text-[10px] text-muted">
                    {t("workspaceImport.fromFileHint")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("url");
                  }}
                  className="flex flex-col items-center gap-2 rounded-md border border-border bg-background/40 px-4 py-4 text-center transition-colors hover:border-accent/40 hover:bg-accent/10"
                >
                  <Globe className="size-6 text-accent" aria-hidden />
                  <span className="text-sm font-medium text-foreground">
                    {t("workspaceImport.fromUrl")}
                  </span>
                  <span className="text-[10px] text-muted">
                    {t("workspaceImport.fromUrlHint")}
                  </span>
                </button>
              </div>
            </>
          )}

          {!loading && step === "url" && (
            <form
              id="workspace-import-url-form"
              onSubmit={handleUrlSubmit}
              className="flex flex-col gap-3"
            >
              <p className="text-xs text-muted">
                {t("workspaceImport.urlHint")}
              </p>
              <p className="text-[10px] text-muted">
                {t("workspaceImport.formatsHint")}
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted">
                  {t("workspaceImport.urlLabel")}
                </span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t("workspaceImport.urlPlaceholder")}
                  autoFocus
                  className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-accent"
                />
              </label>
              <button
                type="button"
                onClick={() => setUrl(PETSTORE_EXAMPLE_URL)}
                className="self-start text-[10px] text-accent hover:underline"
              >
                {t("workspaceImport.usePetstoreExample")}
              </button>
            </form>
          )}

          {!loading && step === "preview" && project && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-md border border-accent/25 bg-accent/10 px-3 py-3">
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-accent"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {t("workspaceImport.wizard.loadedTitle")}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t("workspaceImport.wizard.loadedHint")}
                  </p>
                </div>
              </div>

              <dl className="overflow-hidden rounded-md border border-border text-xs">
                <div className="border-b border-border/60 px-3 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("workspaceImport.wizard.projectName")}
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {project.title}
                  </dd>
                </div>
                <div className="border-b border-border/60 px-3 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("workspaceImport.wizard.projectVersion")}
                  </dt>
                  <dd className="mt-0.5 font-mono text-foreground">
                    v{project.version}
                  </dd>
                </div>
                <div className="border-b border-border/60 px-3 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("workspaceImport.wizard.endpointCount")}
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {t("workspaceImport.wizard.endpointCountValue", {
                      count: project.endpoints.length,
                    })}
                  </dd>
                </div>
                <div className="px-3 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("workspaceImport.wizard.detectedServer")}
                  </dt>
                  <dd className="mt-0.5 font-mono text-foreground">
                    {project.base_url?.trim() ? (
                      project.base_url
                    ) : (
                      <span className="text-subtle">
                        {t("workspaceImport.wizard.noServer")}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>

              {project.base_url?.trim() && (
                <p className="text-xs leading-relaxed text-muted">
                  {t("workspaceImport.wizard.baseUrlPlaceholderHint")}
                </p>
              )}
            </div>
          )}

          {!loading && step === "environment" && project && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-md border border-border bg-background/40 px-3 py-3">
                <Layers className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {t("workspaceImport.wizard.environmentTitle")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {t("workspaceImport.wizard.environmentHint")}
                  </p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-muted">
                {t("environments.hint")}
              </p>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted">
                  {t("environments.nameLabel")}
                </span>
                <input
                  type="text"
                  value={envName}
                  onChange={(e) => setEnvName(e.target.value)}
                  placeholder={t("environments.namePlaceholder")}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted">
                  {t("environments.variablesLabel")}
                </span>
                <KeyValueTable
                  rows={envRows}
                  onChange={setEnvRows}
                  highlightVariables
                />
              </div>

              <EnvironmentTokenField
                token={envToken}
                onTokenChange={setEnvToken}
                environmentName={envName.trim() || undefined}
              />

              {project.uses_bearer_auth && (
                <p className="text-xs leading-relaxed text-muted">
                  {t("workspaceImport.wizard.authDetectedHint")}
                </p>
              )}

              <p className="text-[10px] leading-relaxed text-subtle">
                {t("workspaceImport.wizard.environmentOptional")}
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-300" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={!canGoBack}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-background/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {t("workspaceImport.back")}
          </button>

          <div className="flex gap-2">
            {step === "url" && !loading && (
              <button
                type="submit"
                form="workspace-import-url-form"
                disabled={!url.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("workspaceImport.load")}
                <ArrowRight className="size-3.5" aria-hidden />
              </button>
            )}

            {showNext && (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
              >
                {t("workspaceImport.wizard.next")}
                <ArrowRight className="size-3.5" aria-hidden />
              </button>
            )}

            {showFinish && (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
              >
                <CheckCircle2 className="size-3.5" aria-hidden />
                {t("workspaceImport.wizard.finish")}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
