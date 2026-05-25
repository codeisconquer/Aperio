import { useTranslation } from "react-i18next";
import { Clock, FolderOpen, Layers } from "lucide-react";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
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
      className="flex h-full w-64 shrink-0 flex-col border-r border-white/10 bg-surface"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers className="size-5 text-accent" aria-hidden />
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

      <footer className="flex flex-col gap-3 border-t border-white/10 px-4 py-3">
        <WorkspaceSettings onImported={onWorkspaceImported} />
        <LanguageSwitcher />
      </footer>
    </aside>
  );
}
