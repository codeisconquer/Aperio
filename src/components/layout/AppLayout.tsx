import { useCallback, useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Sidebar } from "../sidebar/Sidebar";
import { RequestBuilder } from "../builder/RequestBuilder";
import { ResponseViewer } from "../response/ResponseViewer";
import { EnvironmentModal } from "../environments/EnvironmentModal";
import { TokenVaultModal } from "../vault/TokenVaultModal";
import {
  getEnvironments,
  loadActiveEnvironmentId,
  persistActiveEnvironmentId,
} from "../../lib/environments";
import { getHistory } from "../../lib/history";
import { sendRequest } from "../../lib/sendRequest";
import {
  applyEnvironmentToDraft,
  parseEnvironmentVariables,
} from "../../lib/substituteVariables";
import { OpenApiImportModal } from "../sidebar/OpenApiImportModal";
import { listSecureTokenProjects } from "../../lib/vault";
import type { HttpResponse } from "../../types/http";
import type { Environment } from "../../types/environment";
import {
  emptyRequestDraft,
  type HistoryEntry,
  type RequestDraft,
} from "../../types/history";
import {
  buildEndpointUrl,
  endpointKey,
  type SwaggerEndpoint,
  type SwaggerProject,
} from "../../types/swagger";

export function AppLayout() {
  const [draft, setDraft] = useState<RequestDraft>(emptyRequestDraft);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [projects, setProjects] = useState<SwaggerProject[]>([]);
  const [projectsWithTokens, setProjectsWithTokens] = useState<Set<string>>(
    new Set(),
  );
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(
    () => loadActiveEnvironmentId(),
  );
  const [environmentModalTarget, setEnvironmentModalTarget] = useState<
    Environment | null | undefined
  >(undefined);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [vaultProject, setVaultProject] = useState<SwaggerProject | null>(null);
  const [selectedEndpointKey, setSelectedEndpointKey] = useState<string | null>(
    null,
  );
  const [openApiImportOpen, setOpenApiImportOpen] = useState(false);
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeEnvironment = useMemo(
    () => environments.find((env) => env.id === activeEnvironmentId) ?? null,
    [environments, activeEnvironmentId],
  );

  const activeVariables = useMemo(
    () =>
      activeEnvironment
        ? parseEnvironmentVariables(activeEnvironment.variables)
        : {},
    [activeEnvironment],
  );

  const refreshTokenProjects = useCallback(async () => {
    try {
      const ids = await listSecureTokenProjects();
      setProjectsWithTokens(new Set(ids));
    } catch (err) {
      console.error("Failed to load token projects:", err);
    }
  }, []);

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
      setActiveEnvironmentId((current) => {
        if (current && !list.some((env) => env.id === current)) {
          persistActiveEnvironmentId(null);
          return null;
        }
        return current;
      });
    } catch (err) {
      console.error("Failed to load environments:", err);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
    void refreshTokenProjects();
    void refreshEnvironments();
  }, [refreshHistory, refreshTokenProjects, refreshEnvironments]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void listen<SwaggerProject>("cli-import", (event) => {
      if (cancelled) return;
      setProjects((prev) => [event.payload, ...prev]);
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const handleActiveEnvironmentChange = useCallback((id: string | null) => {
    setActiveEnvironmentId(id);
    persistActiveEnvironmentId(id);
  }, []);

  const handleWorkspaceImported = useCallback(() => {
    void refreshHistory();
    void refreshTokenProjects();
    void refreshEnvironments();
  }, [refreshHistory, refreshTokenProjects, refreshEnvironments]);

  const handleEnvironmentSaved = useCallback((environment: Environment) => {
    setEnvironments((prev) => {
      const index = prev.findIndex((item) => item.id === environment.id);
      if (index === -1) return [...prev, environment].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const next = [...prev];
      next[index] = environment;
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setActiveEnvironmentId(environment.id);
    persistActiveEnvironmentId(environment.id);
  }, []);

  const handleEnvironmentDeleted = useCallback((id: string) => {
    setEnvironments((prev) => prev.filter((env) => env.id !== id));
    setActiveEnvironmentId((current) => {
      if (current !== id) return current;
      persistActiveEnvironmentId(null);
      return null;
    });
  }, []);

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
      setDraft({
        method: endpoint.method,
        url: buildEndpointUrl(project.base_url, endpoint.path),
        headers: "",
        body: "",
      });
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

  const handleOpenApiImported = useCallback((project: SwaggerProject) => {
    setProjects((prev) => [project, ...prev]);
    setOpenApiImportOpen(false);
    setError(null);
  }, []);

  const handleCurlImported = useCallback(() => {
    setSelectedHistoryId(null);
    setSelectedEndpointKey(null);
    setActiveProjectId(null);
    setResponse(null);
    setError(null);
  }, []);

  const handleSend = useCallback(
    async (payload: RequestDraft) => {
      setLoading(true);
      setError(null);
      setSelectedHistoryId(null);
      try {
        const resolved = applyEnvironmentToDraft(payload, activeVariables);
        const result = await sendRequest({
          ...resolved,
          project_id: activeProjectId,
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
    [activeProjectId, activeVariables, refreshHistory],
  );

  return (
    <>
      <div className="flex h-full w-full overflow-hidden">
        <Sidebar
          environments={environments}
          activeEnvironmentId={activeEnvironmentId}
          onActiveEnvironmentChange={handleActiveEnvironmentChange}
          onCreateEnvironment={() => setEnvironmentModalTarget(null)}
          onEditEnvironment={(environment) =>
            setEnvironmentModalTarget(environment)
          }
          history={history}
          selectedHistoryId={selectedHistoryId}
          onHistorySelect={handleHistorySelect}
          projects={projects}
          projectsWithTokens={projectsWithTokens}
          selectedEndpointKey={selectedEndpointKey}
          onOpenOpenApiImport={() => setOpenApiImportOpen(true)}
          onOpenVault={setVaultProject}
          onEndpointSelect={handleEndpointSelect}
          onWorkspaceImported={handleWorkspaceImported}
        />
        <RequestBuilder
          draft={draft}
          onDraftChange={setDraft}
          onSend={handleSend}
          onCurlImported={handleCurlImported}
          loading={loading}
        />
        <ResponseViewer response={response} error={error} loading={loading} />
      </div>

      {environmentModalTarget !== undefined && (
        <EnvironmentModal
          environment={environmentModalTarget}
          onClose={() => setEnvironmentModalTarget(undefined)}
          onSaved={handleEnvironmentSaved}
          onDeleted={handleEnvironmentDeleted}
        />
      )}

      {openApiImportOpen && (
        <OpenApiImportModal
          onClose={() => setOpenApiImportOpen(false)}
          onImported={handleOpenApiImported}
        />
      )}

      {vaultProject && (
        <TokenVaultModal
          project={vaultProject}
          onClose={() => setVaultProject(null)}
          onChanged={() => void refreshTokenProjects()}
        />
      )}
    </>
  );
}
