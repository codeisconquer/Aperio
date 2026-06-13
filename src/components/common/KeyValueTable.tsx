import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { KeyValueRow } from "../../lib/keyValueRows";
import { createRow, ensureTrailingEmptyRow } from "../../lib/keyValueRows";
import { VariableInput } from "./VariableHighlight";

interface KeyValueTableProps {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  highlightVariables?: boolean;
  environmentVariables?: Record<string, string>;
}

export function KeyValueTable({
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  highlightVariables = false,
  environmentVariables,
}: KeyValueTableProps) {
  const { t } = useTranslation();

  function updateRow(id: string, patch: Partial<Pick<KeyValueRow, "key" | "value">>) {
    const next = rows.map((row) =>
      row.id === id ? { ...row, ...patch } : row,
    );
    onChange(ensureTrailingEmptyRow(next));
  }

  function deleteRow(id: string) {
    const next = rows.filter((row) => row.id !== id);
    onChange(ensureTrailingEmptyRow(next.length ? next : [createRow()]));
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-panel text-left text-muted">
            <th className="px-2 py-1.5 font-medium">{t("builder.table.key")}</th>
            <th className="px-2 py-1.5 font-medium">
              {t("builder.table.value")}
            </th>
            <th className="w-8 px-1 py-1.5" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="group border-b border-border/60 last:border-b-0 hover:bg-background/30"
            >
              <td className="px-1 py-1">
                {highlightVariables ? (
                  <VariableInput
                    value={row.key}
                    onChange={(key) => updateRow(row.id, { key })}
                    environmentVariables={environmentVariables}
                    placeholder={
                      keyPlaceholder ?? t("builder.table.keyPlaceholder")
                    }
                  />
                ) : (
                  <input
                    type="text"
                    value={row.key}
                    onChange={(e) => updateRow(row.id, { key: e.target.value })}
                    placeholder={
                      keyPlaceholder ?? t("builder.table.keyPlaceholder")
                    }
                    className="w-full rounded border border-transparent bg-transparent px-2 py-1 font-mono text-foreground outline-none focus:border-accent/50 focus:bg-background/60"
                  />
                )}
              </td>
              <td className="px-1 py-1">
                {highlightVariables ? (
                  <VariableInput
                    value={row.value}
                    onChange={(value) => updateRow(row.id, { value })}
                    environmentVariables={environmentVariables}
                    placeholder={
                      valuePlaceholder ?? t("builder.table.valuePlaceholder")
                    }
                  />
                ) : (
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) =>
                      updateRow(row.id, { value: e.target.value })
                    }
                    placeholder={
                      valuePlaceholder ?? t("builder.table.valuePlaceholder")
                    }
                    className="w-full rounded border border-transparent bg-transparent px-2 py-1 font-mono text-foreground outline-none focus:border-accent/50 focus:bg-background/60"
                  />
                )}
              </td>
              <td className="px-1 py-1 text-center">
                <button
                  type="button"
                  onClick={() => deleteRow(row.id)}
                  title={t("builder.table.remove")}
                  className="inline-flex rounded p-1 text-foreground/30 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
