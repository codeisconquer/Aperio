import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Send, Terminal } from "lucide-react";
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
import type { RequestDraft } from "../../types/history";
import { CurlImportModal } from "./CurlImportModal";
import { ExportRequestMenu } from "./ExportRequestMenu";

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
  onDraftChange: (draft: RequestDraft) => void;
  onSend: (payload: RequestDraft) => void;
  onCurlImported?: () => void;
  loading: boolean;
}

export function RequestBuilder({
  draft,
  onDraftChange,
  onSend,
  onCurlImported,
  loading,
}: RequestBuilderProps) {
  const { t } = useTranslation();
  const [curlModalOpen, setCurlModalOpen] = useState(false);

  const { baseUrl, queryRows } = useMemo(
    () => parseRequestUrl(draft.url),
    [draft.url],
  );
  const headerRows = useMemo(
    () => headersToRows(draft.headers),
    [draft.headers],
  );

  function update<K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) {
    onDraftChange({ ...draft, [key]: value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSend(draft);
  }

  function handleCurlImported(imported: RequestDraft) {
    onDraftChange(imported);
    onCurlImported?.();
  }

  function updateBaseUrl(nextBase: string) {
    const hash = extractUrlHash(draft.url);
    update("url", buildRequestUrl(nextBase, queryRows, hash));
  }

  function updateQueryRows(rows: KeyValueRow[]) {
    const hash = extractUrlHash(draft.url);
    update("url", buildRequestUrl(baseUrl, rows, hash));
  }

  function updateHeaderRows(rows: KeyValueRow[]) {
    update("headers", rowsToHeadersJson(rows));
  }

  return (
    <section
      data-testid="layout-builder"
      className="flex h-full min-w-0 flex-1 flex-col bg-background"
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <h1 className="text-sm font-semibold text-foreground">
          {t("builder.title")}
        </h1>
        <div className="flex items-center gap-2">
          <ExportRequestMenu draft={draft} disabled={loading} />
          <button
            type="button"
            onClick={() => setCurlModalOpen(true)}
            title={t("curlImport.open")}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-surface px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:border-accent/40 hover:text-accent"
          >
            <Terminal className="size-3.5" aria-hidden />
            {t("curlImport.open")}
          </button>
          <button
            type="submit"
            form="request-form"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
      >
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="http-method">
            {t("builder.method")}
          </label>
          <select
            id="http-method"
            value={draft.method}
            onChange={(e) => update("method", e.target.value)}
            className={`w-28 shrink-0 rounded-md border border-white/10 bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-accent ${methodColor(draft.method)}`}
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
          <div className="min-w-0 flex-1 rounded-md border border-white/10 bg-surface focus-within:border-accent">
            <VariableInput
              id="request-url"
              type="url"
              value={baseUrl}
              onChange={updateBaseUrl}
              placeholder={t("builder.urlPlaceholder")}
              inputClassName="text-sm"
              className="px-1 py-1"
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium uppercase tracking-wider text-foreground/50">
            {t("builder.queryParams")}
          </legend>
          <KeyValueTable
            rows={queryRows}
            onChange={updateQueryRows}
            highlightVariables
          />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium uppercase tracking-wider text-foreground/50">
            {t("builder.headers")}
          </legend>
          <KeyValueTable
            rows={headerRows}
            onChange={updateHeaderRows}
            highlightVariables
          />
        </fieldset>

        <fieldset className="flex flex-1 flex-col gap-2">
          <legend className="mb-1 text-xs font-medium uppercase tracking-wider text-foreground/50">
            {t("builder.body")}
          </legend>
          <VariableTextarea
            value={draft.body}
            onChange={(body) => update("body", body)}
            placeholder="{}"
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
