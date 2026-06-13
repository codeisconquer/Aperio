import { useTranslation } from "react-i18next";
import { Clock, FolderOpen, Plus } from "lucide-react";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { ThemeToggle } from "../common/ThemeToggle";
import { EnvironmentSelector } from "../environments/EnvironmentSelector";
import { WorkspaceSettings } from "../settings/WorkspaceSettings";
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

  return (
    <aside
      data-testid="layout-sidebar"
      className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-surface"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <img
            src="/aperio-logo.png"
            alt=""
            aria-hidden
            className="size-5 shrink-0 rounded-sm object-contain"
          />
          <span className="text-sm font-semibold tracking-wide text-foreground">
            {t("app.title")}
          </span>
        </div>
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

      <footer className="flex flex-col gap-3 border-t border-border px-4 py-3">
        <WorkspaceSettings onImported={onWorkspaceImported} />
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <LanguageSwitcher />
          </div>
          <ThemeToggle />
        </div>
      </footer>
    </aside>
  );
}
