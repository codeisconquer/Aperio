import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { Sidebar } from "../sidebar/Sidebar";
import { RequestBuilder } from "../builder/RequestBuilder";
import { ResponseViewer } from "../response/ResponseViewer";
import { EnvironmentModal } from "../environments/EnvironmentModal";
import {
  deleteEnvironment,
  environmentsForProject,
  getEnvironments,
  saveEnvironment,
} from "../../lib/environments";
import { clearHistory, deleteHistoryEntry, getHistory } from "../../lib/history";
import { deleteProject, getProjects, saveProject } from "../../lib/projects";
import {
  loadActiveEnvironmentId,
  loadAppSettings,
  persistActiveEnvironmentId,
  removeActiveEnvironmentForProject,
} from "../../lib/settings";
import { sendRequest } from "../../lib/sendRequest";
import {
  applyEnvironmentToDraft,
  parseEnvironmentVariables,
} from "../../lib/substituteVariables";
import { ProjectSettingsModal } from "../sidebar/ProjectSettingsModal";
import { WorkspaceImportWizard } from "../sidebar/WorkspaceImportWizard";
import { copySecureToken, saveSecureToken } from "../../lib/vault";
import {
  cloneSwaggerProject,
  environmentCopyPayload,
} from "../../lib/projectClone";
import {
  defaultEnvironmentPayload,
  importEnvironmentPayload,
  type WorkspaceImportResult,
} from "../../lib/projectImport";
import type { HttpResponse } from "../../types/http";
import type { Environment } from "../../types/environment";
import {
  emptyRequestDraft,
  type HistoryEntry,
  type RequestDraft,
} from "../../types/history";
import {
  endpointKey,
  endpointToRequestDraft,
  type SwaggerEndpoint,
  type SwaggerProject,
} from "../../types/swagger";

export function AppLayout() {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<RequestDraft>(emptyRequestDraft);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [projects, setProjects] = useState<SwaggerProject[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(
    null,
  );
  const [environmentModalTarget, setEnvironmentModalTarget] = useState<
    Environment | null | undefined
  >(undefined);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [settingsProject, setSettingsProject] = useState<SwaggerProject | null>(
    null,
  );
  const [selectedEndpointKey, setSelectedEndpointKey] = useState<string | null>(
    null,
  );
  const [openApiImportOpen, setOpenApiImportOpen] = useState(false);
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const projectEnvironments = useMemo(
    () => environmentsForProject(environments, activeProjectId),
    [environments, activeProjectId],
  );

  const activeEnvironment = useMemo(
    () => projectEnvironments.find((env) => env.id === activeEnvironmentId) ?? null,
    [projectEnvironments, activeEnvironmentId],
  );

  const activeVariables = useMemo(
    () =>
      activeEnvironment
        ? parseEnvironmentVariables(activeEnvironment.variables)
        : {},
    [activeEnvironment],
  );

  const settingsProjectEnvironments = useMemo(
    () =>
      settingsProject
        ? environmentsForProject(environments, settingsProject.id)
        : [],
    [environments, settingsProject],
  );

  const settingsActiveEnvironmentId = useMemo(() => {
    if (!settingsProject) return null;
    if (activeProjectId === settingsProject.id) return activeEnvironmentId;
    const saved = loadActiveEnvironmentId(settingsProject.id);
    return settingsProjectEnvironments.some((env) => env.id === saved)
      ? saved
      : null;
  }, [
    settingsProject,
    activeProjectId,
    activeEnvironmentId,
    settingsProjectEnvironments,
  ]);

  const refreshHistory = useCallback(async () => {
    try {
      const entries = await getHistory();
      setHistory(entries);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, []);

  const refreshEnvironments = useCallback(async () => {
    try {
      const list = await getEnvironments();
      setEnvironments(list);
    } catch (err) {
      console.error("Failed to load environments:", err);
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      const list = await getProjects();
      setProjects(list);
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadAppSettings();
      await Promise.all([refreshHistory(), refreshEnvironments(), refreshProjects()]);
    })();
  }, [refreshHistory, refreshEnvironments, refreshProjects]);

  const bootstrapProjectImport = useCallback(
    async (result: WorkspaceImportResult) => {
      const { project, environment } = result;

      try {
        await saveProject(project);
      } catch (err) {
        console.error("Failed to persist imported project:", err);
      }

      setProjects((prev) => [project, ...prev.filter((item) => item.id !== project.id)]);

      const payload =
        environment === undefined
          ? defaultEnvironmentPayload(
              project.id,
              project.base_url,
              t("projectSettings.defaultEnvironmentName"),
            )
          : environment === null
            ? null
            : importEnvironmentPayload(project.id, environment);
      if (!payload) {
        setActiveProjectId(project.id);
        return;
      }

      try {
        const saved = await saveEnvironment(payload);
        if (environment?.token?.trim()) {
          await saveSecureToken(saved.id, environment.token.trim());
        }
        setEnvironments((prev) =>
          [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)),
        );
        persistActiveEnvironmentId(project.id, saved.id);
        setActiveProjectId(project.id);
        setActiveEnvironmentId(saved.id);
      } catch (err) {
        console.error("Failed to create default environment:", err);
      }
    },
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void listen<SwaggerProject>("cli-import", (event) => {
      if (cancelled) return;
      void bootstrapProjectImport({ project: event.payload });
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [bootstrapProjectImport]);

  useEffect(() => {
    if (!activeProjectId) {
      setActiveEnvironmentId(null);
      return;
    }

    const projectEnvs = environmentsForProject(environments, activeProjectId);
    const savedId = loadActiveEnvironmentId(activeProjectId);
    if (savedId && projectEnvs.some((env) => env.id === savedId)) {
      setActiveEnvironmentId(savedId);
      return;
    }

    setActiveEnvironmentId(projectEnvs.length === 1 ? projectEnvs[0].id : null);
  }, [activeProjectId, environments]);

  const handleActiveEnvironmentChange = useCallback(
    (id: string | null) => {
      setActiveEnvironmentId(id);
      persistActiveEnvironmentId(activeProjectId, id);
    },
    [activeProjectId],
  );

  const handleWorkspaceImported = useCallback(() => {
    void refreshHistory();
    void refreshEnvironments();
    void refreshProjects();
    void loadAppSettings();
  }, [refreshHistory, refreshEnvironments, refreshProjects]);

  const handleEnvironmentSaved = useCallback(
    (environment: Environment) => {
      setEnvironments((prev) => {
        const index = prev.findIndex((item) => item.id === environment.id);
        if (index === -1) {
          return [...prev, environment].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        }
        const next = [...prev];
        next[index] = environment;
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      if (environment.project_id === activeProjectId) {
        setActiveEnvironmentId(environment.id);
        persistActiveEnvironmentId(activeProjectId, environment.id);
      }
    },
    [activeProjectId],
  );

  const handleEnvironmentDeleted = useCallback(
    (id: string) => {
      setEnvironments((prev) => prev.filter((env) => env.id !== id));
      setActiveEnvironmentId((current) => {
        if (current !== id) return current;
        persistActiveEnvironmentId(activeProjectId, null);
        return null;
      });
    },
    [activeProjectId],
  );

  const handleEnvironmentDelete = useCallback(
    async (id: string) => {
      try {
        await deleteEnvironment(id);
        handleEnvironmentDeleted(id);
      } catch (err) {
        console.error("Failed to delete environment:", err);
      }
    },
    [handleEnvironmentDeleted],
  );

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    setDraft({
      method: entry.method,
      url: entry.url,
      headers: entry.headers,
      body: entry.body,
    });
    setSelectedHistoryId(entry.id);
    setSelectedEndpointKey(null);
    setActiveProjectId(null);
    setResponse(null);
    setError(null);
  }, []);

  const handleEndpointSelect = useCallback(
    (project: SwaggerProject, endpoint: SwaggerEndpoint) => {
      setDraft(endpointToRequestDraft(project, endpoint));
      setSelectedEndpointKey(
        endpointKey(project.id, endpoint.method, endpoint.path),
      );
      setActiveProjectId(project.id);
      setSelectedHistoryId(null);
      setResponse(null);
      setError(null);
    },
    [],
  );

  const handleOpenApiImported = useCallback(
    (result: WorkspaceImportResult) => {
      setOpenApiImportOpen(false);
      setError(null);
      void bootstrapProjectImport(result);
    },
    [bootstrapProjectImport],
  );

  const handleCurlImported = useCallback(() => {
    setSelectedHistoryId(null);
    setSelectedEndpointKey(null);
    setActiveProjectId(null);
    setResponse(null);
    setError(null);
  }, []);

  const handleNewRequest = useCallback(() => {
    setDraft(emptyRequestDraft());
    setSelectedHistoryId(null);
    setSelectedEndpointKey(null);
    setActiveProjectId(null);
    setResponse(null);
    setError(null);
  }, []);

  const handleHistoryDelete = useCallback(
    async (id: string) => {
      try {
        await deleteHistoryEntry(id);
        setHistory((prev) => prev.filter((entry) => entry.id !== id));
        setSelectedHistoryId((current) => (current === id ? null : current));
      } catch (err) {
        console.error("Failed to delete history entry:", err);
      }
    },
    [],
  );

  const handleHistoryClearAll = useCallback(async () => {
    if (!window.confirm(t("sidebar.confirmClearHistory"))) return;

    try {
      await clearHistory();
      setHistory([]);
      setSelectedHistoryId(null);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  }, [t]);

  const executeProjectRemove = useCallback(
    async (project: SwaggerProject) => {
      try {
        await deleteProject(project.id);
      } catch (err) {
        console.error("Failed to delete project:", err);
        return;
      }

      setEnvironments((prev) =>
        prev.filter((env) => env.project_id !== project.id),
      );
      setProjects((prev) => prev.filter((item) => item.id !== project.id));
      setSettingsProject((current) =>
        current?.id === project.id ? null : current,
      );

      if (activeProjectId === project.id) {
        setActiveProjectId(null);
        setActiveEnvironmentId(null);
      }
      removeActiveEnvironmentForProject(project.id);

      if (selectedEndpointKey?.startsWith(`${project.id}:`)) {
        setSelectedEndpointKey(null);
        setDraft(emptyRequestDraft());
        setResponse(null);
        setError(null);
      }
    },
    [activeProjectId, selectedEndpointKey],
  );

  const handleProjectRemove = useCallback(
    async (project: SwaggerProject) => {
      if (!window.confirm(t("sidebar.confirmRemoveProject", { name: project.title }))) {
        return;
      }
      await executeProjectRemove(project);
    },
    [executeProjectRemove, t],
  );

  const handleProjectCopy = useCallback(
    async (project: SwaggerProject) => {
      const cloned = cloneSwaggerProject(project, t("projectSettings.copySuffix"));

      try {
        await saveProject(cloned);
      } catch (err) {
        console.error("Failed to persist copied project:", err);
      }

      setProjects((prev) => [cloned, ...prev]);

      const sourceEnvs = environments.filter(
        (env) => env.project_id === project.id,
      );

      try {
        for (const env of sourceEnvs) {
          const saved = await saveEnvironment(
            environmentCopyPayload(env, cloned.id, t("projectSettings.copySuffix")),
          );
          await copySecureToken(env.id, saved.id);
          setEnvironments((prev) => [...prev, saved]);
        }
      } catch (err) {
        console.error("Failed to copy project environments:", err);
      }
    },
    [environments, t],
  );

  const handleManageProject = useCallback(
    (project: SwaggerProject) => {
      setSettingsProject(project);
      setActiveProjectId(project.id);
      const projectEnvs = environmentsForProject(environments, project.id);
      const savedId = loadActiveEnvironmentId(project.id);
      if (savedId && projectEnvs.some((env) => env.id === savedId)) {
        setActiveEnvironmentId(savedId);
      } else {
        setActiveEnvironmentId(projectEnvs.length === 1 ? projectEnvs[0].id : null);
      }
    },
    [environments],
  );

  const handleSettingsActiveEnvironmentChange = useCallback(
    (id: string | null) => {
      if (!settingsProject) return;
      persistActiveEnvironmentId(settingsProject.id, id);
      if (activeProjectId === settingsProject.id) {
        setActiveEnvironmentId(id);
      }
    },
    [activeProjectId, settingsProject],
  );

  const handleCopyEnvironment = useCallback(
    async (environment: Environment) => {
      if (!settingsProject) return;
      try {
        const saved = await saveEnvironment(
          environmentCopyPayload(
            environment,
            settingsProject.id,
            t("projectSettings.copySuffix"),
          ),
        );
        await copySecureToken(environment.id, saved.id);
        handleEnvironmentSaved(saved);
      } catch (err) {
        console.error("Failed to copy environment:", err);
      }
    },
    [handleEnvironmentSaved, settingsProject, t],
  );

  const environmentModalProjectId = settingsProject?.id ?? activeProjectId;

  const activePathParams = useMemo(() => {
    if (!selectedEndpointKey) return [];
    for (const project of projects) {
      for (const endpoint of project.endpoints) {
        if (
          endpointKey(project.id, endpoint.method, endpoint.path) ===
          selectedEndpointKey
        ) {
          return endpoint.path_params;
        }
      }
    }
    return [];
  }, [projects, selectedEndpointKey]);

  const handleSend = useCallback(
    async (payload: RequestDraft) => {
      setLoading(true);
      setError(null);
      setSelectedHistoryId(null);
      try {
        const resolved = applyEnvironmentToDraft(payload, activeVariables);
        const result = await sendRequest({
          ...resolved,
          environment_id: activeEnvironmentId,
        });
        setResponse(result);
        await refreshHistory();
      } catch (err) {
        setResponse(null);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [activeEnvironmentId, activeVariables, refreshHistory],
  );

  return (
    <>
      <div className="flex h-full w-full overflow-hidden">
        <Sidebar
          environments={projectEnvironments}
          activeEnvironmentId={activeEnvironmentId}
          activeProjectId={activeProjectId}
          onActiveEnvironmentChange={handleActiveEnvironmentChange}
          onCreateEnvironment={() => setEnvironmentModalTarget(null)}
          onEditEnvironment={(environment) =>
            setEnvironmentModalTarget(environment)
          }
          history={history}
          selectedHistoryId={selectedHistoryId}
          onHistorySelect={handleHistorySelect}
          onHistoryDelete={handleHistoryDelete}
          onHistoryClearAll={handleHistoryClearAll}
          onNewRequest={handleNewRequest}
          projects={projects}
          selectedEndpointKey={selectedEndpointKey}
          onOpenOpenApiImport={() => setOpenApiImportOpen(true)}
          onManageProject={handleManageProject}
          onCopyProject={handleProjectCopy}
          onRemoveProject={handleProjectRemove}
          onEndpointSelect={handleEndpointSelect}
          onWorkspaceImported={handleWorkspaceImported}
        />
        <RequestBuilder
          draft={draft}
          pathParams={activePathParams}
          environmentVariables={activeVariables}
          environments={projectEnvironments}
          activeEnvironmentId={activeEnvironmentId}
          onActiveEnvironmentChange={handleActiveEnvironmentChange}
          onDraftChange={setDraft}
          onSend={handleSend}
          onCurlImported={handleCurlImported}
          loading={loading}
        />
        <ResponseViewer response={response} error={error} loading={loading} />
      </div>

      {environmentModalTarget !== undefined &&
        environmentModalProjectId &&
        !settingsProject && (
        <EnvironmentModal
          environment={environmentModalTarget}
          projectId={environmentModalProjectId}
          onClose={() => setEnvironmentModalTarget(undefined)}
          onSaved={handleEnvironmentSaved}
          onDeleted={handleEnvironmentDeleted}
        />
      )}

      {settingsProject && (
        <ProjectSettingsModal
          project={settingsProject}
          environments={settingsProjectEnvironments}
          activeEnvironmentId={settingsActiveEnvironmentId}
          onActiveEnvironmentChange={handleSettingsActiveEnvironmentChange}
          onEnvironmentSaved={handleEnvironmentSaved}
          onEnvironmentDeleted={handleEnvironmentDeleted}
          onCopyEnvironment={(environment) => void handleCopyEnvironment(environment)}
          onDeleteEnvironment={(id) => void handleEnvironmentDelete(id)}
          onCopyProject={() => void handleProjectCopy(settingsProject)}
          onRemoveProject={() => void executeProjectRemove(settingsProject)}
          onClose={() => setSettingsProject(null)}
        />
      )}

      {openApiImportOpen && (
        <WorkspaceImportWizard
          onClose={() => setOpenApiImportOpen(false)}
          onImported={handleOpenApiImported}
        />
      )}
    </>
  );
}
