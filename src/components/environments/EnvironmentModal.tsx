import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Loader2, X } from "lucide-react";
import { KeyValueTable } from "../common/KeyValueTable";
import {
  createRow,
  ensureTrailingEmptyRow,
  rowsToRecord,
  type KeyValueRow,
} from "../../lib/keyValueRows";
import { parseEnvironmentVariables } from "../../lib/substituteVariables";
import { deleteEnvironment, saveEnvironment } from "../../lib/environments";
import type { Environment } from "../../types/environment";

interface EnvironmentModalProps {
  environment: Environment | null;
  onClose: () => void;
  onSaved: (environment: Environment) => void;
  onDeleted: (id: string) => void;
}

function variablesToRows(variablesJson: string): KeyValueRow[] {
  const record = parseEnvironmentVariables(variablesJson);
  const rows = Object.entries(record).map(([key, value]) =>
    createRow(key, value),
  );
  return ensureTrailingEmptyRow(rows);
}

function rowsToVariablesJson(rows: KeyValueRow[]): string {
  const record = rowsToRecord(rows);
  return JSON.stringify(record, null, 2);
}

export function EnvironmentModal({
  environment,
  onClose,
  onSaved,
  onDeleted,
}: EnvironmentModalProps) {
  const { t } = useTranslation();
  const isNew = environment === null;
  const [name, setName] = useState(environment?.name ?? "");
  const [rows, setRows] = useState<KeyValueRow[]>(() =>
    variablesToRows(environment?.variables ?? "{}"),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(
    () => (isNew ? t("environments.createTitle") : t("environments.editTitle")),
    [isNew, t],
  );

  useEffect(() => {
    setName(environment?.name ?? "");
    setRows(variablesToRows(environment?.variables ?? "{}"));
    setError(null);
  }, [environment]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await saveEnvironment({
        id: environment?.id,
        name,
        variables: rowsToVariablesJson(rows),
      });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!environment) return;
    setSaving(true);
    setError(null);
    try {
      await deleteEnvironment(environment.id);
      onDeleted(environment.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="environment-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-white/10 bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-accent" aria-hidden />
            <h2
              id="environment-modal-title"
              className="text-sm font-semibold text-foreground"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-foreground/50 hover:bg-background/60 hover:text-foreground"
            aria-label={t("environments.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <form
          onSubmit={handleSave}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
        >
          <p className="text-xs text-foreground/50">{t("environments.hint")}</p>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground/70">
              {t("environments.nameLabel")}
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("environments.namePlaceholder")}
              className="rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-foreground/70">
              {t("environments.variablesLabel")}
            </span>
            <KeyValueTable rows={rows} onChange={setRows} highlightVariables />
          </div>

          {error && (
            <p className="text-xs text-red-300" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t("environments.save")}
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={saving}
                className="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                {t("environments.delete")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
