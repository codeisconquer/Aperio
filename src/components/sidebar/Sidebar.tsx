import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, FolderOpen, Plus, Settings } from "lucide-react";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { EnvironmentSelector } from "../environments/EnvironmentSelector";
import { AppSettingsModal } from "../settings/AppSettingsModal";
import { HistoryList } from "./HistoryList";
import { ProjectsList } from "./ProjectsList";
import type { Environment } from "../../types/environment";
import type { HistoryEntry } from "../../types/history";
import type { SwaggerEndpoint, SwaggerProject } from "../../types/swagger";

interface SidebarProps {
  environments: Environment[];
  activeEnvironmentId: string | null;
  activeProjectId: string | null;
  onActiveEnvironmentChange: (id: string | null) => void;
  onCreateEnvironment: () => void;
  onEditEnvironment: (environment: Environment) => void;
  history: HistoryEntry[];
  selectedHistoryId: string | null;
  onHistorySelect: (entry: HistoryEntry) => void;
  onHistoryDelete: (id: string) => void;
  onHistoryClearAll: () => void;
  onNewRequest: () => void;
  projects: SwaggerProject[];
  selectedEndpointKey: string | null;
  onOpenOpenApiImport: () => void;
  onManageProject: (project: SwaggerProject) => void;
  onCopyProject: (project: SwaggerProject) => void;
  onRemoveProject: (project: SwaggerProject) => void;
  onEndpointSelect: (
    project: SwaggerProject,
    endpoint: SwaggerEndpoint,
  ) => void;
  onWorkspaceImported: () => void;
}

export function Sidebar({
  environments,
  activeEnvironmentId,
  activeProjectId,
  onActiveEnvironmentChange,
  onCreateEnvironment,
  onEditEnvironment,
  history,
  selectedHistoryId,
  onHistorySelect,
  onHistoryDelete,
  onHistoryClearAll,
  onNewRequest,
  projects,
  selectedEndpointKey,
  onOpenOpenApiImport,
  onManageProject,
  onCopyProject,
  onRemoveProject,
  onEndpointSelect,
  onWorkspaceImported,
}: SidebarProps) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <aside
        data-testid="layout-sidebar"
        className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-surface"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src="/aperio-logo.png"
              alt=""
              aria-hidden
              className="size-5 shrink-0 rounded-sm object-contain"
            />
            <span className="truncate text-sm font-semibold tracking-wide text-foreground">
              {t("app.title")}
            </span>
          </div>
          <button
            type="button"
            data-testid="app-settings-open"
            onClick={() => setSettingsOpen(true)}
            title={t("settings.open")}
            aria-label={t("settings.open")}
            className="shrink-0 rounded p-1.5 text-muted transition-colors hover:bg-background/60 hover:text-accent"
          >
            <Settings className="size-4" aria-hidden />
          </button>
        </header>

        <EnvironmentSelector
          environments={environments}
          activeId={activeEnvironmentId}
          projectSelected={activeProjectId !== null}
          onActiveChange={onActiveEnvironmentChange}
          onCreate={onCreateEnvironment}
          onEdit={onEditEnvironment}
        />

        <div className="border-b border-border px-3 py-3">
          <button
            type="button"
            onClick={onNewRequest}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
          >
            <Plus className="size-3.5" aria-hidden />
            {t("sidebar.newRequest")}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <CollapsibleSection
            title={t("sidebar.history")}
            icon={<Clock className="size-3.5 shrink-0" aria-hidden />}
            className="mb-4"
          >
            <HistoryList
              entries={history}
              selectedId={selectedHistoryId}
              onSelect={onHistorySelect}
              onDelete={onHistoryDelete}
              onClearAll={onHistoryClearAll}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title={t("sidebar.projects")}
            icon={<FolderOpen className="size-3.5 shrink-0" aria-hidden />}
          >
            <ProjectsList
              projects={projects}
              selectedEndpointKey={selectedEndpointKey}
              onOpenImport={onOpenOpenApiImport}
              onManageProject={onManageProject}
              onCopyProject={onCopyProject}
              onRemoveProject={onRemoveProject}
              onEndpointSelect={onEndpointSelect}
            />
          </CollapsibleSection>
        </nav>
      </aside>

      {settingsOpen && (
        <AppSettingsModal
          onClose={() => setSettingsOpen(false)}
          onWorkspaceImported={onWorkspaceImported}
        />
      )}
    </>
  );
}
