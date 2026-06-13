import { useTranslation } from "react-i18next";
import { Globe, Pencil, Plus } from "lucide-react";
import type { Environment } from "../../types/environment";

interface EnvironmentSelectorProps {
  environments: Environment[];
  activeId: string | null;
  projectSelected: boolean;
  onActiveChange: (id: string | null) => void;
  onCreate: () => void;
  onEdit: (environment: Environment) => void;
}

export function EnvironmentSelector({
  environments,
  activeId,
  projectSelected,
  onActiveChange,
  onCreate,
  onEdit,
}: EnvironmentSelectorProps) {
  const { t } = useTranslation();
  const active = environments.find((env) => env.id === activeId) ?? null;

  return (
    <div className="border-b border-border px-3 py-3">
      <label
        htmlFor="environment-select"
        className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted"
      >
        <Globe className="size-3" aria-hidden />
        {t("environments.label")}
      </label>
      {!projectSelected ? (
        <p className="text-[11px] leading-relaxed text-muted">
          {t("environments.selectProjectFirst")}
        </p>
      ) : (
        <div className="flex gap-1">
          <select
            id="environment-select"
            value={activeId ?? ""}
            onChange={(e) =>
              onActiveChange(e.target.value ? e.target.value : null)
            }
            className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent"
          >
            <option value="">{t("environments.none")}</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onCreate}
            title={t("environments.create")}
            className="shrink-0 rounded-md border border-border bg-background p-1.5 text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => active && onEdit(active)}
            disabled={!active}
            title={t("environments.edit")}
            className="shrink-0 rounded-md border border-border bg-background p-1.5 text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pencil className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
