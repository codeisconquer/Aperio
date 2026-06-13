import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Copy,
  Globe,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { EnvironmentEditorForm } from "../environments/EnvironmentEditorForm";
import type { Environment } from "../../types/environment";
import type { SwaggerProject } from "../../types/swagger";
import { TokenVaultSection } from "../vault/TokenVaultSection";

interface ProjectSettingsModalProps {
  project: SwaggerProject;
  environments: Environment[];
  activeEnvironmentId: string | null;
  onActiveEnvironmentChange: (id: string | null) => void;
  onEnvironmentSaved: (environment: Environment) => void;
  onEnvironmentDeleted: (id: string) => void;
  onCopyEnvironment: (environment: Environment) => void;
  onDeleteEnvironment: (id: string) => void;
  onCopyProject: () => void;
  onRemoveProject: () => void;
  onClose: () => void;
}

export function ProjectSettingsModal({
  project,
  environments,
  activeEnvironmentId,
  onActiveEnvironmentChange,
  onEnvironmentSaved,
  onEnvironmentDeleted,
  onCopyEnvironment,
  onDeleteEnvironment,
  onCopyProject,
  onRemoveProject,
  onClose,
}: ProjectSettingsModalProps) {
  const { t } = useTranslation();
  const [editorTarget, setEditorTarget] = useState<
    Environment | null | undefined
  >(undefined);

  function handleDeleteEnvironment(id: string, name: string) {
    if (!window.confirm(t("projectSettings.confirmDeleteEnvironment", { name }))) {
      return;
    }
    onDeleteEnvironment(id);
  }

  function handleRemoveProject() {
    if (!window.confirm(t("sidebar.confirmRemoveProject", { name: project.title }))) {
      return;
    }
    onRemoveProject();
    onClose();
  }

  function handleEnvironmentSaved(environment: Environment) {
    onEnvironmentSaved(environment);
    setEditorTarget(undefined);
  }

  function handleEnvironmentDeleted(id: string) {
    onEnvironmentDeleted(id);
    setEditorTarget(undefined);
  }

  const editingEnvironment = editorTarget !== undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-settings-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Settings className="size-4 shrink-0 text-accent" aria-hidden />
              <h2
                id="project-settings-title"
                className="truncate text-sm font-semibold text-foreground"
              >
                {editingEnvironment
                  ? editorTarget === null
                    ? t("environments.createTitle")
                    : t("environments.editTitle")
                  : t("projectSettings.title")}
              </h2>
            </div>
            <p className="mt-0.5 truncate pl-6 text-xs text-muted">
              {project.title}
              <span className="font-mono text-subtle"> · v{project.version}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-muted hover:bg-background/60 hover:text-foreground"
            aria-label={t("projectSettings.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {editingEnvironment ? (
            <EnvironmentEditorForm
              environment={editorTarget}
              projectId={project.id}
              onCancel={() => setEditorTarget(undefined)}
              onSaved={handleEnvironmentSaved}
              onDeleted={handleEnvironmentDeleted}
            />
          ) : (
            <>
              <section className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <Globe className="size-3.5 text-accent" aria-hidden />
                  {t("projectSettings.environmentsHeading")}
                </div>
                <p className="text-xs leading-relaxed text-muted">
                  {t("projectSettings.environmentsHint")}
                </p>

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t("projectSettings.activeEnvironment")}
                  </span>
                  <select
                    value={activeEnvironmentId ?? ""}
                    onChange={(e) =>
                      onActiveEnvironmentChange(e.target.value ? e.target.value : null)
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  >
                    <option value="">{t("environments.none")}</option>
                    {environments.map((env) => (
                      <option key={env.id} value={env.id}>
                        {env.name}
                      </option>
                    ))}
                  </select>
                </label>

                {environments.length === 0 ? (
                  <p className="rounded-md bg-panel px-3 py-2 text-xs text-muted">
                    {t("projectSettings.noEnvironments")}
                  </p>
                ) : (
                  <ul className="overflow-hidden rounded-md border border-border">
                    {environments.map((env) => (
                      <li
                        key={env.id}
                        className="flex items-center gap-1 border-b border-border/60 px-2 py-1.5 last:border-b-0"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {env.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditorTarget(env)}
                          className="shrink-0 rounded px-2 py-1 text-[10px] text-muted hover:bg-background/60 hover:text-accent"
                        >
                          {t("projectSettings.editEnvironment")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onCopyEnvironment(env)}
                          title={t("projectSettings.copyEnvironment")}
                          aria-label={t("projectSettings.copyEnvironment")}
                          className="shrink-0 rounded p-1.5 text-subtle hover:bg-background/60 hover:text-foreground"
                        >
                          <Copy className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEnvironment(env.id, env.name)}
                          title={t("projectSettings.deleteEnvironment")}
                          aria-label={t("projectSettings.deleteEnvironment")}
                          className="shrink-0 rounded p-1.5 text-subtle hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={() => setEditorTarget(null)}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent"
                >
                  <Plus className="size-3.5" aria-hidden />
                  {t("projectSettings.createEnvironment")}
                </button>
              </section>

              <section className="flex flex-col gap-2 border-t border-border pt-4">
                <TokenVaultSection projectId={project.id} />
              </section>

              <section className="flex flex-col gap-2 border-t border-border pt-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {t("projectSettings.projectActions")}
                </span>
                <button
                  type="button"
                  onClick={onCopyProject}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-background/60"
                >
                  <Copy className="size-3.5 text-muted" aria-hidden />
                  {t("projectSettings.copyProject")}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveProject}
                  className="inline-flex items-center gap-2 rounded-md border border-red-500/30 px-3 py-2 text-left text-xs text-red-300 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  {t("sidebar.removeProject")}
                </button>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}