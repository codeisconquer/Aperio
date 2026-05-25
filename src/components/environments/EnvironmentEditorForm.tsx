import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { KeyValueTable } from "../common/KeyValueTable";
import {
  createRow,
  ensureTrailingEmptyRow,
  rowsToRecord,
  type KeyValueRow,
} from "../../lib/keyValueRows";
import { deleteEnvironment, saveEnvironment } from "../../lib/environments";
import { parseEnvironmentVariables } from "../../lib/substituteVariables";
import type { Environment } from "../../types/environment";

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

interface EnvironmentEditorFormProps {
  environment: Environment | null;
  projectId: string;
  onCancel: () => void;
  onSaved: (environment: Environment) => void;
  onDeleted: (id: string) => void;
}

export function EnvironmentEditorForm({
  environment,
  projectId,
  onCancel,
  onSaved,
  onDeleted,
}: EnvironmentEditorFormProps) {
  const { t } = useTranslation();
  const isNew = environment === null;
  const [name, setName] = useState(environment?.name ?? "");
  const [rows, setRows] = useState<KeyValueRow[]>(() =>
    variablesToRows(environment?.variables ?? "{}"),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        project_id: projectId,
      });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!environment) return;
    if (
      !window.confirm(
        t("projectSettings.confirmDeleteEnvironment", { name: environment.name }),
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await deleteEnvironment(environment.id);
      onDeleted(environment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex w-fit items-center gap-1.5 text-xs text-foreground/55 transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t("projectSettings.backToEnvironments")}
      </button>

      <p className="text-xs leading-relaxed text-foreground/45">
        {t("environments.hint")}
      </p>

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
  );
}
