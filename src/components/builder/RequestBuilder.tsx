import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Braces, Globe, Link2, Loader2, Send, Terminal } from "lucide-react";
import { KeyValueTable } from "../common/KeyValueTable";
import { VariableInput, VariableTextarea } from "../common/VariableHighlight";
import {
  buildRequestUrl,
  extractUrlHash,
  headersToRows,
  parseRequestUrl,
  rowsToHeadersJson,
  type KeyValueRow,
} from "../../lib/keyValueRows";
import {
  applyPathParams,
  extractPathParamsFromUrl,
  initialPathParamValues,
  mergeEnvIntoEmptyPathParams,
} from "../../lib/pathParams";
import {
  resolveExportDraft,
  resolveRequestUrl,
  templateRequestUrl,
} from "../../lib/resolveExportDraft";
import { getRequestUrlIssue } from "../../lib/requestUrl";
import type { RequestDraft } from "../../types/history";
import type { Environment } from "../../types/environment";
import { CurlImportModal } from "./CurlImportModal";
import { ExportRequestMenu } from "./ExportRequestMenu";
import { PathParamsTable } from "./PathParamsTable";

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

function methodColor(method: string): string {
  switch (method) {
    case "GET":
    case "HEAD":
      return "text-success";
    case "POST":
    case "PUT":
    case "PATCH":
      return "text-warning";
    default:
      return "text-foreground";
  }
}

function methodOptions(current: string): string[] {
  const known = new Set<string>(HTTP_METHODS);
  if (known.has(current)) {
    return [...HTTP_METHODS];
  }
  return [...HTTP_METHODS, current];
}

interface RequestBuilderProps {
  draft: RequestDraft;
  pathParams?: string[];
  environmentVariables?: Record<string, string>;
  environments?: Environment[];
  activeEnvironmentId?: string | null;
  onActiveEnvironmentChange?: (id: string | null) => void;
  onDraftChange: (draft: RequestDraft) => void;
  onSend: (payload: RequestDraft) => void;
  onCurlImported?: () => void;
  loading: boolean;
}

export function RequestBuilder({
  draft,
  pathParams = [],
  environmentVariables = {},
  environments = [],
  activeEnvironmentId = null,
  onActiveEnvironmentChange,
  onDraftChange,
  onSend,
  onCurlImported,
  loading,
}: RequestBuilderProps) {
  const { t } = useTranslation();
  const [curlModalOpen, setCurlModalOpen] = useState(false);
  const [pathParamValues, setPathParamValues] = useState<Record<string, string>>(
    {},
  );
  const [urlFieldTouched, setUrlFieldTouched] = useState(false);
  const [urlShowResolved, setUrlShowResolved] = useState(false);

  const templateUrl = useMemo(
    () => templateRequestUrl(draft.url, environmentVariables),
    [draft.url, environmentVariables],
  );

  const resolvedUrl = useMemo(
    () => resolveRequestUrl(draft.url, pathParamValues, environmentVariables),
    [draft.url, pathParamValues, environmentVariables],
  );

  const { baseUrl: templateBaseUrl, queryRows } = useMemo(
    () => parseRequestUrl(templateUrl),
    [templateUrl],
  );

  const displayBaseUrl = useMemo(() => {
    if (!urlShowResolved) return templateBaseUrl;
    return parseRequestUrl(resolvedUrl).baseUrl;
  }, [urlShowResolved, templateBaseUrl, resolvedUrl]);

  const urlIssue = useMemo(
    () => getRequestUrlIssue(urlShowResolved ? displayBaseUrl : templateBaseUrl),
    [urlShowResolved, displayBaseUrl, templateBaseUrl],
  );
  const urlErrorMessage =
    urlIssue === "empty"
      ? t("builder.urlErrorEmpty")
      : urlIssue === "invalid"
        ? t("builder.urlErrorInvalid")
        : null;
  const showUrlError = urlFieldTouched && urlErrorMessage !== null;
  const effectivePathParams = useMemo(() => {
    if (pathParams.length > 0) return pathParams;
    return extractPathParamsFromUrl(templateBaseUrl);
  }, [pathParams, templateBaseUrl]);
  const pathParamsKey = effectivePathParams.join("\0");
  const envVarsKey = JSON.stringify(environmentVariables);
  const prevPathParamsKeyRef = useRef(pathParamsKey);

  useEffect(() => {
    if (prevPathParamsKeyRef.current !== pathParamsKey) {
      prevPathParamsKeyRef.current = pathParamsKey;
      setPathParamValues(
        initialPathParamValues(effectivePathParams, environmentVariables),
      );
      return;
    }

    setPathParamValues((prev) =>
      mergeEnvIntoEmptyPathParams(prev, effectivePathParams, environmentVariables),
    );
  }, [pathParamsKey, envVarsKey, effectivePathParams, environmentVariables]);
  const headerRows = useMemo(
    () => headersToRows(draft.headers),
    [draft.headers],
  );

  function update<K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) {
    onDraftChange({ ...draft, [key]: value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUrlFieldTouched(true);
    if (getRequestUrlIssue(templateBaseUrl) !== null) return;

    onSend({
      ...draft,
      url: applyPathParams(draft.url, pathParamValues),
    });
  }

  function handleCurlImported(imported: RequestDraft) {
    onDraftChange(imported);
    onCurlImported?.();
  }

  function updateBaseUrl(nextBase: string) {
    const hash = extractUrlHash(templateUrl);
    update("url", buildRequestUrl(nextBase, queryRows, hash));
  }

  function markUrlTouched() {
    setUrlFieldTouched(true);
  }

  function updateQueryRows(rows: KeyValueRow[]) {
    const hash = extractUrlHash(templateUrl);
    update("url", buildRequestUrl(templateBaseUrl, rows, hash));
  }

  function updateHeaderRows(rows: KeyValueRow[]) {
    update("headers", rowsToHeadersJson(rows));
  }

  const exportDraft = useMemo(
    () => resolveExportDraft(draft, pathParamValues, environmentVariables),
    [draft, pathParamValues, environmentVariables],
  );

  return (
    <section
      data-testid="layout-builder"
      className="flex h-full min-w-0 flex-1 flex-col bg-background"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h1 className="text-sm font-semibold text-foreground">
          {t("builder.title")}
        </h1>
        <div className="flex items-center gap-2">
          <ExportRequestMenu draft={exportDraft} disabled={loading} />
          <button
            type="button"
            onClick={() => setCurlModalOpen(true)}
            title={t("curlImport.open")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent"
          >
            <Terminal className="size-3.5" aria-hidden />
            {t("curlImport.open")}
          </button>
          <button
            type="submit"
            form="request-form"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            {loading ? t("builder.sending") : t("builder.send")}
          </button>
        </div>
      </header>

      <form
        id="request-form"
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
      >
        {environments.length > 1 && onActiveEnvironmentChange && (
          <label htmlFor="request-environment-select" className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
              <Globe className="size-3" aria-hidden />
              {t("builder.activeEnvironment")}
            </span>
            <select
              id="request-environment-select"
              value={activeEnvironmentId ?? ""}
              onChange={(e) =>
                onActiveEnvironmentChange(e.target.value ? e.target.value : null)
              }
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            >
              <option value="">{t("environments.none")}</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="http-method">
              {t("builder.method")}
            </label>
            <select
              id="http-method"
              value={draft.method}
              onChange={(e) => update("method", e.target.value)}
              className={`w-28 shrink-0 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-accent ${methodColor(draft.method)}`}
            >
              {methodOptions(draft.method).map((m) => (
                <option key={m} value={m} className="text-foreground">
                  {m}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="request-url">
              {t("builder.url")}
            </label>
            <div
              className={`min-w-0 flex-1 rounded-md border bg-surface transition-colors ${
                showUrlError
                  ? "border-red-500/60 focus-within:border-red-400"
                  : "border-border focus-within:border-accent"
              } ${urlShowResolved ? "opacity-95" : ""}`}
            >
              {urlShowResolved ? (
                <input
                  id="request-url"
                  type="text"
                  readOnly
                  value={displayBaseUrl}
                  onFocus={() => setUrlShowResolved(false)}
                  className="block w-full min-w-0 bg-transparent px-3 py-2 font-mono text-sm text-foreground outline-none"
                  aria-describedby={showUrlError ? "request-url-error" : undefined}
                />
              ) : (
                <VariableInput
                  id="request-url"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  invalid={showUrlError}
                  pathParamValues={pathParamValues}
                  environmentVariables={environmentVariables}
                  value={templateBaseUrl}
                  onChange={updateBaseUrl}
                  onBlur={markUrlTouched}
                  placeholder={t("builder.urlPlaceholder")}
                  inputClassName="text-sm"
                  className="block w-full min-w-0"
                  aria-describedby={showUrlError ? "request-url-error" : undefined}
                />
              )}
            </div>
            <button
              type="button"
              aria-pressed={urlShowResolved}
              title={
                urlShowResolved
                  ? t("builder.urlShowTemplate")
                  : t("builder.urlShowResolved")
              }
              onClick={() => setUrlShowResolved((value) => !value)}
              className={`shrink-0 rounded-md border px-2.5 py-2 transition-colors ${
                urlShowResolved
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-border bg-surface text-muted hover:border-accent/40 hover:text-accent"
              }`}
            >
              {urlShowResolved ? (
                <Braces className="size-4" aria-hidden />
              ) : (
                <Link2 className="size-4" aria-hidden />
              )}
              <span className="sr-only">
                {urlShowResolved
                  ? t("builder.urlShowTemplate")
                  : t("builder.urlShowResolved")}
              </span>
            </button>
          </div>
          {showUrlError && (
            <p
              id="request-url-error"
              role="alert"
              className="text-xs leading-relaxed text-red-300"
            >
              {urlErrorMessage}
            </p>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
            {t("builder.queryParams")}
          </legend>
          <KeyValueTable
            rows={queryRows}
            onChange={updateQueryRows}
            highlightVariables
            environmentVariables={environmentVariables}
          />
        </fieldset>

        {effectivePathParams.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              {t("builder.pathParams")}
            </legend>
            <PathParamsTable
              paramNames={effectivePathParams}
              values={pathParamValues}
              onChange={setPathParamValues}
            />
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
            {t("builder.headers")}
          </legend>
          <KeyValueTable
            rows={headerRows}
            onChange={updateHeaderRows}
            highlightVariables
            environmentVariables={environmentVariables}
          />
        </fieldset>

        <fieldset className="flex flex-1 flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
            {t("builder.body")}
          </legend>
          <VariableTextarea
            value={draft.body}
            onChange={(body) => update("body", body)}
            environmentVariables={environmentVariables}
            placeholder={t("builder.bodyPlaceholder")}
            spellCheck={false}
          />
        </fieldset>
      </form>

      {curlModalOpen && (
        <CurlImportModal
          onClose={() => setCurlModalOpen(false)}
          onImported={handleCurlImported}
        />
      )}
    </section>
  );
}
