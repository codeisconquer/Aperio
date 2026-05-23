import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, FileUp, Lock, LockOpen } from "lucide-react";
import {
  buildEndpointUrl,
  endpointKey,
  type SwaggerEndpoint,
  type SwaggerProject,
} from "../../types/swagger";

function methodBadgeColor(method: string): string {
  switch (method) {
    case "GET":
      return "text-success";
    case "POST":
      return "text-warning";
    default:
      return "text-foreground/70";
  }
}

interface ProjectsListProps {
  projects: SwaggerProject[];
  projectsWithTokens: Set<string>;
  selectedEndpointKey: string | null;
  onOpenImport: () => void;
  onOpenVault: (project: SwaggerProject) => void;
  onEndpointSelect: (project: SwaggerProject, endpoint: SwaggerEndpoint) => void;
}

export function ProjectsList({
  projects,
  projectsWithTokens,
  selectedEndpointKey,
  onOpenImport,
  onOpenVault,
  onEndpointSelect,
}: ProjectsListProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggleProject(projectId: string) {
    setExpanded((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onOpenImport}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
      >
        <FileUp className="size-3.5" aria-hidden />
        {t("sidebar.importWorkspace")}
      </button>

      {projects.length === 0 ? (
        <p className="rounded-md bg-background/50 px-3 py-2 text-xs text-foreground/40">
          {t("sidebar.projectsEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {projects.map((project) => {
            const isOpen = expanded[project.id] ?? true;
            const hasToken = projectsWithTokens.has(project.id);
            return (
              <li key={project.id} className="rounded-md bg-background/40">
                <div className="flex items-center gap-0.5 pr-1">
                  <button
                    type="button"
                    onClick={() => toggleProject(project.id)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-2 text-left text-xs font-medium text-foreground hover:bg-background/60"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-3.5 shrink-0 text-foreground/50" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0 text-foreground/50" />
                    )}
                    <span
                      className="min-w-0 flex-1 truncate"
                      title={project.title}
                    >
                      {project.title}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-foreground/40">
                      v{project.version}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenVault(project)}
                    title={t("vault.open")}
                    className={`shrink-0 rounded p-1.5 transition-colors hover:bg-background/60 ${
                      hasToken ? "text-warning" : "text-foreground/40"
                    }`}
                  >
                    {hasToken ? (
                      <Lock className="size-3.5" aria-hidden />
                    ) : (
                      <LockOpen className="size-3.5" aria-hidden />
                    )}
                  </button>
                </div>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <ul className="flex flex-col gap-0.5 px-1 pb-2">
                    {project.endpoints.map((endpoint) => {
                      const key = endpointKey(
                        project.id,
                        endpoint.method,
                        endpoint.path,
                      );
                      const isSelected = key === selectedEndpointKey;
                      const label =
                        endpoint.summary?.trim() ||
                        endpoint.path ||
                        endpoint.method;

                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => onEndpointSelect(project, endpoint)}
                            title={buildEndpointUrl(
                              project.base_url,
                              endpoint.path,
                            )}
                            className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                              isSelected
                                ? "bg-accent/15 ring-1 ring-accent/40"
                                : "hover:bg-background/60"
                            }`}
                          >
                            <span
                              className={`shrink-0 font-mono text-[10px] font-semibold ${methodBadgeColor(endpoint.method)}`}
                            >
                              {endpoint.method}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs text-foreground/80">
                              {label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
