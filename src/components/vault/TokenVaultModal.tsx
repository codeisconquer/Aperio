import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { SwaggerProject } from "../../types/swagger";
import { TokenVaultSection } from "./TokenVaultSection";

interface TokenVaultModalProps {
  project: SwaggerProject;
  environmentId: string | null;
  environmentName?: string | null;
  onClose: () => void;
  onChanged: () => void;
}

/** Standalone modal wrapper; prefer TokenVaultSection inside ProjectSettingsModal. */
export function TokenVaultModal({
  project,
  environmentId,
  environmentName,
  onClose,
  onChanged,
}: TokenVaultModalProps) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="vault-title" className="text-sm font-semibold text-foreground">
            {t("vault.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-background/60 hover:text-foreground"
            aria-label={t("vault.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="p-4">
          <p className="mb-3 truncate text-sm font-medium text-foreground">
            {project.title}
          </p>
          <TokenVaultSection
            key={environmentId ?? "none"}
            environmentId={environmentId}
            environmentName={environmentName}
            onChanged={onChanged}
          />
        </div>
      </div>
    </div>
  );
}
