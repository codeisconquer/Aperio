import { useTranslation } from "react-i18next";
import { KeyRound } from "lucide-react";

interface EnvironmentTokenFieldProps {
  token: string;
  onTokenChange: (token: string) => void;
  stored?: boolean;
  environmentName?: string | null;
  disabled?: boolean;
  onRemove?: () => void;
  removing?: boolean;
}

export function EnvironmentTokenField({
  token,
  onTokenChange,
  stored = false,
  environmentName,
  disabled = false,
  onRemove,
  removing = false,
}: EnvironmentTokenFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <KeyRound className="size-3.5 text-warning" aria-hidden />
        {t("projectSettings.authHeading")}
      </div>

      <p className="text-xs leading-relaxed text-muted">
        {environmentName
          ? t("vault.hintForEnvironment", { name: environmentName })
          : t("vault.hint")}
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">
          {t("vault.tokenLabel")}
        </span>
        <input
          type="password"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder={t("vault.tokenPlaceholder")}
          autoComplete="off"
          disabled={disabled}
          className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-accent disabled:opacity-50"
        />
      </label>

      {stored && (
        <p className="text-xs text-success">
          {environmentName
            ? t("vault.storedForEnvironment", { name: environmentName })
            : t("vault.stored")}
        </p>
      )}

      {stored && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled || removing}
          className="self-start rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
        >
          {t("vault.remove")}
        </button>
      )}
    </div>
  );
}
