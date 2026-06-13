import { useTranslation } from "react-i18next";
import { Settings, X } from "lucide-react";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { ThemeToggle } from "../common/ThemeToggle";
import { WorkspaceSettings } from "./WorkspaceSettings";

interface AppSettingsModalProps {
  onClose: () => void;
  onWorkspaceImported: () => void;
}

export function AppSettingsModal({
  onClose,
  onWorkspaceImported,
}: AppSettingsModalProps) {
  const { t } = useTranslation();

  function handleWorkspaceImported() {
    onWorkspaceImported();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-settings-title"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-lg border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings className="size-4 text-accent" aria-hidden />
            <h2
              id="app-settings-title"
              className="text-sm font-semibold text-foreground"
            >
              {t("settings.modalTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-background/60 hover:text-foreground"
            aria-label={t("settings.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-col gap-5 p-4">
          <WorkspaceSettings
            embedded
            onImported={handleWorkspaceImported}
          />

          <section className="flex flex-col gap-3 border-t border-border pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {t("settings.appearanceHeading")}
            </h3>
            <LanguageSwitcher />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted">{t("theme.label")}</span>
              <ThemeToggle />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
