import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Globe, X } from "lucide-react";
import type { Environment } from "../../types/environment";
import { EnvironmentEditorForm } from "./EnvironmentEditorForm";

interface EnvironmentModalProps {
  environment: Environment | null;
  projectId: string;
  onClose: () => void;
  onSaved: (environment: Environment) => void;
  onDeleted: (id: string) => void;
}

export function EnvironmentModal({
  environment,
  projectId,
  onClose,
  onSaved,
  onDeleted,
}: EnvironmentModalProps) {
  const { t } = useTranslation();
  const isNew = environment === null;

  const title = useMemo(
    () => (isNew ? t("environments.createTitle") : t("environments.editTitle")),
    [isNew, t],
  );

  function handleSaved(saved: Environment) {
    onSaved(saved);
    onClose();
  }

  function handleDeleted(id: string) {
    onDeleted(id);
    onClose();
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

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <EnvironmentEditorForm
            environment={environment}
            projectId={projectId}
            onCancel={onClose}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        </div>
      </div>
    </div>
  );
}
